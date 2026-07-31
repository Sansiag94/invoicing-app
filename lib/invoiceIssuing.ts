import prisma from "@/lib/prisma";
import { assertBusinessCanIssueInvoice } from "@/lib/billing";
import { logInvoiceEvent } from "@/lib/invoiceActivity";
import {
  deriveOfficialInvoicePrefix,
  formatSequentialInvoiceNumber,
  isDraftInvoiceNumber,
} from "@/lib/invoice";
import { getInvoiceVatConfigurationError } from "@/lib/vat";

export class InvoiceIssueError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "InvoiceIssueError";
    this.status = status;
  }
}

export function isInvoiceIssueError(error: unknown): error is InvoiceIssueError {
  return error instanceof InvoiceIssueError;
}

export async function issueDraftInvoice(input: {
  invoiceId: string;
  businessId: string;
  actor: string;
}) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, businessId: input.businessId },
    include: {
      business: true,
      client: {
        select: {
          companyName: true,
          contactName: true,
          email: true,
        },
      },
      lineItems: {
        select: {
          taxRate: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new InvoiceIssueError("Invoice not found", 404);
  }

  if (invoice.status === "cancelled") {
    throw new InvoiceIssueError("Cancelled invoices cannot be issued. Reopen the invoice first.", 400);
  }

  if (invoice.status !== "draft") {
    return {
      message: "Invoice is already issued.",
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  const invoiceNumber = invoice.invoiceNumber?.trim();
  if (!invoiceNumber) {
    throw new InvoiceIssueError("Invoice number is missing", 500);
  }

  const vatConfigurationError = getInvoiceVatConfigurationError(invoice.lineItems, invoice.business);
  if (vatConfigurationError) {
    throw new InvoiceIssueError(vatConfigurationError, 400);
  }

  await assertBusinessCanIssueInvoice(invoice.businessId);

  const issuedAt = invoice.issuedAt ?? new Date();

  const updated = await prisma.$transaction(async (tx) => {
    let officialInvoiceNumber = invoiceNumber;

    if (isDraftInvoiceNumber(invoiceNumber)) {
      const updatedBusiness = await tx.business.update({
        where: { id: invoice.businessId },
        data: { invoiceCounter: { increment: 1 } },
        select: { invoiceCounter: true },
      });

      officialInvoiceNumber = formatSequentialInvoiceNumber(
        deriveOfficialInvoicePrefix(
          invoice.client.companyName,
          invoice.client.contactName,
          invoice.client.email
        ),
        invoice.issueDate,
        updatedBusiness.invoiceCounter
      );
    }

    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceNumber: officialInvoiceNumber,
        status: "issued",
        issuedAt,
        scheduledSendAt: null,
        scheduledSendFailure: null,
      },
      select: {
        invoiceNumber: true,
        status: true,
      },
    });
  });

  await logInvoiceEvent({
    invoiceId: invoice.id,
    type: "issued",
    actor: input.actor,
    details: `Invoice ${updated.invoiceNumber} created as a final invoice`,
  });

  return {
    message: "Invoice created. Next: send it now, schedule it, or download the PDF.",
    status: updated.status,
    invoiceNumber: updated.invoiceNumber,
  };
}
