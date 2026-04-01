import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";
import { getStripeClient } from "@/lib/stripe";
import { getStripeProMonthlyPriceId } from "@/lib/env";
import { getBusinessBillingStatus } from "@/lib/billing";
import { getOrCreateBusinessStripeCustomer } from "@/lib/stripeBilling";

type CheckoutBody = {
  returnPath?: unknown;
};

function getSafeReturnPath(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") ? value : fallback;
}

function buildReturnUrl(requestUrl: string, returnPath: string, outcome: "success" | "cancelled") {
  const url = new URL(returnPath, requestUrl);
  url.searchParams.set("billing", outcome);
  return url.toString();
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const priceId = getStripeProMonthlyPriceId();

    if (!priceId) {
      return apiError(
        "Billing is not configured yet. Set STRIPE_PRO_MONTHLY_PRICE_ID before enabling upgrades.",
        503
      );
    }

    const billingStatus = await getBusinessBillingStatus(business.id);
    if (billingStatus.hasUnlimitedInvoices) {
      return apiError("This workspace already has an active Pro subscription.", 409);
    }

    const returnPath = getSafeReturnPath(body.returnPath, "/settings");
    const customerId = await getOrCreateBusinessStripeCustomer({
      businessId: business.id,
      businessName: business.name,
      email: business.email ?? user.email,
    });

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: business.id,
      success_url: buildReturnUrl(request.url, returnPath, "success"),
      cancel_url: buildReturnUrl(request.url, returnPath, "cancelled"),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: false,
      metadata: {
        sessionKind: "app_subscription",
        businessId: business.id,
      },
      subscription_data: {
        metadata: {
          businessId: business.id,
        },
      },
    });

    if (!session.url) {
      return apiError("Could not create Stripe checkout session", 500);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error creating billing checkout session:", error);
    return apiError("Server error", 500);
  }
}
