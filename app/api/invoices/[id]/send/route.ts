import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  buildPublicInvoiceLink,
  isEmailConfigurationError,
  isEmailDeliveryError,
  sendInvoiceEmail,
} from "@/lib/email";
import crypto from "crypto";
import { getBusinessSenderPreferences, getInvoiceSenderName } from "@/lib/business";
import {
  calculateInvoiceTotals,
  deriveOfficialInvoicePrefix,
  formatSequentialInvoiceNumber,
  isDraftInvoiceNumber,
} from "@/lib/invoice";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";
import { logInvoiceEvent } from "@/lib/invoiceActivity";
import { getInvoiceAmountDue } from "@/lib/invoiceStatus";
import { assertBusinessCanIssueInvoice, isBillingLimitError } from "@/lib/billing";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";
import { getInvoiceVatConfigurationError } from "@/lib/vat";

export const runtime = "nodejs";

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

type BusinessInvoiceEmailDefaults = {
  replyToEmail: string | null;
  defaultInvoiceAttachmentUrl: string | null;
  defaultInvoiceAttachmentName: string | null;
};

async function loadBusinessInvoiceEmailDefaults(businessId: string): Promise<BusinessInvoiceEmailDefaults> {
  try {
    const rows = await prisma.$queryRaw<BusinessInvoiceEmailDefaults[]>`
      SELECT "replyToEmail", "defaultInvoiceAttachmentUrl", "defaultInvoiceAttachmentName"
      FROM "Business"
      WHERE "uuid" = ${businessId}
      LIMIT 1
    `;

    return {
      replyToEmail: rows[0]?.replyToEmail ?? null,
      defaultInvoiceAttachmentUrl: rows[0]?.defaultInvoiceAttachmentUrl ?? null,
      defaultInvoiceAttachmentName: rows[0]?.defaultInvoiceAttachmentName ?? null,
    };
  } catch (error) {
    console.warn("Unable to load invoice email defaults:", error);
    return {
      replyToEmail: null,
      defaultInvoiceAttachmentUrl: null,
      defaultInvoiceAttachmentName: null,
    };
  }
}

async function loadDefaultInvoiceAttachment(defaults: BusinessInvoiceEmailDefaults) {
  if (!defaults.defaultInvoiceAttachmentUrl) {
    return [];
  }

  try {
    const response = await fetch(defaults.defaultInvoiceAttachmentUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Attachment download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return [
      {
        filename: defaults.defaultInvoiceAttachmentName || "invoice-attachment.pdf",
        content: Buffer.from(arrayBuffer),
      },
    ];
  } catch (error) {
    console.error("Unable to attach default invoice PDF:", error);
    return [];
  }
}

async function loadInvoiceAttachments(
  attachments: Array<{
    filename: string;
    contentType: string;
    storageBucket: string;
    storagePath: string;
  }>
) {
  if (attachments.length === 0) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const loadedAttachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }> = [];

  for (const attachment of attachments) {
    const result = await supabaseAdmin.storage
      .from(attachment.storageBucket)
      .download(attachment.storagePath);

    if (result.error || !result.data) {
      throw new Error(`Could not load invoice attachment "${attachment.filename}"`);
    }

    loadedAttachments.push({
      filename: attachment.filename,
      content: Buffer.from(await result.data.arrayBuffer()),
      contentType: attachment.contentType,
    });
  }

  return loadedAttachments;
}

