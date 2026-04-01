import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";
import { getStripeClient } from "@/lib/stripe";

type PortalBody = {
  returnPath?: unknown;
};

function getSafeReturnPath(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") ? value : fallback;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const body = (await request.json().catch(() => ({}))) as PortalBody;

    if (!business.stripeCustomerId) {
      return apiError("No billing customer exists for this workspace yet.", 409);
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: new URL(getSafeReturnPath(body.returnPath, "/settings"), request.url).toString(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error creating billing portal session:", error);
    return apiError("Server error", 500);
  }
}
