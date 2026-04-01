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
import { assertBusinessCanIssueInvoice, isBillingLimitError } from "@/lib/billing";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
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

  if (existingInvoice.status === "paid") {
    return apiError("Paid invoices cannot be sent again", 400);
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

  const computedTotals = calculateInvoiceTotals(existingInvoice.lineItems);
  const totalAmountForEmail =
    computedTotals.totalAmount > 0 ? computedTotals.totalAmount : existingInvoice.totalAmount;
  const clientDisplayName =
    existingInvoice.client.contactName || existingInvoice.client.companyName || clientEmail;
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

  await sendInvoiceEmail({
    to: clientEmail,
    businessName: getInvoiceSenderName({
      ...existingInvoice.business,
      ...senderPreferences,
    }),
    recipientName: clientDisplayName,
    invoiceNumber: officialInvoiceNumber,
    totalAmount: totalAmountForEmail,
    currency: existingInvoice.currency,
    dueDate: existingInvoice.dueDate,
    viewLink: invoiceLink,
    payLink: invoiceLink,
    pdfAttachment: {
      filename: pdfFilename,
      content: pdfBuffer,
    },
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

  return NextResponse.json({ message: "Invoice sent" });
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

    console.error("Error sending invoice:", error);
    return apiError("Server error", 500);
  }
}
