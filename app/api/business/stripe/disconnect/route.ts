import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import {
  EMPTY_STRIPE_CONNECT_STATUS,
  loadBusinessStripeConnectStatus,
  saveBusinessStripeConnectStatus,
} from "@/lib/stripeConnect";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    const currentStatus = await loadBusinessStripeConnectStatus(business.id);

    if (currentStatus.usesPlatformStripe) {
      return apiError(
        "This business uses the platform Stripe account. To switch it, update the app Stripe configuration instead.",
        400
      );
    }

    await saveBusinessStripeConnectStatus(business.id, EMPTY_STRIPE_CONNECT_STATUS);

    return NextResponse.json(EMPTY_STRIPE_CONNECT_STATUS);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error disconnecting Stripe account:", error);
    return apiError("Could not disconnect Stripe", 500);
  }
}
