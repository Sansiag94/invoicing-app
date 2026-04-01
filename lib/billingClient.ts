import type { BillingLimitDetails, BillingStatus } from "@/lib/types";

type BillingErrorPayload = {
  code?: string;
  details?: unknown;
};

export function isBillingStatus(value: unknown): value is BillingStatus {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    typeof (value as BillingStatus).planTier === "string" &&
    typeof (value as BillingStatus).monthlyIssuedInvoices === "number"
  );
}

export function getBillingLimitDetails(payload: BillingErrorPayload | null | undefined): BillingLimitDetails | null {
  if (!payload || payload.code !== "payment_required") {
    return null;
  }

  const details = payload.details as Partial<BillingLimitDetails> | undefined;
  if (!details || details.reason !== "invoice_limit_reached") {
    return null;
  }

  return details as BillingLimitDetails;
}
