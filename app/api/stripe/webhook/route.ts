import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return apiError("Missing Stripe signature", 400);
  }

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return apiError("Webhook not configured", 500);
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);
    return apiError("Invalid signature", 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;

      if (invoiceId && session.payment_status === "paid") {
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
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return apiError("Webhook handler failed", 500);
  }
}
