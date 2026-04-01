import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { normalizeBillingSubscriptionStatus } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";

function asTrimmedString(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const firstPrice = subscription.items.data[0]?.price;
  return firstPrice?.id ?? null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const timestamps = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps) * 1000);
}

function getSubscriptionBusinessId(subscription: Stripe.Subscription): string | null {
  return asTrimmedString(subscription.metadata?.businessId);
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (typeof customer === "string") {
    return customer;
  }

  if (customer && "id" in customer && typeof customer.id === "string") {
    return customer.id;
  }

  return null;
}

export async function getOrCreateBusinessStripeCustomer(input: {
  businessId: string;
  businessName: string;
  email?: string | null;
}): Promise<string> {
  const existing = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: input.email?.trim() || undefined,
    name: input.businessName.trim() || undefined,
    metadata: {
      businessId: input.businessId,
    },
  });

  await prisma.business.update({
    where: { id: input.businessId },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function findBusinessIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const business = await prisma.business.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  return business?.id ?? null;
}

export async function findBusinessIdByStripeSubscriptionId(
  subscriptionId: string
): Promise<string | null> {
  const business = await prisma.business.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  });

  return business?.id ?? null;
}

export async function clearBusinessStripeSubscriptionState(input: {
  businessId: string;
  customerId?: string | null;
}): Promise<void> {
  await prisma.business.update({
    where: { id: input.businessId },
    data: {
      planTier: "free",
      stripeCustomerId: input.customerId ?? undefined,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "canceled",
      stripePriceId: null,
      subscriptionCurrentPeriodEnd: null,
    },
  });
}

export async function syncBusinessSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  fallback?: {
    businessId?: string | null;
    customerId?: string | null;
  }
): Promise<boolean> {
  const normalizedStatus = normalizeBillingSubscriptionStatus(subscription.status);
  const customerId = getCustomerId(subscription.customer) ?? fallback?.customerId ?? null;
  const businessId =
    getSubscriptionBusinessId(subscription) ??
    fallback?.businessId ??
    (await findBusinessIdByStripeSubscriptionId(subscription.id)) ??
    (customerId ? await findBusinessIdByStripeCustomerId(customerId) : null);

  if (!businessId) {
    return false;
  }

  if (normalizedStatus === "canceled") {
    await clearBusinessStripeSubscriptionState({ businessId, customerId });
    return true;
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      planTier: "pro",
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: normalizedStatus,
      stripePriceId: getSubscriptionPriceId(subscription),
      subscriptionCurrentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
    },
  });

  return true;
}

export async function syncBusinessSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (session.mode !== "subscription") {
    return false;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    return false;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return syncBusinessSubscriptionFromStripeSubscription(subscription, {
    businessId: asTrimmedString(session.metadata?.businessId) ?? asTrimmedString(session.client_reference_id),
    customerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
  });
}
