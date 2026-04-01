import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { InvoiceStatus } from "@prisma/client";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { logInvoiceEvent } from "@/lib/invoiceActivity";
import { assertBusinessCanIssueInvoice, isBillingLimitError } from "@/lib/billing";
import {
  calculateInvoiceTotals,
  deriveOfficialInvoicePrefix,
  formatDraftInvoiceNumber,
  formatSequentialInvoiceNumber,
  isSupportedInvoiceCurrency,
  isDraftInvoiceNumber,
  normalizeInvoiceCurrency,
} from "@/lib/invoice";

type LineItemInput = {
  description: unknown;
  quantity: unknown;
  unitPrice: unknown;
  taxRate: unknown;
};

type CreateInvoiceBody = {
  clientId: unknown;
  issueDate: unknown;
  dueDate: unknown;
  subject?: unknown;
  reference?: unknown;
  status?: unknown;
  currency?: unknown;
  notes?: unknown;
  paymentNote?: unknown;
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
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    await markOverdueInvoicesForBusiness(business.id);

    const invoices = await prisma.invoice.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
          },
        },
        lineItems: {
          select: {
            quantity: true,
            unitPrice: true,
            taxRate: true,
          },
        },
      },
    });

    const invoicesWithComputedTotals = invoices.map((invoice) => {
      const { lineItems, ...invoiceData } = invoice;
      const totals = calculateInvoiceTotals(lineItems);

      return {
        ...invoiceData,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      };
    });

    return NextResponse.json(invoicesWithComputedTotals);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading invoices:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as CreateInvoiceBody;
    const clientId = asString(body.clientId);
    const issueDate = asDate(body.issueDate);
    const dueDate = asDate(body.dueDate);
    const subject = asString(body.subject);
    const reference = asString(body.reference);
    const paymentNote = asString(body.paymentNote);

    if (!clientId || !issueDate || !dueDate) {
      return apiError("Missing required fields", 400);
    }

    if (dueDate < issueDate) {
      return apiError("dueDate must be on or after issueDate", 400);
    }

    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return apiError("Invoice must contain at least one line item", 400);
    }

    const parsedLineItems = body.lineItems
      .map((rawItem) => {
        const item = rawItem as LineItemInput;
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
          description,
          quantity,
          unitPrice,
          taxRate,
          total: lineSubtotal,
          lineSubtotal,
          taxValue: (lineSubtotal * taxRate) / 100,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (parsedLineItems.length !== body.lineItems.length) {
      return apiError("Invalid lineItems payload", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        currency: true,
      },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        businessId: business.id,
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
      },
    });

    if (!client) {
      return apiError("Client not found for this business", 404);
    }

    const computedTotals = calculateInvoiceTotals(parsedLineItems);
    const subtotal = computedTotals.subtotal;
    const taxAmount = computedTotals.taxAmount;
    const totalAmount = computedTotals.totalAmount;
    const requestedCurrency = asString(body.currency);
    if (requestedCurrency && !isSupportedInvoiceCurrency(requestedCurrency.toUpperCase())) {
      return apiError("currency must be CHF or EUR", 400);
    }

    const fallbackBusinessCurrency = normalizeInvoiceCurrency(business.currency, "CHF");
    const selectedCurrency = normalizeInvoiceCurrency(
      requestedCurrency ? requestedCurrency.toUpperCase() : fallbackBusinessCurrency,
      "CHF"
    );

    const normalizedStatus = normalizeStatus(body.status);
    if (normalizedStatus !== InvoiceStatus.draft) {
      await assertBusinessCanIssueInvoice(business.id);
    }

    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        clientId,
        invoiceNumber: formatDraftInvoiceNumber(issueDate, crypto.randomUUID().slice(0, 6)),
        issuedAt: normalizedStatus === InvoiceStatus.draft ? null : new Date(),
        issueDate,
        dueDate,
        subject,
        reference,
        subtotal,
        taxAmount,
        totalAmount,
        status: normalizedStatus,
        currency: selectedCurrency,
        notes: asString(body.notes),
        paymentNote,
        publicToken: crypto.randomUUID(),
        lineItems: {
          create: parsedLineItems.map((item, index) => ({
            position: index,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          })),
        },
      },
      include: {
        lineItems: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (normalizedStatus !== InvoiceStatus.draft && isDraftInvoiceNumber(invoice.invoiceNumber)) {
      const updatedBusiness = await prisma.business.update({
        where: { id: business.id },
        data: { invoiceCounter: { increment: 1 } },
        select: { invoiceCounter: true },
      });
      const officialInvoiceNumber = formatSequentialInvoiceNumber(
        deriveOfficialInvoicePrefix(client.companyName, client.contactName, client.email),
        issueDate,
        updatedBusiness.invoiceCounter
      );
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { invoiceNumber: officialInvoiceNumber },
      });
      invoice.invoiceNumber = officialInvoiceNumber;
    }

    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: "created",
      actor: user.email ?? "User",
      details:
        normalizedStatus === InvoiceStatus.draft
          ? "Draft invoice created"
          : `Invoice ${invoice.invoiceNumber} created`,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (isBillingLimitError(error)) {
      return apiError(error.message, error.status, {
        code: "payment_required",
        details: error.details,
      });
    }

    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating invoice:", error);
    return apiError("Server error", 500);
  }
}
