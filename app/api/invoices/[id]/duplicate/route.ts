import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { InvoiceStatus } from "@prisma/client";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  calculateInvoiceTotals,
  deriveClientInvoicePrefix,
  formatSequentialInvoiceNumber,
} from "@/lib/invoice";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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
      select: {
        id: true,
      },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const sourceInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        businessId: business.id,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
          },
        },
        lineItems: true,
      },
    });

    if (!sourceInvoice) {
      return apiError("Invoice not found", 404);
    }

    const issueDate = new Date();
    issueDate.setUTCHours(0, 0, 0, 0);
    const originalIssueDate = new Date(sourceInvoice.issueDate);
    const originalDueDate = new Date(sourceInvoice.dueDate);
    const dayDelta = Math.max(
      0,
      Math.round((originalDueDate.getTime() - originalIssueDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const dueDate = addDays(issueDate, dayDelta);

    const totals = calculateInvoiceTotals(sourceInvoice.lineItems);

    const duplicatedInvoice = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: business.id },
        data: { invoiceCounter: { increment: 1 } },
        select: { invoiceCounter: true },
      });

      const clientDisplayName =
        sourceInvoice.client.companyName || sourceInvoice.client.contactName || sourceInvoice.client.email;
      const invoicePrefix = deriveClientInvoicePrefix(clientDisplayName);
      const invoiceNumber = formatSequentialInvoiceNumber(
        invoicePrefix,
        issueDate,
        updatedBusiness.invoiceCounter
      );

      return tx.invoice.create({
        data: {
          businessId: business.id,
          clientId: sourceInvoice.client.id,
          invoiceNumber,
          issueDate,
          dueDate,
          subject: sourceInvoice.subject,
          reference: null,
          status: InvoiceStatus.draft,
          currency: sourceInvoice.currency,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          notes: sourceInvoice.notes,
          publicToken: crypto.randomUUID(),
          lineItems: {
            create: sourceInvoice.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.total,
            })),
          },
        },
        include: {
          client: true,
          business: true,
          lineItems: true,
        },
      });
    });

    return NextResponse.json(duplicatedInvoice, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error duplicating invoice:", error);
    return apiError("Server error", 500);
  }
}
