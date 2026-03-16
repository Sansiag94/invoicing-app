import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export type BusinessStripeConnectStatus = {
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

type BusinessStripeRow = {
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean | null;
  stripePayoutsEnabled: boolean | null;
  stripeDetailsSubmitted: boolean | null;
};

function normalizeBoolean(value: boolean | null | undefined): boolean {
  return value === true;
}

export const EMPTY_STRIPE_CONNECT_STATUS: BusinessStripeConnectStatus = {
  stripeAccountId: null,
  stripeChargesEnabled: false,
  stripePayoutsEnabled: false,
  stripeDetailsSubmitted: false,
};

function mapBusinessStripeRow(row: BusinessStripeRow | undefined): BusinessStripeConnectStatus {
  return {
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
    stripeAccountId: account.id,
    stripeChargesEnabled: account.charges_enabled ?? false,
    stripePayoutsEnabled: account.payouts_enabled ?? false,
    stripeDetailsSubmitted: account.details_submitted ?? false,
  };
}

export async function loadBusinessStripeConnectStatus(
  businessId: string
): Promise<BusinessStripeConnectStatus> {
  try {
    const rows = await prisma.$queryRaw<BusinessStripeRow[]>`
      SELECT
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
    `;
  } catch (error) {
    console.warn("Unable to save Stripe Connect status (columns may not exist yet):", error);
  }
}

export async function refreshBusinessStripeConnectStatus(
  businessId: string
): Promise<BusinessStripeConnectStatus> {
  const currentStatus = await loadBusinessStripeConnectStatus(businessId);

  if (!currentStatus.stripeAccountId) {
    return currentStatus;
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(currentStatus.stripeAccountId);
  const updatedStatus = getStripeConnectStatusFromAccount(account);

  await saveBusinessStripeConnectStatus(businessId, updatedStatus);

  return updatedStatus;
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

export async function findBusinessIdByStripeAccountId(accountId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "uuid" AS "id"
      FROM "Business"
      WHERE "stripeAccountId" = ${accountId}
      LIMIT 1
    `;

    return rows[0]?.id ?? null;
  } catch (error) {
    console.warn("Unable to find business by Stripe account id:", error);
    return null;
  }
}