async function sendInvoice(id: string, businessId: string, request: Request) {
  const existingInvoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: {
      lineItems: {
        orderBy: { position: "asc" },
      },
      business: true,
      client: true,
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!existingInvoice) {
    console.warn("[invoice-send] Invoice not found", { invoiceId: id, businessId });
    return apiError("Invoice not found", 404);
  }

  const invoiceNumber = existingInvoice.invoiceNumber?.trim();
  if (!invoiceNumber) {
    console.error("[invoice-send] Missing invoice number", { invoiceId: existingInvoice.id });
    return apiError("Invoice number is missing", 500);
  }

  const clientEmail = existingInvoice.client.email?.trim();
  if (!clientEmail) {
    console.warn("[invoice-send] Client email missing", { invoiceId: existingInvoice.id });
    return apiError("Client email is missing", 400);
  }

  if (existingInvoice.status === "cancelled") {
    return apiError("Cancelled invoices cannot be sent. Reopen the invoice first.", 400);
  }

  const vatConfigurationError = getInvoiceVatConfigurationError(
    existingInvoice.lineItems,
    existingInvoice.business
  );
  if (vatConfigurationError) {
    return apiError(vatConfigurationError, 400);
  }

  if (existingInvoice.status === "draft") {
    await assertBusinessCanIssueInvoice(existingInvoice.businessId);
  }

  let officialInvoiceNumber = invoiceNumber;
  if (isDraftInvoiceNumber(invoiceNumber)) {
    const numberedInvoice = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: existingInvoice.businessId },
        data: { invoiceCounter: { increment: 1 } },
        select: { invoiceCounter: true },
      });

      const nextInvoiceNumber = formatSequentialInvoiceNumber(
        deriveOfficialInvoicePrefix(
          existingInvoice.client.companyName,
          existingInvoice.client.contactName,
          existingInvoice.client.email
        ),
        existingInvoice.issueDate,
        updatedBusiness.invoiceCounter
      );

      await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: { invoiceNumber: nextInvoiceNumber },
      });

      return nextInvoiceNumber;
    });

    officialInvoiceNumber = numberedInvoice;
    existingInvoice.invoiceNumber = numberedInvoice;
  }

  let publicToken = existingInvoice.publicToken;

  if (!publicToken) {
    const updatedInvoice = await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: { publicToken: crypto.randomUUID() },
      select: { publicToken: true },
    });

    publicToken = updatedInvoice.publicToken;
  }

  if (!publicToken) {
    console.error("[invoice-send] Public token generation failed", { invoiceId: existingInvoice.id });
    return apiError("Unable to generate invoice link", 500);
  }

  const invoiceLink = buildPublicInvoiceLink(publicToken, request.url);
  console.log("[invoice-send] Sending invoice email", {
    clientEmail,
    invoiceNumber: officialInvoiceNumber,
    invoiceLink,
  });

  const senderPreferences = getBusinessSenderPreferences(existingInvoice.business);
  const emailDefaults = await loadBusinessInvoiceEmailDefaults(existingInvoice.businessId);

  const computedTotals = calculateInvoiceTotals(existingInvoice.lineItems);
  const totalAmountForEmail =
    computedTotals.totalAmount > 0 ? computedTotals.totalAmount : existingInvoice.totalAmount;
  const amountDueForEmail = getInvoiceAmountDue(existingInvoice.status, totalAmountForEmail);
  const clientDisplayName =
    existingInvoice.client.contactName || existingInvoice.client.companyName || clientEmail;
  const emailBusinessName = getInvoiceSenderName({
    ...existingInvoice.business,
    ...senderPreferences,
  });
  const pdfFilename = buildInvoicePdfFilename(officialInvoiceNumber);
  const pdfDocument = React.createElement(InvoiceDocument, {
    invoice: {
      ...existingInvoice,
      business: {
        ...existingInvoice.business,
        bic: senderPreferences.bic,
      },
    },
    senderPreferences,
  }) as unknown as Parameters<typeof pdf>[0];
  const pdfStream = (await pdf(pdfDocument).toBuffer()) as unknown as NodeJS.ReadableStream;
  const pdfBuffer = await readStreamToBuffer(pdfStream);
  const [defaultAttachments, invoiceAttachments] = await Promise.all([
    loadDefaultInvoiceAttachment(emailDefaults),
    loadInvoiceAttachments(existingInvoice.attachments),
  ]);

  await sendInvoiceEmail({
    to: clientEmail,
    businessName: emailBusinessName,
    recipientName: clientDisplayName,
    invoiceNumber: officialInvoiceNumber,
    totalAmount: totalAmountForEmail,
    amountDue: amountDueForEmail,
    currency: existingInvoice.currency,
    dueDate: existingInvoice.dueDate,
    viewLink: invoiceLink,
    payLink: invoiceLink,
    replyToEmail: emailDefaults.replyToEmail,
    bankTransferDetails:
      amountDueForEmail > 0
        ? {
            accountHolder: emailBusinessName,
            bankName: existingInvoice.business.bankName,
            iban: existingInvoice.business.iban,
            bic: senderPreferences.bic,
            reference: existingInvoice.reference || officialInvoiceNumber,
          }
        : null,
    pdfAttachment: {
      filename: pdfFilename,
      content: pdfBuffer,
    },
    extraAttachments: [...defaultAttachments, ...invoiceAttachments],
  });

  if (existingInvoice.status === "draft") {
    await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        status: "sent",
        issuedAt: existingInvoice.issuedAt ?? new Date(),
      },
    });
  }

  const user = await getAuthenticatedUser(request);
  await logInvoiceEvent({
    invoiceId: existingInvoice.id,
    type: "sent",
    actor: user.email ?? "User",
    details: `Invoice ${officialInvoiceNumber} emailed to ${clientEmail}`,
  });

  console.log("[invoice-send] Invoice email sent and status updated", {
    invoiceId: existingInvoice.id,
    invoiceNumber: officialInvoiceNumber,
    clientEmail,
  });

  return NextResponse.json({
    message: existingInvoice.status === "paid" ? "Paid invoice sent" : "Invoice sent",
    status: existingInvoice.status === "draft" ? "sent" : existingInvoice.status,
    invoiceNumber: officialInvoiceNumber,
  });
}

export async function GET() {
  return apiError("Method not allowed", 405);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    await assertRateLimit({
      request,
      route: "invoice-send",
      limit: 6,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, user.id, id, "send"),
    });
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    return await sendInvoice(id, business.id, request);
  } catch (error) {
    if (isBillingLimitError(error)) {
      return apiError(error.message, error.status, {
        code: "payment_required",
        details: error.details,
      });
    }

    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isEmailConfigurationError(error)) {
      console.error("Error sending invoice: email configuration missing", error);
      return apiError("Email provider not configured. Set RESEND_API_KEY.", 500);
    }

    if (isEmailDeliveryError(error)) {
      console.error("Error sending invoice: email delivery failed", error);
      return apiError(error.message, 502);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Error sending invoice: attachment storage not configured", error);
      return apiError(
        "Invoice attachments are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
        500
      );
    }

    console.error("Error sending invoice:", error);
    return apiError("Server error", 500);
  }
}
