import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: { userId }
  });

  if (!business) {
    console.error("Business not found for user:", userId);
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(invoices);
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
      where: { userId }
    });

    if (!business) {
      console.error("Business not found for user:", userId);
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Fetch the client to determine the prefix name
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const clientName = client.companyName || client.contactName || "INV"; // Determine prefix name
    const prefix = clientName.substring(0, 3).toUpperCase(); // Generate prefix

    const newCounter = business.invoiceCounter + 1;
    const paddedCounter = newCounter.toString().padStart(3, "0");
    const invoiceNumber = `${prefix}-${paddedCounter}`;

    const publicToken = crypto.randomUUID();

    const invoice = await prisma.$transaction(async (tx) => {
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