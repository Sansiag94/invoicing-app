import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  buildPublicInvoiceLink,
  isEmailConfigurationError,
  isEmailDeliveryError,
  sendInvoiceEmail,
} from "@/lib/email";
import crypto from "crypto";
import { getInvoiceSenderName } from "@/lib/business";
import { calculateInvoiceTotals } from "@/lib/invoice";

export const runtime = "nodejs";

async function sendInvoice(id: string, businessId: string, request: Request) {
  const existingInvoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      invoiceNumber: true,
      publicToken: true,
      status: true,
      totalAmount: true,
      currency: true,
      dueDate: true,
      lineItems: {
        select: {
          quantity: true,
          unitPrice: true,
          taxRate: true,
        },
      },
      business: {
        select: {
          id: true,
          name: true,
        },
      },
      client: {
        select: {
          companyName: true,
          contactName: true,
          email: true,
        },
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

  if (existingInvoice.status === "paid") {
    return apiError("Paid invoices cannot be sent again", 400);
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
    invoiceNumber,
    invoiceLink,
  });

  let senderPreferences: { ownerName: string | null; invoiceSenderType: "company" | "owner" } = {
    ownerName: null,
    invoiceSenderType: "company",
  };

  try {
    const rows = await prisma.$queryRaw<Array<{ ownerName: string | null; invoiceSenderType: string | null }>>`
      SELECT "ownerName", "invoiceSenderType"
      FROM "Business"
      WHERE "uuid" = ${existingInvoice.business.id}
      LIMIT 1
    `;

    const row = rows[0];
    senderPreferences = {
      ownerName: row?.ownerName ?? null,
      invoiceSenderType: row?.invoiceSenderType?.toLowerCase() === "owner" ? "owner" : "company",
    };
  } catch (error) {
    console.warn("Unable to load sender preferences (columns may not exist yet):", error);
  }

  const computedTotals = calculateInvoiceTotals(existingInvoice.lineItems);
  const totalAmountForEmail =
    computedTotals.totalAmount > 0 ? computedTotals.totalAmount : existingInvoice.totalAmount;
  const clientDisplayName =
    existingInvoice.client.contactName || existingInvoice.client.companyName || clientEmail;

  await sendInvoiceEmail({
    to: clientEmail,
    businessName: getInvoiceSenderName({
      ...existingInvoice.business,
      ...senderPreferences,
    }),
    recipientName: clientDisplayName,
    invoiceNumber,
    totalAmount: totalAmountForEmail,
    currency: existingInvoice.currency,
    dueDate: existingInvoice.dueDate,
    invoiceLink,
  });

  if (existingInvoice.status === "draft") {
    await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: { status: "sent" },
    });
  }

  console.log("[invoice-send] Invoice email sent and status updated", {
    invoiceId: existingInvoice.id,
    invoiceNumber,
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
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    return await sendInvoice(id, business.id, request);
  } catch (error) {
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
