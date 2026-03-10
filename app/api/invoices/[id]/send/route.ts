import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  isEmailConfigurationError,
  isEmailDeliveryError,
  sendInvoiceEmail,
} from "@/lib/email";
import crypto from "crypto";

export const runtime = "nodejs";

async function sendInvoice(id: string, businessId: string, request: Request) {
  const existingInvoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      invoiceNumber: true,
      publicToken: true,
      client: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!existingInvoice) {
    console.warn("[invoice-send] Invoice not found", { invoiceId: id, businessId });
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const invoiceNumber = existingInvoice.invoiceNumber?.trim();
  if (!invoiceNumber) {
    console.error("[invoice-send] Missing invoice number", { invoiceId: existingInvoice.id });
    return NextResponse.json({ error: "Invoice number is missing" }, { status: 500 });
  }

  const clientEmail = existingInvoice.client.email?.trim();
  if (!clientEmail) {
    console.warn("[invoice-send] Client email missing", { invoiceId: existingInvoice.id });
    return NextResponse.json({ error: "Client email is missing" }, { status: 400 });
  }

  let publicToken = existingInvoice.publicToken;

  if (!publicToken) {
    const updatedInvoice = await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: { publicToken: crypto.randomUUID() },
      select: { publicToken: true },
    });

    publicToken = updatedInvoice.publicToken;
  }

  if (!publicToken) {
    console.error("[invoice-send] Public token generation failed", { invoiceId: existingInvoice.id });
    return NextResponse.json({ error: "Unable to generate invoice link" }, { status: 500 });
  }

  const invoiceLink = new URL(`/invoice/pay/${publicToken}`, request.url).toString();
  console.log("[invoice-send] Sending invoice email", {
    clientEmail,
    invoiceNumber,
    invoiceLink,
  });

  await sendInvoiceEmail({
    to: clientEmail,
    invoiceNumber,
    invoiceLink,
  });

  await prisma.invoice.update({
    where: { id: existingInvoice.id },
    data: { status: "sent" },
  });

  console.log("[invoice-send] Invoice email sent and status updated", {
    invoiceId: existingInvoice.id,
    invoiceNumber,
    clientEmail,
  });

  return NextResponse.json({ message: "Invoice sent" });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return await sendInvoice(id, business.id, request);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (isEmailConfigurationError(error)) {
      console.error("Error sending invoice: email configuration missing", error);
      return NextResponse.json(
        { error: "Email provider not configured. Set RESEND_API_KEY." },
        { status: 500 }
      );
    }

    if (isEmailDeliveryError(error)) {
      console.error("Error sending invoice: email delivery failed", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Error sending invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
