import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BillingLimitError,
  assertBusinessCanIssueInvoice,
  getBillingEntitlementSource,
  getBillingMonthRange,
  getBusinessBillingStatus,
  hasUnlimitedInvoices,
  isComplimentaryProEmail,
  normalizeBillingSubscriptionStatus,
  normalizeBusinessPlanTier,
} from "@/lib/billing";

function createBillingDb(overrides?: {
  planTier?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  issuedInvoiceCount?: number;
  userEmail?: string | null;
}) {
  return {
    business: {
      findUnique: vi.fn().mockResolvedValue({
        planTier: overrides?.planTier ?? "free",
        stripeCustomerId: overrides?.stripeCustomerId ?? null,
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: overrides?.stripeSubscriptionStatus ?? null,
        stripePriceId: null,
        subscriptionCurrentPeriodEnd: null,
        user: {
          email: overrides?.userEmail ?? null,
        },
      }),
    },
    invoice: {
      count: vi.fn().mockResolvedValue(overrides?.issuedInvoiceCount ?? 0),
    },
  };
}

describe("billing helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes plan tiers and subscription statuses safely", () => {
    expect(normalizeBusinessPlanTier("pro")).toBe("pro");
    expect(normalizeBusinessPlanTier("anything-else")).toBe("free");
    expect(normalizeBillingSubscriptionStatus("active")).toBe("active");
    expect(normalizeBillingSubscriptionStatus("weird")).toBe("inactive");
  });

  it("treats active pro subscriptions as unlimited", () => {
    expect(hasUnlimitedInvoices({ planTier: "pro", stripeSubscriptionStatus: "active" })).toBe(true);
    expect(hasUnlimitedInvoices({ planTier: "pro", stripeSubscriptionStatus: "past_due" })).toBe(true);
    expect(hasUnlimitedInvoices({ planTier: "pro", stripeSubscriptionStatus: "canceled" })).toBe(false);
    expect(hasUnlimitedInvoices({ planTier: "free", stripeSubscriptionStatus: "active" })).toBe(false);
  });

  it("supports complimentary pro email allowlists", () => {
    vi.stubEnv("COMPLIMENTARY_PRO_EMAILS", "owner@example.com, friend@example.com");

    expect(isComplimentaryProEmail("owner@example.com")).toBe(true);
    expect(isComplimentaryProEmail("Owner@Example.com")).toBe(true);
    expect(
      getBillingEntitlementSource({
        planTier: "free",
        stripeSubscriptionStatus: "inactive",
        userEmail: "friend@example.com",
      })
    ).toBe("complimentary");
  });

  it("builds calendar-month ranges in Europe/Zurich", () => {
    expect(getBillingMonthRange(new Date("2026-04-15T12:00:00.000Z"))).toEqual({
      start: new Date("2026-03-31T22:00:00.000Z"),
      endExclusive: new Date("2026-04-30T22:00:00.000Z"),
    });
    expect(getBillingMonthRange(new Date("2026-01-10T12:00:00.000Z"))).toEqual({
      start: new Date("2025-12-31T23:00:00.000Z"),
      endExclusive: new Date("2026-01-31T23:00:00.000Z"),
    });
  });

  it("computes free-plan usage and remaining quota", async () => {
    const db = createBillingDb({
      issuedInvoiceCount: 2,
    });

    const status = await getBusinessBillingStatus("business-1", db, new Date("2026-04-15T12:00:00.000Z"));

    expect(status.planTier).toBe("free");
    expect(status.monthlyIssuedInvoices).toBe(2);
    expect(status.monthlyInvoiceLimit).toBe(3);
    expect(status.remainingInvoices).toBe(1);
    expect(status.canIssueInvoice).toBe(true);
  });

  it("blocks the fourth issued invoice on the free plan", async () => {
    const db = createBillingDb({
      issuedInvoiceCount: 3,
    });

    await expect(
      assertBusinessCanIssueInvoice("business-1", db, new Date("2026-04-15T12:00:00.000Z"))
    ).rejects.toBeInstanceOf(BillingLimitError);
  });

  it("lets pro workspaces bypass the invoice limit", async () => {
    const db = createBillingDb({
      planTier: "pro",
      stripeSubscriptionStatus: "active",
      issuedInvoiceCount: 12,
      stripeCustomerId: "cus_123",
    });

    const status = await assertBusinessCanIssueInvoice(
      "business-1",
      db,
      new Date("2026-04-15T12:00:00.000Z")
    );

    expect(status.hasUnlimitedInvoices).toBe(true);
    expect(status.monthlyInvoiceLimit).toBeNull();
    expect(status.remainingInvoices).toBeNull();
    expect(status.portalAvailable).toBe(true);
  });

  it("lets complimentary pro workspaces bypass the invoice limit without Stripe billing", async () => {
    vi.stubEnv("COMPLIMENTARY_PRO_EMAILS", "sansiag94@gmail.com");

    const db = createBillingDb({
      issuedInvoiceCount: 25,
      userEmail: "sansiag94@gmail.com",
    });

    const status = await assertBusinessCanIssueInvoice(
      "business-1",
      db,
      new Date("2026-04-15T12:00:00.000Z")
    );

    expect(status.planTier).toBe("pro");
    expect(status.entitlementSource).toBe("complimentary");
    expect(status.isComplimentaryPro).toBe(true);
    expect(status.hasUnlimitedInvoices).toBe(true);
    expect(status.monthlyInvoiceLimit).toBeNull();
    expect(status.portalAvailable).toBe(false);
  });
});
