import crypto from "crypto";

const PENDING_STRIPE_CHECKOUT_PREFIX = "pending:";
const STRIPE_CHECKOUT_LOCK_WINDOW_MS = 2 * 60 * 1000;

export function buildPendingStripeCheckoutSessionId(): string {
  return `${PENDING_STRIPE_CHECKOUT_PREFIX}${crypto.randomUUID()}`;
}

export function isPendingStripeCheckoutSessionId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PENDING_STRIPE_CHECKOUT_PREFIX);
}

export function hasActiveStripeCheckoutSession(
  sessionId: string | null | undefined,
  expiresAt: Date | null | undefined,
  now = new Date()
): boolean {
  return Boolean(sessionId && expiresAt && expiresAt.getTime() > now.getTime());
}

export function getStripeCheckoutLockExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + STRIPE_CHECKOUT_LOCK_WINDOW_MS);
}

export function toStripeCheckoutSessionExpiry(
  expiresAtUnixSeconds: number | null | undefined,
  fallback: Date
): Date {
  if (typeof expiresAtUnixSeconds !== "number" || !Number.isFinite(expiresAtUnixSeconds)) {
    return fallback;
  }

  return new Date(expiresAtUnixSeconds * 1000);
}
