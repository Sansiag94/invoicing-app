import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { logInvoiceEvent } from "@/lib/invoiceActivity";

export async function recordStripePaymentFromSession(
  session: Stripe.Checkout.Session
): Promise<{ invoiceId: string | null; markedPaid: boolean }> {
  const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id ?? null;

  if (!invoiceId || session.payment_status !== "paid") {
    return { invoiceId, markedPaid: false };
  }

  const reference =
    typeof session.payment_intent === "string" ? session.payment_intent : session.id;

  await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.updateMany({
      where: { id: invoiceId },
      data: { status: "paid" },
    });

    if (updatedInvoice.count === 0) {
      return;
    }

    const existingPayment = await tx.payment.findFirst({
      where: {
        invoiceId,
        reference,
      },
      select: { id: true },
    });

    if (!existingPayment) {
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
    }
  });

  await logInvoiceEvent({
    invoiceId,
    type: "paid",
    actor: "Stripe",
    details: `Stripe payment confirmed (${session.currency?.toUpperCase() ?? "USD"})`,
  });

  return { invoiceId, markedPaid: true };
}
