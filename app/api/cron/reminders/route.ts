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

type ReminderCronStage =
  | "authorize"
  | "prepare_windows"
  | "before_due_3_days"
  | "after_due_7_days"
  | "complete";

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
  businessReplyToEmail: string | null;
  clientCompanyName: string | null;
  clientContactName: string | null;
  clientEmail: string;
};

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

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
      b."replyToEmail" AS "businessReplyToEmail",
      c."companyName" AS "clientCompanyName",
      c."contactName" AS "clientContactName",
      c."email" AS "clientEmail"
    FROM "Invoice" i
    INNER JOIN "Business" b ON b."uuid" = i."businessId"
    INNER JOIN "Client" c ON c."uuid" = i."clientId"
      WHERE i."status" IN (${InvoiceStatus.sent}::"InvoiceStatus", ${InvoiceStatus.overdue}::"InvoiceStatus")
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
      AND i."status" IN (${InvoiceStatus.sent}::"InvoiceStatus", ${InvoiceStatus.overdue}::"InvoiceStatus")
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
      const businessDisplayName = getInvoiceSenderName({
        name: candidate.businessName,
        ownerName: candidate.businessOwnerName,
        invoiceSenderType: candidate.businessInvoiceSenderType,
      });
      await sendInvoiceReminderEmail({
        to: clientEmail,
        businessName: businessDisplayName,
        recipientName,
        invoiceNumber,
        totalAmount: candidate.totalAmount,
        currency: candidate.currency,
        invoiceLink,
        dueDate,
        reminderKind: reminderType,
        replyToEmail: candidate.businessReplyToEmail,
      });

      try {
        await logInvoiceEvent({
          invoiceId: candidate.id,
          type: "reminder_sent",
          actor: "System",
          details: `Scheduled reminder sent (${reminderType})`,
        });
      } catch (error) {
        console.error("[invoice-reminders] Reminder sent but event logging failed", {
          invoiceId: candidate.id,
          invoiceNumber,
          reminderType,
          error,
        });
      }

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
  let stage: ReminderCronStage = "authorize";

  try {
    assertAuthorizedCronRequest(request);

    stage = "prepare_windows";
    const now = new Date();
    const todayStart = startOfUtcDay(now);

    const dueSoonStart = addDays(todayStart, 3);
    const dueSoonEnd = addDays(dueSoonStart, 1);
    const overdueStart = addDays(todayStart, -7);
    const overdueEnd = addDays(overdueStart, 1);

    stage = "before_due_3_days";
    const dueSoon = await processReminderBatch(
      request,
      "before_due_3_days",
      dueSoonStart,
      dueSoonEnd
    );

    stage = "after_due_7_days";
    const overdue = await processReminderBatch(
      request,
      "after_due_7_days",
      overdueStart,
      overdueEnd
    );

    stage = "complete";
    return NextResponse.json({
      success: true,
      dueSoon,
      overdue,
      sent: dueSoon.sent + overdue.sent,
    });
  } catch (error) {
    if (isCronAuthorizationError(error)) {
      return apiError(error.message, error.status, { details: { stage } });
    }

    if (isEmailConfigurationError(error)) {
      console.error("Error sending reminders: email configuration missing", {
        stage,
        error,
      });
      return apiError("Email provider not configured for reminder emails.", 500, {
        details: { stage, errorName: getErrorName(error) },
      });
    }

    console.error("Error processing invoice reminders:", { stage, error });
    return apiError("Invoice reminder cron failed.", 500, {
      details: { stage, errorName: getErrorName(error) },
    });
  }
}

export async function GET() {
  return apiError("Method not allowed", 405);
}

export async function POST(request: Request) {
  return runReminderJob(request);
}
