import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getBusinessBillingStatus } from "@/lib/billing";
import { getStripeProMonthlyPriceId } from "@/lib/env";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const billingStatus = await getBusinessBillingStatus(business.id);

    return NextResponse.json({
      ...billingStatus,
      checkoutAvailable: Boolean(getStripeProMonthlyPriceId()),
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error loading billing status:", error);
    return apiError("Server error", 500);
  }
}
