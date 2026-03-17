import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { recordStripePaymentFromSession } from "@/lib/stripePayments";
import {
  clearBusinessStripeConnectStatus,
  findBusinessIdByStripeAccountId,
  getStripeConnectStatusFromAccount,
  saveBusinessStripeConnectStatus,
} from "@/lib/stripeConnect";

export const runtime = "nodejs";

function constructStripeWebhookEvent(
  stripe: Stripe,
  payload: string,
  signature: string
): Stripe.Event {
  const secrets = [
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET,
  ].filter((value): value is string => Boolean(value?.trim()));

  if (secrets.length === 0) {
    throw new Error("Webhook not configured");
  }

  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      // Try the next configured secret.
    }
  }

  throw new Error("Invalid signature");
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return apiError("Missing Stripe signature", 400);
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = constructStripeWebhookEvent(stripe, payload, signature);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);
    return apiError(
      error instanceof Error && error.message === "Webhook not configured"
        ? "Webhook not configured"
        : "Invalid signature",
      error instanceof Error && error.message === "Webhook not configured" ? 500 : 400
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await recordStripePaymentFromSession(session);
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const businessId = await findBusinessIdByStripeAccountId(account.id);

      if (businessId) {
        await saveBusinessStripeConnectStatus(
          businessId,
          getStripeConnectStatusFromAccount(account)
        );
      }
    }

    if (event.type === "account.application.deauthorized") {
      const connectedAccountId = event.account;

      if (connectedAccountId) {
        const businessId = await findBusinessIdByStripeAccountId(connectedAccountId);

        if (businessId) {
          await clearBusinessStripeConnectStatus(businessId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return apiError("Webhook handler failed", 500);
  }
}
