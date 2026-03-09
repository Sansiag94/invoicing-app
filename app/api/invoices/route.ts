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
      notes,
      lineItems // Added lineItems to the request destructuring
    } = await request.json();

    // Validate required fields
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

    // Validate line items
    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Invoice must contain at least one line item" },
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

    const publicToken = crypto.randomUUID();

    // Create invoice with nested line items
    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        clientId,
        invoiceNumber: `${clientId}-${new Date().getTime()}`, // Generating a basic invoice number; customize as needed
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxAmount,
        totalAmount,
        status,
        currency,
        notes,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          })),
        },
      },
      include: {
        lineItems: true // Include line items in the returned invoice
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}