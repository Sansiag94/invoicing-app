import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getOpenInvoiceStatus } from "@/lib/invoiceStatus";
import { listInvoiceEvents, logInvoiceEvent } from "@/lib/invoiceActivity";
import {
  getOutstandingInvoiceAmount,
  getSettledPaymentAmount,
  isInvoiceFullySettled,
} from "@/lib/payments";

type RecordPaymentBody = {
  amount?: unknown;
  provider?: unknown;
  paidAt?: unknown;
  note?: unknown;
};

const MANUAL_PAYMENT_PROVIDERS = ["bank_transfer", "twint", "cash", "revolut", "other"] as const;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asManualPaymentProvider(value: unknown): (typeof MANUAL_PAYMENT_PROVIDERS)[number] {
  return MANUAL_PAYMENT_PROVIDERS.includes(value as (typeof MANUAL_PAYMENT_PROVIDERS)[number])
    ? (value as (typeof MANUAL_PAYMENT_PROVIDERS)[number])
    : "bank_transfer";
}

function asDate(value: unknown): Date {
  if (typeof value !== "string" || value.trim() === "") {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

    const body = (await request.json()) as RecordPaymentBody;
    const amount = asNumber(body.amount);
    const provider = asManualPaymentProvider(body.provider);
    const paidAt = asDate(body.paidAt);
    const note = asNullableString(body.note);

    if (amount === null || amount <= 0) {
      return apiError("Payment amount must be greater than zero", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      include: {
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    if (invoice.status === "draft") {
      return apiError("Send or issue the invoice before recording payments.", 400);
    }

    if (invoice.status === "cancelled") {
      return apiError("Cancelled invoices cannot receive payments.", 400);
    }

    const amountDue = getOutstandingInvoiceAmount(invoice);
    if (amountDue <= 0.005 || invoice.status === "paid") {
      return apiError("This invoice is already fully paid.", 400);
    }

    if (amount > amountDue + 0.005) {
      return apiError(`Payment cannot be greater than the remaining amount (${invoice.currency} ${amountDue.toFixed(2)}).`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          provider,
          amount,
          currency: invoice.currency,
          status: "manual_paid",
          reference: "manual-payment",
          note,
          paidAt,
        },
      });

      const updatedPayments = [
        ...invoice.payments,
        {
          amount,
          status: "manual_paid",
        },
      ];
      const status = isInvoiceFullySettled({
        totalAmount: invoice.totalAmount,
        payments: updatedPayments,
      })
        ? "paid"
        : getOpenInvoiceStatus(invoice.dueDate);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status,
          stripeCheckoutSessionId: null,
          stripeCheckoutSessionExpiresAt: null,
        },
      });

      return tx.invoice.findFirst({
        where: { id: invoice.id, businessId: business.id },
        include: {
          client: true,
          lineItems: {
            orderBy: { position: "asc" },
          },
          business: true,
          payments: {
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          },
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    if (!updated) {
      return apiError("Invoice not found", 404);
    }

    const paidAmount = getSettledPaymentAmount(updated.payments);
    const outstanding = Math.max(0, updated.totalAmount - paidAmount);
    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: outstanding <= 0.005 ? "paid" : "payment_recorded",
      actor: user.email ?? "User",
      details:
        outstanding <= 0.005
          ? `Payment recorded and invoice fully paid (${invoice.currency} ${amount.toFixed(2)}).`
          : `Partial payment recorded (${invoice.currency} ${amount.toFixed(2)}). Remaining: ${invoice.currency} ${outstanding.toFixed(2)}.`,
    });

    const events = await listInvoiceEvents(updated.id);
    return NextResponse.json({ ...updated, events });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error recording invoice payment:", error);
    return apiError("Server error", 500);
  }
}
