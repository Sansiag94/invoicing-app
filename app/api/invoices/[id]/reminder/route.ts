import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  buildPublicInvoiceLink,
  isEmailConfigurationError,
  isEmailDeliveryError,
  sendManualInvoiceReminderEmail,
} from "@/lib/email";
import { getInvoiceSenderName, normalizeInvoiceSenderType } from "@/lib/business";
import { calculateInvoiceTotals } from "@/lib/invoice";
import { logInvoiceEvent } from "@/lib/invoiceActivity";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    await assertRateLimit({
      request,
      route: "invoice-reminder-manual",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, user.id, id, "reminder"),
    });

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      include: {
        lineItems: true,
        business: true,
        client: true,
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    if (invoice.status === "paid") {
      return apiError("Paid invoices do not need reminders", 400);
    }

    const clientEmail = invoice.client.email?.trim();
    if (!clientEmail) {
      return apiError("Client email is missing", 400);
    }

    let publicToken = invoice.publicToken;
    if (!publicToken) {
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { publicToken: crypto.randomUUID() },
        select: { publicToken: true },
      });
      publicToken = updatedInvoice.publicToken;
    }

    if (!publicToken) {
      return apiError("Unable to generate invoice link", 500);
    }

    const senderPreferences = {
      ownerName: invoice.business.ownerName ?? null,
      invoiceSenderType: normalizeInvoiceSenderType(invoice.business.invoiceSenderType ?? "company"),
    };
    const invoiceLink = buildPublicInvoiceLink(publicToken, request.url);
    const recipientName =
      invoice.client.contactName || invoice.client.companyName || invoice.client.email;
    const computedTotals = calculateInvoiceTotals(invoice.lineItems);

    await sendManualInvoiceReminderEmail({
      to: clientEmail,
      businessName: getInvoiceSenderName({
        ...invoice.business,
        ...senderPreferences,
      }),
      recipientName,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: computedTotals.totalAmount > 0 ? computedTotals.totalAmount : invoice.totalAmount,
      currency: invoice.currency,
      invoiceLink,
      dueDate: invoice.dueDate,
    });

    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: "reminder_sent",
      actor: user.email ?? "User",
      details: `Reminder emailed to ${clientEmail}`,
    });

    return NextResponse.json({ message: "Reminder sent" });
  } catch (error) {
    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isEmailConfigurationError(error)) {
      return apiError("Email provider not configured. Set RESEND_API_KEY.", 500);
    }

    if (isEmailDeliveryError(error)) {
      return apiError(error.message, 502);
    }

    console.error("Error sending invoice reminder:", error);
    return apiError("Server error", 500);
  }
}
