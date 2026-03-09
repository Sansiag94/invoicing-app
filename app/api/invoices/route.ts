import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { InvoiceStatus } from "@prisma/client";

type LineItemInput = {
  description: unknown;
  quantity: unknown;
  unitPrice: unknown;
  taxRate: unknown;
};

type CreateInvoiceBody = {
  userId: unknown;
  clientId: unknown;
  issueDate: unknown;
  dueDate: unknown;
  status?: unknown;
  currency?: unknown;
  notes?: unknown;
  lineItems?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatus(value: unknown): InvoiceStatus {
  if (typeof value !== "string") return InvoiceStatus.draft;
  return Object.values(InvoiceStatus).includes(value as InvoiceStatus)
    ? (value as InvoiceStatus)
    : InvoiceStatus.draft;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = asString(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error loading invoices:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateInvoiceBody;
    const userId = asString(body.userId);
    const clientId = asString(body.clientId);
    const issueDate = asDate(body.issueDate);
    const dueDate = asDate(body.dueDate);

    if (!userId || !clientId || !issueDate || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (dueDate < issueDate) {
      return NextResponse.json(
        { error: "dueDate must be on or after issueDate" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return NextResponse.json(
        { error: "Invoice must contain at least one line item" },
        { status: 400 }
      );
    }

    const parsedLineItems = body.lineItems
      .map((rawItem) => {
        const item = rawItem as LineItemInput;
        const description = asString(item.description);
        const quantity = asNumber(item.quantity);
        const unitPrice = asNumber(item.unitPrice);
        const taxRate = asNumber(item.taxRate);

        if (!description || quantity === null || unitPrice === null || taxRate === null) {
          return null;
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || unitPrice < 0 || taxRate < 0) {
          return null;
        }

        const lineSubtotal = quantity * unitPrice;
        const taxValue = lineSubtotal * (taxRate / 100);

        return {
          description,
          quantity,
          unitPrice,
          taxRate,
          total: lineSubtotal + taxValue,
          lineSubtotal,
          taxValue,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (parsedLineItems.length !== body.lineItems.length) {
      return NextResponse.json({ error: "Invalid lineItems payload" }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { userId },
      select: {
        id: true,
        currency: true,
        invoicePrefix: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        businessId: business.id,
      },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found for this business" },
        { status: 404 }
      );
    }

    const subtotal = parsedLineItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const taxAmount = parsedLineItems.reduce((sum, item) => sum + item.taxValue, 0);
    const totalAmount = subtotal + taxAmount;
    const selectedCurrency = asString(body.currency) ?? business.currency;
    const normalizedStatus = normalizeStatus(body.status);

    const invoice = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: business.id },
        data: { invoiceCounter: { increment: 1 } },
        select: {
          invoiceCounter: true,
          invoicePrefix: true,
        },
      });

      const prefix = updatedBusiness.invoicePrefix || "INV";
      const invoiceNumber = `${prefix}-${String(updatedBusiness.invoiceCounter).padStart(6, "0")}`;

      return tx.invoice.create({
        data: {
          businessId: business.id,
          clientId,
          invoiceNumber,
          issueDate,
          dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          status: normalizedStatus,
          currency: selectedCurrency,
          notes: asString(body.notes),
          publicToken: crypto.randomUUID(),
          lineItems: {
            create: parsedLineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.total,
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
