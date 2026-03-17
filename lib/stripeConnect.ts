import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export type BusinessStripeConnectStatus = {
  usesPlatformStripe: boolean;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

type BusinessStripeRow = {
  usesPlatformStripe: boolean | null;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean | null;
  stripePayoutsEnabled: boolean | null;
  stripeDetailsSubmitted: boolean | null;
};

function normalizeBoolean(value: boolean | null | undefined): boolean {
  return value === true;
}

export const EMPTY_STRIPE_CONNECT_STATUS: BusinessStripeConnectStatus = {
  usesPlatformStripe: false,
  stripeAccountId: null,
  stripeChargesEnabled: false,
  stripePayoutsEnabled: false,
  stripeDetailsSubmitted: false,
};

function mapBusinessStripeRow(row: BusinessStripeRow | undefined): BusinessStripeConnectStatus {
  return {
    usesPlatformStripe: normalizeBoolean(row?.usesPlatformStripe),
    stripeAccountId: row?.stripeAccountId ?? null,
    stripeChargesEnabled: normalizeBoolean(row?.stripeChargesEnabled),
    stripePayoutsEnabled: normalizeBoolean(row?.stripePayoutsEnabled),
    stripeDetailsSubmitted: normalizeBoolean(row?.stripeDetailsSubmitted),
  };
}

export function getStripeConnectStatusFromAccount(
  account: Pick<Stripe.Account, "id" | "charges_enabled" | "payouts_enabled" | "details_submitted">
): BusinessStripeConnectStatus {
  return {
    usesPlatformStripe: false,
    stripeAccountId: account.id,
    stripeChargesEnabled: account.charges_enabled ?? false,
    stripePayoutsEnabled: account.payouts_enabled ?? false,
    stripeDetailsSubmitted: account.details_submitted ?? false,
  };
}

export async function getPlatformStripeStatus(): Promise<BusinessStripeConnectStatus> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve();

  return {
    ...getStripeConnectStatusFromAccount(account),
    usesPlatformStripe: true,
  };
}

export async function loadBusinessStripeConnectStatus(
  businessId: string
): Promise<BusinessStripeConnectStatus> {
  try {
    const rows = await prisma.$queryRaw<BusinessStripeRow[]>`
      SELECT
        "usesPlatformStripe",
        "stripeAccountId",
        "stripeChargesEnabled",
        "stripePayoutsEnabled",
        "stripeDetailsSubmitted"
      FROM "Business"
      WHERE "uuid" = ${businessId}
      LIMIT 1
    `;

    return mapBusinessStripeRow(rows[0]);
  } catch (error) {
    console.warn("Unable to load Stripe Connect status (columns may not exist yet):", error);
    return EMPTY_STRIPE_CONNECT_STATUS;
  }
}

export async function saveBusinessStripeConnectStatus(
  businessId: string,
  status: BusinessStripeConnectStatus
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "Business"
      SET
        "stripeAccountId" = ${status.stripeAccountId},
        "stripeChargesEnabled" = ${status.stripeChargesEnabled},
        "stripePayoutsEnabled" = ${status.stripePayoutsEnabled},
        "stripeDetailsSubmitted" = ${status.stripeDetailsSubmitted}
      WHERE "uuid" = ${businessId}
        AND COALESCE("usesPlatformStripe", false) = false
    `;
  } catch (error) {
    console.warn("Unable to save Stripe Connect status (columns may not exist yet):", error);
  }
}

export async function clearBusinessStripeConnectStatus(businessId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "Business"
      SET
        "stripeAccountId" = NULL,
        "stripeChargesEnabled" = false,
        "stripePayoutsEnabled" = false,
        "stripeDetailsSubmitted" = false
      WHERE "uuid" = ${businessId}
    `;
  } catch (error) {
    console.warn("Unable to clear Stripe Connect status (columns may not exist yet):", error);
  }
}

export async function refreshBusinessStripeConnectStatus(
  businessId: string
): Promise<BusinessStripeConnectStatus> {
  const currentStatus = await loadBusinessStripeConnectStatus(businessId);

  if (currentStatus.usesPlatformStripe) {
    if (
      currentStatus.stripeAccountId ||
      currentStatus.stripeChargesEnabled ||
      currentStatus.stripePayoutsEnabled ||
      currentStatus.stripeDetailsSubmitted
    ) {
      await clearBusinessStripeConnectStatus(businessId);
    }

    return getPlatformStripeStatus();
  }

  if (!currentStatus.stripeAccountId) {
    return currentStatus;
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(currentStatus.stripeAccountId);
  const updatedStatus = getStripeConnectStatusFromAccount(account);

  await saveBusinessStripeConnectStatus(businessId, updatedStatus);

  return updatedStatus;
}

export async function loadResolvedBusinessStripeStatus(
  businessId: string
): Promise<BusinessStripeConnectStatus> {
  const currentStatus = await loadBusinessStripeConnectStatus(businessId);

  if (!currentStatus.usesPlatformStripe) {
    return currentStatus;
  }

  return getPlatformStripeStatus();
}

export async function createConnectedStripeAccount(input: {
  businessId: string;
  businessName: string;
  email?: string | null;
  website?: string | null;
}): Promise<BusinessStripeConnectStatus> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "standard",
    email: input.email?.trim() || undefined,
    business_profile: {
      name: input.businessName.trim() || undefined,
      url: input.website?.trim() || undefined,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      businessId: input.businessId,
    },
  });

  const status = getStripeConnectStatusFromAccount(account);
  await saveBusinessStripeConnectStatus(input.businessId, status);
  return status;
}

export function getStripeRequestOptions(
  status: Pick<BusinessStripeConnectStatus, "usesPlatformStripe" | "stripeAccountId">
): Stripe.RequestOptions | undefined {
  if (status.usesPlatformStripe || !status.stripeAccountId) {
    return undefined;
  }

  return {
    stripeAccount: status.stripeAccountId,
  };
}

export function isStripeCardPaymentAvailable(
  status: Pick<BusinessStripeConnectStatus, "usesPlatformStripe" | "stripeAccountId" | "stripeChargesEnabled">
): boolean {
  if (status.usesPlatformStripe) {
    return status.stripeChargesEnabled;
  }

  return status.stripeAccountId !== null && status.stripeChargesEnabled;
}

export async function findBusinessIdByStripeAccountId(accountId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "uuid" AS "id"
      FROM "Business"
      WHERE "stripeAccountId" = ${accountId}
        AND COALESCE("usesPlatformStripe", false) = false
      LIMIT 1
    `;

    return rows[0]?.id ?? null;
  } catch (error) {
    console.warn("Unable to find business by Stripe account id:", error);
    return null;
  }
}
