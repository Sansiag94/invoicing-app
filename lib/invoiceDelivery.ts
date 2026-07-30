import React from "react";
import crypto from "crypto";
import { pdf } from "@react-pdf/renderer";
import prisma from "@/lib/prisma";
import {
  buildPublicInvoiceLink,
  sendInvoiceEmail,
} from "@/lib/email";
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
import { assertBusinessCanIssueInvoice } from "@/lib/billing";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getInvoiceVatConfigurationError } from "@/lib/vat";

type BusinessInvoiceEmailDefaults = {
  replyToEmail: string | null;
  defaultInvoiceAttachmentUrl: string | null;
  defaultInvoiceAttachmentName: string | null;
};

export class InvoiceDeliveryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "InvoiceDeliveryError";
    this.status = status;
  }
}

export function isInvoiceDeliveryError(error: unknown): error is InvoiceDeliveryError {
  return error instanceof InvoiceDeliveryError;
}

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

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

export async function deliverInvoiceEmail(input: {
  invoiceId: string;
  businessId: string;
  requestUrl: string;
  actor: string;
}) {
  const existingInvoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, businessId: input.businessId },
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
    console.warn("[invoice-send] Invoice not found", {
      invoiceId: input.invoiceId,
      businessId: input.businessId,
    });
    throw new InvoiceDeliveryError("Invoice not found", 404);
  }

  const invoiceNumber = existingInvoice.invoiceNumber?.trim();
  if (!invoiceNumber) {
    console.error("[invoice-send] Missing invoice number", { invoiceId: existingInvoice.id });
    throw new InvoiceDeliveryError("Invoice number is missing", 500);
  }

  const clientEmail = existingInvoice.client.email?.trim();
  if (!clientEmail) {
    console.warn("[invoice-send] Client email missing", { invoiceId: existingInvoice.id });
    throw new InvoiceDeliveryError(
      "This client has no email address. Add an email to the client before sending invoices by email.",
      400
    );
  }

  if (existingInvoice.status === "cancelled") {
    throw new InvoiceDeliveryError("Cancelled invoices cannot be sent. Reopen the invoice first.", 400);
  }

  const vatConfigurationError = getInvoiceVatConfigurationError(
    existingInvoice.lineItems,
    existingInvoice.business
  );
  if (vatConfigurationError) {
    throw new InvoiceDeliveryError(vatConfigurationError, 400);
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
    throw new InvoiceDeliveryError("Unable to generate invoice link", 500);
  }

  const invoiceLink = buildPublicInvoiceLink(publicToken, input.requestUrl);
  console.log("[invoice-send] Sending invoice email", {
    clientEmail,
    invoiceNumber: officialInvoiceNumber,
    invoiceLink,
  });

  const senderPreferences = getBusinessSenderPreferences(existingInvoice.business);
  const emailDefaults = await loadBusinessInvoiceEmailDefaults(existingInvoice.businessId);

  const computedTotals = calculateInvoiceTotals(existingInvoice.lineItems, existingInvoice);
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
        scheduledSendAt: null,
        scheduledSendFailure: null,
      },
    });
  } else {
    await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        scheduledSendAt: null,
        scheduledSendFailure: null,
      },
    });
  }

  await logInvoiceEvent({
    invoiceId: existingInvoice.id,
    type: "sent",
    actor: input.actor,
    details: `Invoice ${officialInvoiceNumber} emailed to ${clientEmail}`,
  });

  console.log("[invoice-send] Invoice email sent and status updated", {
    invoiceId: existingInvoice.id,
    invoiceNumber: officialInvoiceNumber,
    clientEmail,
  });

  return {
    message: existingInvoice.status === "paid" ? "Paid invoice sent" : "Invoice sent",
    status: existingInvoice.status === "draft" ? "sent" : existingInvoice.status,
    invoiceNumber: officialInvoiceNumber,
    clientEmail,
  };
}
