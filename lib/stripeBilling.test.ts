import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, getStripeClientMock } = vi.hoisted(() => ({
  prismaMock: {
    business: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  getStripeClientMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: getStripeClientMock,
}));

import {
  getOrCreateBusinessStripeCustomer,
  syncBusinessSubscriptionFromCheckoutSession,
  syncBusinessSubscriptionFromStripeSubscription,
} from "@/lib/stripeBilling";

function createSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    object: "subscription",
    customer: "cus_123",
    status: "active",
    current_period_end: 1772448000,
    items: {
      object: "list",
      data: [
        {
          id: "si_123",
          object: "subscription_item",
          current_period_end: 1772448000,
          price: {
            id: "price_pro_monthly",
            object: "price",
          },
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
    metadata: {
      businessId: "business-1",
    },
    ...overrides,
  } as Stripe.Subscription;
}

describe("stripe billing helpers", () => {
  beforeEach(() => {
    prismaMock.business.findUnique.mockReset();
    prismaMock.business.findFirst.mockReset();
    prismaMock.business.update.mockReset();
    getStripeClientMock.mockReset();
  });

  it("creates and stores a Stripe customer when missing", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ stripeCustomerId: null });
    prismaMock.business.update.mockResolvedValue({});
    getStripeClientMock.mockReturnValue({
      customers: {
        create: vi.fn().mockResolvedValue({ id: "cus_new" }),
      },
    });

    const customerId = await getOrCreateBusinessStripeCustomer({
      businessId: "business-1",
      businessName: "Sierra Invoices",
      email: "owner@example.com",
    });

    expect(customerId).toBe("cus_new");
    expect(prismaMock.business.update).toHaveBeenCalledWith({
      where: { id: "business-1" },
      data: {
        stripeCustomerId: "cus_new",
      },
    });
  });

  it("syncs active subscriptions onto the business record", async () => {
    prismaMock.business.update.mockResolvedValue({});

    const synced = await syncBusinessSubscriptionFromStripeSubscription(createSubscription());

    expect(synced).toBe(true);
    expect(prismaMock.business.update).toHaveBeenCalledWith({
      where: { id: "business-1" },
      data: {
        planTier: "pro",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "active",
        stripePriceId: "price_pro_monthly",
        subscriptionCurrentPeriodEnd: new Date(1772448000 * 1000),
      },
    });
  });

  it("clears pro access when Stripe reports a canceled subscription", async () => {
    prismaMock.business.update.mockResolvedValue({});

    const synced = await syncBusinessSubscriptionFromStripeSubscription(
      createSubscription({ status: "canceled" })
    );

    expect(synced).toBe(true);
    expect(prismaMock.business.update).toHaveBeenCalledWith({
      where: { id: "business-1" },
      data: {
        planTier: "free",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: "canceled",
        stripePriceId: null,
        subscriptionCurrentPeriodEnd: null,
      },
    });
  });

  it("syncs checkout sessions by loading the underlying subscription", async () => {
    prismaMock.business.update.mockResolvedValue({});
    getStripeClientMock.mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(createSubscription()),
      },
    });

    const synced = await syncBusinessSubscriptionFromCheckoutSession({
      id: "cs_123",
      object: "checkout.session",
      mode: "subscription",
      subscription: "sub_123",
      customer: "cus_123",
      metadata: {
        businessId: "business-1",
      },
    } as Stripe.Checkout.Session);

    expect(synced).toBe(true);
    expect(prismaMock.business.update).toHaveBeenCalled();
  });
});
