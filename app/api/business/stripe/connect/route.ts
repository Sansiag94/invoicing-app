import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getStripeClient } from "@/lib/stripe";
import {
  createConnectedStripeAccount,
  refreshBusinessStripeConnectStatus,
} from "@/lib/stripeConnect";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    const stripe = getStripeClient();
    const currentStatus = await refreshBusinessStripeConnectStatus(business.id);

    if (currentStatus.usesPlatformStripe) {
      return NextResponse.json({
        connected: true,
        redirectUrl: new URL("/settings", request.url).toString(),
      });
    }

    if (
      currentStatus.stripeAccountId &&
      currentStatus.stripeChargesEnabled &&
      currentStatus.stripePayoutsEnabled &&
      currentStatus.stripeDetailsSubmitted
    ) {
      return NextResponse.json({
        connected: true,
        redirectUrl: new URL("/settings?stripe=connected", request.url).toString(),
      });
    }

    const accountStatus =
      currentStatus.stripeAccountId
        ? currentStatus
        : await createConnectedStripeAccount({
            businessId: business.id,
            businessName: business.name,
            email: business.email ?? user.email,
            website: business.website,
          });

    if (!accountStatus.stripeAccountId) {
      return apiError("Could not create Stripe account", 500);
    }

    const link = await stripe.accountLinks.create({
      account: accountStatus.stripeAccountId,
      refresh_url: new URL("/settings?stripe=refresh", request.url).toString(),
      return_url: new URL("/settings?stripe=connected", request.url).toString(),
      type: "account_onboarding",
    });

    return NextResponse.json({
      connected: false,
      redirectUrl: link.url,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error starting Stripe Connect onboarding:", error);
    return apiError("Could not connect Stripe", 500);
  }
}
