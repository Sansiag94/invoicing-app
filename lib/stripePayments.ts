import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { logInvoiceEvent } from "@/lib/invoiceActivity";

type StripePaymentRecordResult = {
  invoiceId: string | null;
  markedPaid: boolean;
  paymentRecorded: boolean;
  requiresReview: boolean;
  reviewReason: "additional_payment" | "cancelled_invoice" | null;
};

export async function recordStripePaymentFromSession(
  session: Stripe.Checkout.Session
): Promise<StripePaymentRecordResult> {
  const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id ?? null;

  if (!invoiceId || session.payment_status !== "paid") {
    return {
      invoiceId,
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: false,
      reviewReason: null,
    };
  }

  const reference =
    typeof session.payment_intent === "string" ? session.payment_intent : session.id;

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });

    if (!invoice) {
      return {
        invoiceFound: false,
        markedPaid: false,
        paymentRecorded: false,
        requiresReview: false,
        reviewReason: null,
      };
    }

    if (invoice.status === "cancelled") {
      await tx.invoice.updateMany({
        where: { id: invoiceId },
        data: {
          stripeCheckoutSessionId: null,
          stripeCheckoutSessionExpiresAt: null,
        },
      });

      return {
        invoiceFound: true,
        markedPaid: false,
        paymentRecorded: false,
        requiresReview: true,
        reviewReason: "cancelled_invoice" as const,
      };
    }

    const clearCheckoutSession = async () => {
      if (invoice.status === "paid") {
        await tx.invoice.updateMany({
          where: { id: invoiceId },
          data: {
            stripeCheckoutSessionId: null,
            stripeCheckoutSessionExpiresAt: null,
          },
        });
        return;
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "paid",
          stripeCheckoutSessionId: null,
          stripeCheckoutSessionExpiresAt: null,
        },
      });
    };

    const paymentWithSameReference = await tx.payment.findFirst({
      where: {
        invoiceId,
        provider: "stripe",
        reference,
      },
      select: { id: true },
    });

    if (paymentWithSameReference) {
      await clearCheckoutSession();
      return {
        invoiceFound: true,
        markedPaid: false,
        paymentRecorded: false,
        requiresReview: false,
        reviewReason: null,
      };
    }

    const existingStripePayment = await tx.payment.findFirst({
      where: {
        invoiceId,
        provider: "stripe",
      },
      select: { id: true, reference: true },
    });

    if (existingStripePayment) {
      await clearCheckoutSession();
      return {
        invoiceFound: true,
        markedPaid: false,
        paymentRecorded: false,
        requiresReview: true,
        reviewReason: "additional_payment" as const,
      };
    }

    await clearCheckoutSession();

    await tx.payment.create({
      data: {
        invoiceId,
        provider: "stripe",
        amount: typeof session.amount_total === "number" ? session.amount_total / 100 : 0,
        currency: session.currency?.toUpperCase() ?? "USD",
        status: session.payment_status,
        reference,
      },
    });

    return {
      invoiceFound: true,
      markedPaid: invoice.status !== "paid",
      paymentRecorded: true,
      requiresReview: false,
      reviewReason: null,
    };
  });

  if (!result.invoiceFound) {
    return {
      invoiceId,
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: false,
      reviewReason: null,
    };
  }

  if (result.requiresReview) {
    console.error("[stripe] Stripe payment requires review for invoice", {
      invoiceId,
      reason: result.reviewReason,
      reference,
      sessionId: session.id,
    });
    await logInvoiceEvent({
      invoiceId,
      type: "payment_review",
      actor: "Stripe",
      details:
        result.reviewReason === "cancelled_invoice"
          ? `Stripe payment received for a cancelled invoice (${session.currency?.toUpperCase() ?? "USD"}). Review and refund if needed.`
          : `Additional Stripe payment detected (${session.currency?.toUpperCase() ?? "USD"}). Review and refund if needed.`,
    });
    return {
      invoiceId,
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: true,
      reviewReason: result.reviewReason,
    };
  }

  if (result.paymentRecorded) {
    await logInvoiceEvent({
      invoiceId,
      type: "paid",
      actor: "Stripe",
      details: `Stripe payment confirmed (${session.currency?.toUpperCase() ?? "USD"})`,
    });
  }

  return {
    invoiceId,
    markedPaid: result.markedPaid,
    paymentRecorded: result.paymentRecorded,
    requiresReview: false,
    reviewReason: null,
  };
}
