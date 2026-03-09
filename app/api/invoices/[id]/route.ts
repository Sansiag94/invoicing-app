import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lineItems: true,
      business: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { status } = await request.json();

  // Update the invoice status
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(invoice);
}

export async function POST(request: Request) {
  try {
    const {
      userId,
      clientId,
      issueDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      status,
      currency,
      lineItems,
    } = await request.json();

    if (
      !userId ||
      !clientId ||
      !issueDate ||
      !dueDate ||
      subtotal === undefined ||
      taxAmount === undefined ||
      totalAmount === undefined ||
      !status ||
      !currency
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json(
        { error: "lineItems are required" },
        { status: 400 }
      );
    }

    const business = await prisma.business.findFirst({
      where: { userId },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const publicToken = crypto.randomUUID();

    const invoice = await prisma.$transaction(async (tx) => {
      const newCounter = business.invoiceCounter + 1;

      const prefix = client.name.substring(0, 3).toUpperCase();
      const paddedCounter = newCounter.toString().padStart(3, "0");
      const invoiceNumber = `${prefix}-${paddedCounter}`;

      await tx.business.update({
        where: { id: business.id },
        data: {
          invoiceCounter: newCounter,
        },
      });

      const createdInvoice = await tx.invoice.create({
        data: {
          businessId: business.id,
          clientId,
          invoiceNumber,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          subtotal,
          taxAmount,
          totalAmount,
          status,
          currency,
          publicToken: publicToken,
        },
      });

      await tx.lineItem.createMany({
        data: lineItems.map(item => ({
          invoiceId: createdInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.quantity * item.unitPrice,
        })),
      });

      return createdInvoice;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}