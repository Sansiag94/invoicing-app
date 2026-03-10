import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";

type UpdateLineItemInput = {
  id?: unknown;
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  taxRate?: unknown;
};

type UpdateInvoiceBody = {
  issueDate?: unknown;
  dueDate?: unknown;
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
  if (!value) {
    return null;
  }

  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getBusinessId(request: Request): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  return business?.id ?? null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await markOverdueInvoicesForBusiness(businessId, id);

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
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
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error loading invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      select: {
        id: true,
        issueDate: true,
        dueDate: true,
        notes: true,
        lineItems: {
          select: { id: true },
        },
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateInvoiceBody;
    const issueDate =
      body.issueDate === undefined ? existingInvoice.issueDate : asDate(body.issueDate);
    const dueDate =
      body.dueDate === undefined ? existingInvoice.dueDate : asDate(body.dueDate);

    if (!issueDate || !dueDate) {
      return NextResponse.json({ error: "Invalid issueDate or dueDate" }, { status: 400 });
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

    const existingLineItemIds = new Set(existingInvoice.lineItems.map((item) => item.id));
    const usedLineItemIds = new Set<string>();

    const parsedLineItems = body.lineItems
      .map((rawItem) => {
        const item = rawItem as UpdateLineItemInput;
        const lineItemId = asString(item.id);

        if (lineItemId) {
          if (!existingLineItemIds.has(lineItemId) || usedLineItemIds.has(lineItemId)) {
            return null;
          }
          usedLineItemIds.add(lineItemId);
        }

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
        const lineTaxAmount = lineSubtotal * (taxRate / 100);

        return {
          id: lineItemId,
          description,
          quantity,
          unitPrice,
          taxRate,
          total: lineSubtotal,
          lineSubtotal,
          lineTaxAmount,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (parsedLineItems.length !== body.lineItems.length) {
      return NextResponse.json({ error: "Invalid lineItems payload" }, { status: 400 });
    }

    const subtotal = parsedLineItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const taxAmount = parsedLineItems.reduce((sum, item) => sum + item.lineTaxAmount, 0);
    const totalAmount = subtotal + taxAmount;
    const notes =
      body.notes === undefined ? existingInvoice.notes : asNullableString(body.notes);

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          issueDate,
          dueDate,
          notes,
          subtotal,
          taxAmount,
          totalAmount,
        },
      });

      const updatedItems = parsedLineItems.filter((item) => item.id);
      const createdItems = parsedLineItems.filter((item) => !item.id);
      const keptItemIds = updatedItems.map((item) => item.id as string);

      if (keptItemIds.length > 0) {
        await tx.lineItem.deleteMany({
          where: {
            invoiceId: existingInvoice.id,
            id: { notIn: keptItemIds },
          },
        });
      } else {
        await tx.lineItem.deleteMany({
          where: {
            invoiceId: existingInvoice.id,
          },
        });
      }

      for (const item of updatedItems) {
        await tx.lineItem.update({
          where: { id: item.id as string },
          data: {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          },
        });
      }

      if (createdItems.length > 0) {
        await tx.lineItem.createMany({
          data: createdItems.map((item) => ({
            invoiceId: existingInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          })),
        });
      }

      return tx.invoice.findFirst({
        where: { id: existingInvoice.id, businessId },
        include: {
          client: true,
          lineItems: true,
          business: true,
        },
      });
    });

    if (!updatedInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const deleted = await prisma.invoice.deleteMany({
      where: {
        id,
        businessId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
