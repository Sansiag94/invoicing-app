import Stripe from "stripe";

let stripeClient: Stripe | null = null;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log(
  `[stripe] Config check: STRIPE_SECRET_KEY=${stripeSecretKey ? "loaded" : "missing"}, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey ? "loaded" : "missing"}`
);

export function getStripeClient(): Stripe {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

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
