import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

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
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
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
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.publicToken) {
      return NextResponse.json({ error: "Invoice is missing payment token" }, { status: 400 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const amountInMinorUnit = Math.round(invoice.totalAmount * 100);
    if (amountInMinorUnit <= 0) {
      return NextResponse.json({ error: "Invoice total must be greater than 0" }, { status: 400 });
    }

    const successUrl = new URL(`/invoice/pay/${invoice.publicToken}?success=true`, request.url).toString();
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
      return NextResponse.json(
        { error: "Could not create Stripe checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
