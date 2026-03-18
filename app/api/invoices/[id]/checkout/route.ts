import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { calculateInvoiceTotals } from "@/lib/invoice";
import { recordStripePaymentFromSession } from "@/lib/stripePayments";
import {
  getStripeRequestOptions,
  isStripeCardPaymentAvailable,
  loadResolvedBusinessStripeStatus,
  type BusinessStripeConnectStatus,
} from "@/lib/stripeConnect";
import {
  buildPendingStripeCheckoutSessionId,
  getStripeCheckoutLockExpiresAt,
  hasActiveStripeCheckoutSession,
  isPendingStripeCheckoutSessionId,
  toStripeCheckoutSessionExpiry,
} from "@/lib/stripeCheckout";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

type CheckoutBody = {
  token?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function reuseExistingCheckoutSession(input: {
  stripe: Stripe;
  invoiceId: string;
  stripeStatus: BusinessStripeConnectStatus;
  sessionId: string;
}) {
  const session = await input.stripe.checkout.sessions.retrieve(
    input.sessionId,
    getStripeRequestOptions(input.stripeStatus)
  );

  if (session.payment_status === "paid") {
    await recordStripePaymentFromSession(session);
    return { type: "paid" as const };
  }

  if (session.status === "open" && session.url) {
    return { type: "reused" as const, url: session.url };
  }

  await prisma.invoice.updateMany({
    where: {
      id: input.invoiceId,
      stripeCheckoutSessionId: input.sessionId,
    },
    data: {
      stripeCheckoutSessionId: null,
      stripeCheckoutSessionExpiresAt: null,
    },
  });

  return { type: "expired" as const };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CheckoutBody;
    const token = asString(body.token);

    if (!token) {
      return apiError("Token is required", 400);
    }

    await assertRateLimit({
      request,
      route: "public-invoice-checkout",
      limit: 12,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, id, token, "checkout"),
    });

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        publicToken: token,
      },
      select: {
        id: true,
        businessId: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        publicToken: true,
        stripeCheckoutSessionId: true,
        stripeCheckoutSessionExpiresAt: true,
        lineItems: {
          select: {
            quantity: true,
            unitPrice: true,
            taxRate: true,
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    if (!invoice.publicToken) {
      return apiError("Invoice is missing payment token", 400);
    }

    if (invoice.status === "paid") {
      return apiError("Invoice is already paid", 400);
    }

    const stripeStatus = await loadResolvedBusinessStripeStatus(invoice.businessId);
    if (!isStripeCardPaymentAvailable(stripeStatus)) {
      return apiError("Online card payments are not enabled for this business", 400);
    }

    const computedTotals = calculateInvoiceTotals(invoice.lineItems);
    const totalAmountDue =
      computedTotals.totalAmount > 0 ? computedTotals.totalAmount : invoice.totalAmount;
    const amountInMinorUnit = Math.round(totalAmountDue * 100);
    if (amountInMinorUnit <= 0) {
      return apiError("Invoice total must be greater than 0", 400);
    }

    const successUrl = new URL(
      `/invoice/pay/${invoice.publicToken}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      request.url
    ).toString();
    const cancelUrl = new URL(
      `/invoice/pay/${invoice.publicToken}?cancel=true`,
      request.url
    ).toString();

    const stripe = getStripeClient();
    const now = new Date();

    if (
      hasActiveStripeCheckoutSession(
        invoice.stripeCheckoutSessionId,
        invoice.stripeCheckoutSessionExpiresAt,
        now
      )
    ) {
      if (isPendingStripeCheckoutSessionId(invoice.stripeCheckoutSessionId)) {
        return apiError("A payment session is being prepared. Please try again in a moment.", 409);
      }

      const reusedSession = await reuseExistingCheckoutSession({
        stripe,
        invoiceId: invoice.id,
        stripeStatus,
        sessionId: invoice.stripeCheckoutSessionId!,
      });

      if (reusedSession.type === "reused") {
        return NextResponse.json({ url: reusedSession.url });
      }

      if (reusedSession.type === "paid") {
        return apiError("Invoice is already paid", 400);
      }
    }

    const checkoutLockId = buildPendingStripeCheckoutSessionId();
    const checkoutLockExpiresAt = getStripeCheckoutLockExpiresAt(now);
    const claimedInvoice = await prisma.invoice.updateMany({
      where: {
        id: invoice.id,
        status: {
          not: "paid",
        },
        OR: [
          { stripeCheckoutSessionId: null },
          { stripeCheckoutSessionExpiresAt: null },
          { stripeCheckoutSessionExpiresAt: { lte: now } },
        ],
      },
      data: {
        stripeCheckoutSessionId: checkoutLockId,
        stripeCheckoutSessionExpiresAt: checkoutLockExpiresAt,
      },
    });

    if (claimedInvoice.count === 0) {
      const lockedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        select: {
          status: true,
          stripeCheckoutSessionId: true,
          stripeCheckoutSessionExpiresAt: true,
        },
      });

      if (!lockedInvoice) {
        return apiError("Invoice not found", 404);
      }

      if (lockedInvoice.status === "paid") {
        return apiError("Invoice is already paid", 400);
      }

      if (
        hasActiveStripeCheckoutSession(
          lockedInvoice.stripeCheckoutSessionId,
          lockedInvoice.stripeCheckoutSessionExpiresAt,
          new Date()
        )
      ) {
        if (isPendingStripeCheckoutSessionId(lockedInvoice.stripeCheckoutSessionId)) {
          return apiError("A payment session is being prepared. Please try again in a moment.", 409);
        }

        const reusedSession = await reuseExistingCheckoutSession({
          stripe,
          invoiceId: invoice.id,
          stripeStatus,
          sessionId: lockedInvoice.stripeCheckoutSessionId!,
        });

        if (reusedSession.type === "reused") {
          return NextResponse.json({ url: reusedSession.url });
        }

        if (reusedSession.type === "paid") {
          return apiError("Invoice is already paid", 400);
        }
      }
    }

    let session: Stripe.Checkout.Session | null = null;

    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: invoice.id,
          metadata: {
            invoiceId: invoice.id,
            publicToken: invoice.publicToken,
            businessId: invoice.businessId,
            checkoutNonce: crypto.randomUUID(),
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: invoice.currency.toLowerCase(),
                unit_amount: amountInMinorUnit,
                product_data: {
                  name: `Invoice ${invoice.invoiceNumber}`,
                  description: `Payment for invoice ${invoice.invoiceNumber}`,
                },
              },
            },
          ],
        },
        getStripeRequestOptions(stripeStatus)
      );

      const savedSession = await prisma.invoice.updateMany({
        where: {
          id: invoice.id,
          stripeCheckoutSessionId: checkoutLockId,
        },
        data: {
          stripeCheckoutSessionId: session.id,
          stripeCheckoutSessionExpiresAt: toStripeCheckoutSessionExpiry(
            session.expires_at,
            checkoutLockExpiresAt
          ),
        },
      });

      if (savedSession.count === 0) {
        if (session.status === "open") {
          try {
            await stripe.checkout.sessions.expire(
              session.id,
              getStripeRequestOptions(stripeStatus)
            );
          } catch (expireError) {
            console.error("Error expiring orphaned checkout session:", expireError);
          }
        }

        return apiError("Could not create Stripe checkout session", 500);
      }
    } catch (error) {
      await prisma.invoice.updateMany({
        where: {
          id: invoice.id,
          stripeCheckoutSessionId: checkoutLockId,
        },
        data: {
          stripeCheckoutSessionId: null,
          stripeCheckoutSessionExpiresAt: null,
        },
      });
      throw error;
    }

    if (!session?.url) {
      return apiError("Could not create Stripe checkout session", 500);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    console.error("Error creating checkout session:", error);
    return apiError("Server error", 500);
  }
}
