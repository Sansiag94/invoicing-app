import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import {
  loadBusinessStripeConnectStatus,
  refreshBusinessStripeConnectStatus,
} from "@/lib/stripeConnect";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    const currentStatus = await loadBusinessStripeConnectStatus(business.id);
    const status = currentStatus.stripeAccountId
      ? await refreshBusinessStripeConnectStatus(business.id)
      : currentStatus;

    return NextResponse.json(status);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading Stripe Connect status:", error);
    return apiError("Could not load Stripe status", 500);
  }
}
