import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getStripeClient } from "@/lib/stripe";
import { recordStripePaymentFromSession } from "@/lib/stripePayments";
import {
  getStripeRequestOptions,
  isStripeCardPaymentAvailable,
  loadResolvedBusinessStripeStatus,
} from "@/lib/stripeConnect";

type ConfirmCheckoutBody = {
  sessionId?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as ConfirmCheckoutBody;
    const sessionId = asString(body.sessionId);

    if (!sessionId) {
      return apiError("Session ID is required", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { publicToken: token },
      select: { id: true, publicToken: true, status: true, businessId: true },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    const stripeStatus = await loadResolvedBusinessStripeStatus(invoice.businessId);
    if (!isStripeCardPaymentAvailable(stripeStatus)) {
      return apiError("Card payments are not configured for this business", 400);
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      getStripeRequestOptions(stripeStatus)
    );

    if (session.metadata?.publicToken !== invoice.publicToken) {
      return apiError("Checkout session does not match invoice", 400);
    }

    if (
      invoice.status === "paid" &&
      typeof session.payment_intent === "string" &&
      session.payment_status === "paid"
    ) {
      return NextResponse.json({
        ok: true,
        status: invoice.status,
      });
    }

    await recordStripePaymentFromSession(session);

    const refreshedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      select: { status: true },
    });

    return NextResponse.json({
      ok: true,
      status: refreshedInvoice?.status ?? invoice.status,
    });
  } catch (error) {
    console.error("Error confirming Stripe checkout session:", error);
    return apiError("Could not confirm payment", 500);
  }
}
