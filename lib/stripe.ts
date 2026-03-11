import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

let stripeClient: Stripe | null = null;
const stripeSecretKey = getStripeSecretKey();
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log(
  `[stripe] Config check: STRIPE_SECRET_KEY=${stripeSecretKey ? "loaded" : "missing"}, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey ? "loaded" : "missing"}`
);

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
    console.log("[stripe] Stripe client initialized.");
  }

  return stripeClient;
}

export function getStripePublishableKey(): string {
  if (!stripePublishableKey) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }

  return stripePublishableKey;
}
