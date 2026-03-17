import {
  buildPendingStripeCheckoutSessionId,
  getStripeCheckoutLockExpiresAt,
  hasActiveStripeCheckoutSession,
  isPendingStripeCheckoutSessionId,
  toStripeCheckoutSessionExpiry,
} from "@/lib/stripeCheckout";

describe("stripe checkout helpers", () => {
  it("builds a pending checkout session id", () => {
    const value = buildPendingStripeCheckoutSessionId();

    expect(value.startsWith("pending:")).toBe(true);
    expect(isPendingStripeCheckoutSessionId(value)).toBe(true);
  });

  it("detects an active checkout session", () => {
    const now = new Date("2026-03-17T15:00:00.000Z");
    const future = new Date("2026-03-17T15:05:00.000Z");
    const past = new Date("2026-03-17T14:55:00.000Z");

    expect(hasActiveStripeCheckoutSession("cs_test_123", future, now)).toBe(true);
    expect(hasActiveStripeCheckoutSession("cs_test_123", past, now)).toBe(false);
    expect(hasActiveStripeCheckoutSession(null, future, now)).toBe(false);
  });

  it("creates a short checkout lock window", () => {
    const now = new Date("2026-03-17T15:00:00.000Z");

    expect(getStripeCheckoutLockExpiresAt(now).toISOString()).toBe("2026-03-17T15:02:00.000Z");
  });

  it("maps stripe expiry timestamps to dates", () => {
    const fallback = new Date("2026-03-17T15:00:00.000Z");

    expect(toStripeCheckoutSessionExpiry(1773662400, fallback).toISOString()).toBe(
      "2026-03-16T12:00:00.000Z"
    );
    expect(toStripeCheckoutSessionExpiry(undefined, fallback)).toBe(fallback);
  });
});
