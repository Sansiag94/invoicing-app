import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { recordStripePaymentFromSession } from "@/lib/stripePayments";

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
      await recordStripePaymentFromSession(session);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return apiError("Webhook handler failed", 500);
  }
}
