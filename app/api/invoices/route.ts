import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({ where: { userId } });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
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

      return await tx.invoice.create({
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
        },
      });
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}