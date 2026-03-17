import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import crypto from "crypto";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import {
  buildPublicInvoiceLink,
  type InvoiceReminderKind,
  isEmailConfigurationError,
  sendInvoiceReminderEmail,
} from "@/lib/email";
import { getInvoiceSenderName } from "@/lib/business";
import {
  assertAuthorizedCronRequest,
  isCronAuthorizationError,
} from "@/lib/cronAuth";
import { logInvoiceEvent } from "@/lib/invoiceActivity";

export const runtime = "nodejs";

type ReminderBatchSummary = {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
};

type ReminderCandidate = {
  id: string;
  invoiceNumber: string;
  publicToken: string | null;
  totalAmount: number;
  currency: string;
  dueDate: Date;
  businessName: string;
  businessOwnerName: string | null;
  businessInvoiceSenderType: string | null;
  clientCompanyName: string | null;
  clientContactName: string | null;
  clientEmail: string;
};

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function findReminderCandidates(
  reminderType: InvoiceReminderKind,
  from: Date,
  to: Date
): Promise<ReminderCandidate[]> {
  return prisma.$queryRaw<ReminderCandidate[]>`
    SELECT
      i."uuid" AS "id",
      i."invoiceNumber",
      i."publicToken",
      i."totalAmount",
      i."currency",
      i."dueDate",
      b."name" AS "businessName",
      b."ownerName" AS "businessOwnerName",
      b."invoiceSenderType" AS "businessInvoiceSenderType",
      c."companyName" AS "clientCompanyName",
      c."contactName" AS "clientContactName",
      c."email" AS "clientEmail"
    FROM "Invoice" i
    INNER JOIN "Business" b ON b."uuid" = i."businessId"
    INNER JOIN "Client" c ON c."uuid" = i."clientId"
    WHERE i."status" != ${InvoiceStatus.paid}
      AND i."dueDate" >= ${from}
      AND i."dueDate" < ${to}
      AND NOT EXISTS (
        SELECT 1
        FROM "InvoiceReminder" r
        WHERE r."invoiceId" = i."uuid"
          AND r."type" = ${reminderType}::"InvoiceReminderType"
      )
  `;
}

async function claimReminder(
  invoiceId: string,
  reminderType: InvoiceReminderKind,
  from: Date,
  to: Date
): Promise<boolean> {
  const insertedRows = await prisma.$executeRaw`
    INSERT INTO "InvoiceReminder" ("uuid", "invoiceId", "type", "sentAt")
    SELECT
      ${crypto.randomUUID()},
      i."uuid",
      ${reminderType}::"InvoiceReminderType",
      CURRENT_TIMESTAMP
    FROM "Invoice" i
    WHERE i."uuid" = ${invoiceId}
      AND i."status" != ${InvoiceStatus.paid}
      AND i."dueDate" >= ${from}
      AND i."dueDate" < ${to}
    ON CONFLICT ("invoiceId", "type") DO NOTHING
  `;

  return insertedRows > 0;
}

async function releaseReminderClaim(invoiceId: string, reminderType: InvoiceReminderKind) {
  try {
    await prisma.$executeRaw`
      DELETE FROM "InvoiceReminder"
      WHERE "invoiceId" = ${invoiceId}
        AND "type" = ${reminderType}::"InvoiceReminderType"
    `;
  } catch (error) {
    console.error("[invoice-reminders] Failed to release reminder claim", {
      invoiceId,
      reminderType,
      error,
    });
  }
}

async function processReminderBatch(
  request: Request,
  reminderType: InvoiceReminderKind,
  from: Date,
  to: Date
): Promise<ReminderBatchSummary> {
  const candidates = await findReminderCandidates(reminderType, from, to);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const invoiceNumber = candidate.invoiceNumber.trim();
    const clientEmail = candidate.clientEmail.trim();
    const dueDate =
      candidate.dueDate instanceof Date ? candidate.dueDate : new Date(candidate.dueDate);

    if (!invoiceNumber || !clientEmail || Number.isNaN(dueDate.getTime())) {
      skipped += 1;
      continue;
    }

    const claimed = await claimReminder(candidate.id, reminderType, from, to);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    try {
      let publicToken = candidate.publicToken?.trim() || "";
      if (!publicToken) {
        const updatedInvoice = await prisma.invoice.update({
          where: { id: candidate.id },
          data: { publicToken: crypto.randomUUID() },
          select: { publicToken: true },
        });

        publicToken = updatedInvoice.publicToken?.trim() || "";
      }

      if (!publicToken) {
        skipped += 1;
        await releaseReminderClaim(candidate.id, reminderType);
        continue;
      }

      const invoiceLink = buildPublicInvoiceLink(publicToken, request.url);
      const recipientName =
        candidate.clientContactName?.trim() ||
        candidate.clientCompanyName?.trim() ||
        clientEmail;
      await sendInvoiceReminderEmail({
        to: clientEmail,
        businessName: getInvoiceSenderName({
          name: candidate.businessName,
          ownerName: candidate.businessOwnerName,
          invoiceSenderType: candidate.businessInvoiceSenderType,
        }),
        recipientName,
        invoiceNumber,
        totalAmount: candidate.totalAmount,
        currency: candidate.currency,
        invoiceLink,
        dueDate,
        reminderKind: reminderType,
      });
      await logInvoiceEvent({
        invoiceId: candidate.id,
        type: "reminder_sent",
        actor: "System",
        details: `Scheduled reminder sent (${reminderType})`,
      });
      sent += 1;
    } catch (error) {
      await releaseReminderClaim(candidate.id, reminderType);

      if (isEmailConfigurationError(error)) {
        throw error;
      }

      failed += 1;
      console.error("[invoice-reminders] Failed to send reminder email", {
        invoiceId: candidate.id,
        invoiceNumber,
        reminderType,
        error,
      });
    }
  }

  return {
    total: candidates.length,
    sent,
    skipped,
    failed,
  };
}

async function runReminderJob(request: Request) {
  try {
    assertAuthorizedCronRequest(request);

    const now = new Date();
    const todayStart = startOfUtcDay(now);

    const dueSoonStart = addDays(todayStart, 3);
    const dueSoonEnd = addDays(dueSoonStart, 1);
    const overdueStart = addDays(todayStart, -7);
    const overdueEnd = addDays(overdueStart, 1);

    const dueSoon = await processReminderBatch(
      request,
      "before_due_3_days",
      dueSoonStart,
      dueSoonEnd
    );

    const overdue = await processReminderBatch(
      request,
      "after_due_7_days",
      overdueStart,
      overdueEnd
    );

    return NextResponse.json({
      success: true,
      dueSoon,
      overdue,
      sent: dueSoon.sent + overdue.sent,
    });
  } catch (error) {
    if (isCronAuthorizationError(error)) {
      return apiError(error.message, error.status);
    }

    if (isEmailConfigurationError(error)) {
      console.error("Error sending reminders: email configuration missing", error);
      return apiError("Email provider not configured. Set RESEND_API_KEY.", 500);
    }

    console.error("Error processing invoice reminders:", error);
    return apiError("Server error", 500);
  }
}

export async function GET() {
  return apiError("Method not allowed", 405);
}

export async function POST(request: Request) {
  return runReminderJob(request);
}
