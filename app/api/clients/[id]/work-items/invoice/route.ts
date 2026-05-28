import { NextResponse } from "next/server";
import crypto from "crypto";
import { InvoiceStatus } from "@prisma/client";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getInvoiceSenderName } from "@/lib/business";
import { getDefaultDueDate, getTodayDateInputValue } from "@/lib/invoiceDates";
import { buildDefaultInvoiceMessage, buildDefaultInvoicePaymentNote } from "@/lib/invoiceLanguage";
import {
  calculateInvoiceTotals,
  formatDraftInvoiceNumber,
  normalizeInvoiceCurrency,
} from "@/lib/invoice";
import { logInvoiceEvent } from "@/lib/invoiceActivity";
import prisma from "@/lib/prisma";
import { getInvoiceVatConfigurationError } from "@/lib/vat";

type CreateDraftFromWorkItemsBody = {
  itemIds?: unknown;
  issueDate?: unknown;
  dueDate?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getClientFirstName(client: { contactName: string | null; companyName: string | null; email: string }): string {
  const rawName = client.contactName || client.companyName || client.email;
  return rawName.split(/\s+/)[0] || "there";
}

function buildInvoiceNotesFromSettings(
  client: { language: string; contactName: string | null; companyName: string | null; email: string },
  senderName: string,
  template?: string | null
): string {
  const trimmedTemplate = template?.trim();
  if (!trimmedTemplate) {
    return buildDefaultInvoiceMessage(
      client.language as "en" | "de" | "es" | "fr" | "it",
      getClientFirstName(client),
      senderName
    );
  }

  const clientFirstName = getClientFirstName(client);
  const senderFirstName = senderName.split(/\s+/).find(Boolean) || senderName;

  return trimmedTemplate
    .replaceAll("{client_first_name}", clientFirstName)
    .replaceAll("client_first_name", clientFirstName)
    .replaceAll("{sender_first_name}", senderFirstName)
    .replaceAll("sender_first_name", senderFirstName)
    .replaceAll("{sender_name}", senderName)
    .replaceAll("sender_name", senderName);
}

function getWorkItemInvoiceSubject(serviceDates: Date[]): string {
  if (serviceDates.length === 0) return "Unbilled work";

  const first = serviceDates[0];
  const sameMonth = serviceDates.every(
    (date) => date.getUTCFullYear() === first.getUTCFullYear() && date.getUTCMonth() === first.getUTCMonth()
  );

  if (!sameMonth) {
    return "Unbilled work";
  }

  return `Services ${new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first)}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as CreateDraftFromWorkItemsBody;
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((itemId): itemId is string => typeof itemId === "string" && itemId.trim().length > 0)
      : [];

    if (itemIds.length === 0) {
      return apiError("Select at least one work item", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        ownerName: true,
        invoiceSenderType: true,
        currency: true,
        vatRegistered: true,
        vatNumber: true,
        defaultPaymentTermDays: true,
        defaultInvoiceMessage: true,
        acceptsTwintPayments: true,
        twintPhoneNumber: true,
      },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { id, businessId: business.id },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        language: true,
      },
    });

    if (!client) {
      return apiError("Client not found", 404);
    }

    const workItems = await prisma.unbilledWorkItem.findMany({
      where: {
        id: { in: itemIds },
        clientId: client.id,
        businessId: business.id,
        status: "unbilled",
      },
      orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }],
    });

    if (workItems.length !== itemIds.length) {
      return apiError("Some selected work items are no longer unbilled", 409);
    }

    const issueDateValue = asString(body.issueDate) ?? getTodayDateInputValue();
    const dueDateValue = asString(body.dueDate) ?? getDefaultDueDate(issueDateValue, business.defaultPaymentTermDays);
    const issueDate = asDate(issueDateValue);
    const dueDate = asDate(dueDateValue);

    if (!issueDate || !dueDate) {
      return apiError("Invalid invoice dates", 400);
    }

    if (dueDate < issueDate) {
      return apiError("dueDate must be on or after issueDate", 400);
    }

    const lineItems = workItems.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const taxRate = business.vatRegistered ? item.taxRate : 0;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        total: lineSubtotal,
        lineSubtotal,
        taxValue: (lineSubtotal * taxRate) / 100,
      };
    });

    const vatConfigurationError = getInvoiceVatConfigurationError(lineItems, business);
    if (vatConfigurationError) {
      return apiError(vatConfigurationError, 400);
    }

    const computedTotals = calculateInvoiceTotals(lineItems);
    const senderName = getInvoiceSenderName(business);
    const notes = buildInvoiceNotesFromSettings(client, senderName, business.defaultInvoiceMessage);
    const paymentNote =
      business.acceptsTwintPayments && business.twintPhoneNumber?.trim()
        ? buildDefaultInvoicePaymentNote(
            client.language as "en" | "de" | "es" | "fr" | "it",
            business.twintPhoneNumber.trim()
          )
        : null;

    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          businessId: business.id,
          clientId: client.id,
          invoiceNumber: formatDraftInvoiceNumber(issueDate, crypto.randomUUID().slice(0, 6)),
          issuedAt: null,
          issueDate,
          dueDate,
          subject: getWorkItemInvoiceSubject(workItems.map((item) => item.serviceDate)),
          subtotal: computedTotals.subtotal,
          taxAmount: computedTotals.taxAmount,
          totalAmount: computedTotals.totalAmount,
          status: InvoiceStatus.draft,
          currency: normalizeInvoiceCurrency(business.currency, "CHF"),
          notes,
          paymentNote,
          publicToken: crypto.randomUUID(),
          lineItems: {
            create: lineItems.map((item, index) => ({
              position: index,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.total,
            })),
          },
        },
      });

      await tx.unbilledWorkItem.updateMany({
        where: {
          id: { in: workItems.map((item) => item.id) },
          status: "unbilled",
        },
        data: {
          status: "added_to_draft",
          invoiceId: createdInvoice.id,
        },
      });

      return createdInvoice;
    });

    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: "created",
      actor: user.email ?? "User",
      details: `Draft invoice created from ${workItems.length} unbilled work item${workItems.length === 1 ? "" : "s"}`,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating invoice from unbilled work:", error);
    return apiError("Server error", 500);
  }
}
