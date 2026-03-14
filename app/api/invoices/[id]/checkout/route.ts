import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { calculateInvoiceTotals } from "@/lib/invoice";

export const runtime = "nodejs";

type CheckoutBody = {
  token?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        publicToken: token,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        publicToken: true,
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

    const computedTotals = calculateInvoiceTotals(invoice.lineItems);
    const totalAmountDue = computedTotals.totalAmount > 0 ? computedTotals.totalAmount : invoice.totalAmount;
    const amountInMinorUnit = Math.round(totalAmountDue * 100);
    if (amountInMinorUnit <= 0) {
      return apiError("Invoice total must be greater than 0", 400);
    }

    const successUrl = new URL(`/invoice/pay/${invoice.publicToken}?success=true&session_id={CHECKOUT_SESSION_ID}`, request.url).toString();
    const cancelUrl = new URL(`/invoice/pay/${invoice.publicToken}?cancel=true`, request.url).toString();

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: invoice.id,
      metadata: {
        invoiceId: invoice.id,
        publicToken: invoice.publicToken,
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
    });

    if (!session.url) {
      return apiError("Could not create Stripe checkout session", 500);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return apiError("Server error", 500);
  }
}
