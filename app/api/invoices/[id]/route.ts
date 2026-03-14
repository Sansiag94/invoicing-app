import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { calculateInvoiceTotals } from "@/lib/invoice";
import { listInvoiceEvents, logInvoiceEvent } from "@/lib/invoiceActivity";

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
  subject?: unknown;
  reference?: unknown;
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
      return apiError("Invoice not found", 404);
    }

    await markOverdueInvoicesForBusiness(businessId, id);

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        client: true,
        lineItems: true,
        business: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    const computedTotals = calculateInvoiceTotals(invoice.lineItems);
    const events = await listInvoiceEvents(invoice.id);

    return NextResponse.json({
      ...invoice,
      subtotal: computedTotals.subtotal,
      taxAmount: computedTotals.taxAmount,
      totalAmount: computedTotals.totalAmount,
      events,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading invoice:", error);
    return apiError("Server error", 500);
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
      return apiError("Invoice not found", 404);
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      select: {
        id: true,
        issueDate: true,
        dueDate: true,
        subject: true,
        reference: true,
        notes: true,
        lineItems: {
          select: { id: true },
        },
      },
    });

    if (!existingInvoice) {
      return apiError("Invoice not found", 404);
    }

    const body = (await request.json()) as UpdateInvoiceBody;
    const issueDate =
      body.issueDate === undefined ? existingInvoice.issueDate : asDate(body.issueDate);
    const dueDate =
      body.dueDate === undefined ? existingInvoice.dueDate : asDate(body.dueDate);

    if (!issueDate || !dueDate) {
      return apiError("Invalid issueDate or dueDate", 400);
    }

    if (dueDate < issueDate) {
      return apiError("dueDate must be on or after issueDate", 400);
    }

    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return apiError("Invoice must contain at least one line item", 400);
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
        const taxRateRaw = asNumber(item.taxRate);
        const taxRate = taxRateRaw === null ? 0 : taxRateRaw;

        if (!description || quantity === null || unitPrice === null) {
          return null;
        }

        if (quantity <= 0 || unitPrice < 0 || taxRate < 0) {
          return null;
        }

        const lineSubtotal = quantity * unitPrice;
        return {
          id: lineItemId,
          description,
          quantity,
          unitPrice,
          taxRate,
          total: lineSubtotal,
          lineSubtotal,
          lineTaxAmount: (lineSubtotal * taxRate) / 100,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (parsedLineItems.length !== body.lineItems.length) {
      return apiError("Invalid lineItems payload", 400);
    }

    const computedTotals = calculateInvoiceTotals(parsedLineItems);
    const subtotal = computedTotals.subtotal;
    const taxAmount = computedTotals.taxAmount;
    const totalAmount = computedTotals.totalAmount;
    const subject =
      body.subject === undefined ? existingInvoice.subject : asNullableString(body.subject);
    const reference =
      body.reference === undefined ? existingInvoice.reference : asNullableString(body.reference);
    const notes =
      body.notes === undefined ? existingInvoice.notes : asNullableString(body.notes);

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          issueDate,
          dueDate,
          subject,
          reference,
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
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    if (!updatedInvoice) {
      return apiError("Invoice not found", 404);
    }

    const updatedTotals = calculateInvoiceTotals(updatedInvoice.lineItems);
    await logInvoiceEvent({
      invoiceId: updatedInvoice.id,
      type: "edited",
      actor: (await getAuthenticatedUser(request)).email ?? "User",
      details: "Invoice content updated",
    });
    const events = await listInvoiceEvents(updatedInvoice.id);

    return NextResponse.json({
      ...updatedInvoice,
      subtotal: updatedTotals.subtotal,
      taxAmount: updatedTotals.taxAmount,
      totalAmount: updatedTotals.totalAmount,
      events,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating invoice:", error);
    return apiError("Server error", 500);
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
      return apiError("Invoice not found", 404);
    }

    const deleted = await prisma.invoice.deleteMany({
      where: {
        id,
        businessId,
      },
    });

    if (deleted.count === 0) {
      return apiError("Invoice not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error deleting invoice:", error);
    return apiError("Server error", 500);
  }
}
