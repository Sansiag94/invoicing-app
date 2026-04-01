import prisma from "@/lib/prisma";
import { getComplimentaryProEmails } from "@/lib/env";
import { getLegalProfile } from "@/lib/legal";
import type {
  BillingEntitlementSource,
  BillingLimitDetails,
  BillingStatus,
  BillingSubscriptionStatus,
  BusinessPlanTier,
} from "@/lib/types";

export const BILLING_TIME_ZONE = "Europe/Zurich";
export const FREE_MONTHLY_ISSUE_LIMIT = 3;
export const PRO_MONTHLY_PRICE_CHF = 19;
export const ONBOARDING_PRICE_CHF = 99;
export const BILLING_CHECKOUT_PATH = "/api/billing/checkout";
export const BILLING_PORTAL_PATH = "/api/billing/portal";

type BillingBusinessRecord = {
  planTier: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripePriceId: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  user: {
    email: string | null;
  };
};

type BillingDb = {
  business: {
    findUnique: (args: {
      where: { id: string };
      select: {
        planTier: true;
        stripeCustomerId: true;
        stripeSubscriptionId: true;
        stripeSubscriptionStatus: true;
        stripePriceId: true;
        subscriptionCurrentPeriodEnd: true;
        user: {
          select: {
            email: true;
          };
        };
      };
    }) => Promise<BillingBusinessRecord | null>;
  };
  invoice: {
    count: (args: {
      where: {
        businessId: string;
        issuedAt: {
          gte: Date;
          lt: Date;
        };
      };
    }) => Promise<number>;
  };
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const PRO_UNLIMITED_STATUSES = new Set<BillingSubscriptionStatus>(["active", "trialing", "past_due"]);

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const offsetLabel = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "UTC";
  const match = offsetLabel.match(/^(?:GMT|UTC)(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)?$/i);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");

  return sign * ((hours * 60 + minutes) * 60 * 1000);
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getTimeZoneOffsetMs(new Date(naiveUtc), timeZone);
  const candidate = new Date(naiveUtc - initialOffset);
  const candidateOffset = getTimeZoneOffsetMs(candidate, timeZone);

  if (candidateOffset === initialOffset) {
    return candidate;
  }

  return new Date(naiveUtc - candidateOffset);
}

export function normalizeBusinessPlanTier(value: string | null | undefined): BusinessPlanTier {
  return value === "pro" ? "pro" : "free";
}

export function normalizeBillingSubscriptionStatus(
  value: string | null | undefined
): BillingSubscriptionStatus {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return value;
    default:
      return "inactive";
  }
}

export function hasUnlimitedInvoices(input: {
  planTier: string | null | undefined;
  stripeSubscriptionStatus: string | null | undefined;
}): boolean {
  return (
    normalizeBusinessPlanTier(input.planTier) === "pro" &&
    PRO_UNLIMITED_STATUSES.has(normalizeBillingSubscriptionStatus(input.stripeSubscriptionStatus))
  );
}

function normalizeEmailAddress(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function isComplimentaryProEmail(email: string | null | undefined): boolean {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    return false;
  }

  return getComplimentaryProEmails().includes(normalizedEmail);
}

export function getBillingEntitlementSource(input: {
  planTier: string | null | undefined;
  stripeSubscriptionStatus: string | null | undefined;
  userEmail?: string | null | undefined;
}): BillingEntitlementSource {
  if (isComplimentaryProEmail(input.userEmail)) {
    return "complimentary";
  }

  if (
    hasUnlimitedInvoices({
      planTier: input.planTier,
      stripeSubscriptionStatus: input.stripeSubscriptionStatus,
    })
  ) {
    return "stripe";
  }

  return "free";
}

export function getBillingMonthRange(date = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const zoned = getZonedDateParts(date, BILLING_TIME_ZONE);
  const nextMonth = zoned.month === 12 ? 1 : zoned.month + 1;
  const nextMonthYear = zoned.month === 12 ? zoned.year + 1 : zoned.year;

  return {
    start: zonedDateTimeToUtc(zoned.year, zoned.month, 1, 0, 0, 0, BILLING_TIME_ZONE),
    endExclusive: zonedDateTimeToUtc(nextMonthYear, nextMonth, 1, 0, 0, 0, BILLING_TIME_ZONE),
  };
}

export function buildBillingLimitDetails(status: BillingStatus): BillingLimitDetails {
  return {
    ...status,
    reason: "invoice_limit_reached",
  };
}

export class BillingLimitError extends Error {
  status = 402;
  details: BillingLimitDetails;

  constructor(status: BillingStatus) {
    super("Free plan monthly invoice limit reached. Upgrade to Pro to issue more invoices.");
    this.name = "BillingLimitError";
    this.details = buildBillingLimitDetails(status);
  }
}

export function isBillingLimitError(error: unknown): error is BillingLimitError {
  return error instanceof BillingLimitError;
}

export async function getBusinessBillingStatus(
  businessId: string,
  db: BillingDb = prisma,
  date = new Date()
): Promise<BillingStatus> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      planTier: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
      stripePriceId: true,
      subscriptionCurrentPeriodEnd: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  const { start, endExclusive } = getBillingMonthRange(date);
  const monthlyIssuedInvoices = await db.invoice.count({
    where: {
      businessId,
      issuedAt: {
        gte: start,
        lt: endExclusive,
      },
    },
  });

  const storedPlanTier = normalizeBusinessPlanTier(business.planTier);
  const stripeSubscriptionStatus = normalizeBillingSubscriptionStatus(
    business.stripeSubscriptionStatus
  );
  const entitlementSource = getBillingEntitlementSource({
    planTier: storedPlanTier,
    stripeSubscriptionStatus,
    userEmail: business.user.email,
  });
  const isComplimentaryPro = entitlementSource === "complimentary";
  const planTier = isComplimentaryPro ? "pro" : storedPlanTier;
  const unlimited = entitlementSource === "complimentary" || entitlementSource === "stripe";
  const legalProfile = getLegalProfile();
  const monthlyInvoiceLimit = unlimited ? null : FREE_MONTHLY_ISSUE_LIMIT;
  const remainingInvoices =
    monthlyInvoiceLimit === null ? null : Math.max(0, monthlyInvoiceLimit - monthlyIssuedInvoices);

  return {
    planTier,
    stripeSubscriptionStatus,
    entitlementSource,
    isComplimentaryPro,
    hasUnlimitedInvoices: unlimited,
    monthlyIssuedInvoices,
    monthlyInvoiceLimit,
    remainingInvoices,
    canIssueInvoice: unlimited || monthlyIssuedInvoices < FREE_MONTHLY_ISSUE_LIMIT,
    usagePeriodStart: start.toISOString(),
    usagePeriodEndExclusive: endExclusive.toISOString(),
    currency: "CHF",
    proPriceMonthlyChf: PRO_MONTHLY_PRICE_CHF,
    checkoutUrl: BILLING_CHECKOUT_PATH,
    checkoutAvailable: true,
    portalUrl: BILLING_PORTAL_PATH,
    portalAvailable: entitlementSource === "stripe" && Boolean(business.stripeCustomerId),
    supportEmail: legalProfile.supportEmail,
    onboardingPriceChf: ONBOARDING_PRICE_CHF,
    onboardingEmail: legalProfile.supportEmail,
  };
}

export async function assertBusinessCanIssueInvoice(
  businessId: string,
  db: BillingDb = prisma,
  date = new Date()
): Promise<BillingStatus> {
  const status = await getBusinessBillingStatus(businessId, db, date);

  if (!status.canIssueInvoice) {
    throw new BillingLimitError(status);
  }

  return status;
}
