import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getOpenInvoiceStatus } from "@/lib/invoiceStatus";
import { listInvoiceEvents, logInvoiceEvent } from "@/lib/invoiceActivity";
import { assertBusinessCanIssueInvoice, isBillingLimitError } from "@/lib/billing";
import {
  deriveOfficialInvoicePrefix,
  formatSequentialInvoiceNumber,
  isDraftInvoiceNumber,
} from "@/lib/invoice";
import { getInvoiceVatConfigurationError } from "@/lib/vat";

type UpdateInvoiceStatusBody = {
  status?: unknown;
};

type InvoiceStatusAction = "paid" | "unpaid" | "cancelled";

function asStatus(value: unknown): InvoiceStatusAction | null {
  return value === "paid" || value === "unpaid" || value === "cancelled" ? value : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true, vatRegistered: true, vatNumber: true },
    });
    const businessId = business?.id ?? null;

    if (!businessId) {
      return apiError("Invoice not found", 404);
    }

    const body = (await request.json()) as UpdateInvoiceStatusBody;
    const nextStatus = asStatus(body.status);

    if (!nextStatus) {
      return apiError("Invalid status", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
          },
        },
        payments: {
          select: {
            id: true,
            provider: true,
            status: true,
            reference: true,
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
      return apiError("Invoice not found", 404);
    }

    if (nextStatus === "paid") {
      if (invoice.status === "cancelled") {
        return apiError("Cancelled invoices must be reopened before they can be marked paid.", 409);
      }

      if (invoice.status === "draft") {
        const vatConfigurationError = getInvoiceVatConfigurationError(invoice.lineItems, business!);
        if (vatConfigurationError) {
          return apiError(vatConfigurationError, 400);
        }

        await assertBusinessCanIssueInvoice(businessId);
      }

      const updated = await prisma.$transaction(async (tx) => {
        let officialInvoiceNumber = invoice.invoiceNumber;
        const issuedAt =
          invoice.status === "draft" ? invoice.issuedAt ?? new Date() : invoice.issuedAt;

        if (isDraftInvoiceNumber(invoice.invoiceNumber)) {
          const updatedBusiness = await tx.business.update({
            where: { id: businessId },
            data: { invoiceCounter: { increment: 1 } },
            select: {
              invoiceCounter: true,
            },
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

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "paid",
            invoiceNumber: officialInvoiceNumber,
            issuedAt,
            stripeCheckoutSessionId: null,
            stripeCheckoutSessionExpiresAt: null,
          },
        });

        const hasManualPayment = invoice.payments.some(
          (payment) =>
            payment.provider === "bank_transfer" && payment.reference === "manual-status"
        );

        if (!hasManualPayment) {
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              provider: "bank_transfer",
              amount: invoice.totalAmount,
              currency: invoice.currency,
              status: "manual_paid",
              reference: "manual-status",
            },
          });
        }

        return tx.invoice.findFirst({
          where: { id: invoice.id, businessId },
          include: {
            client: true,
            lineItems: {
              orderBy: { position: "asc" },
            },
            business: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        });
      });

      if (updated) {
        await logInvoiceEvent({
          invoiceId: invoice.id,
          type: "paid",
          actor: user.email ?? "User",
          details: "Marked paid manually",
        });
      }

      const events = updated ? await listInvoiceEvents(updated.id) : [];
      return NextResponse.json(updated ? { ...updated, events } : updated);
    }

    if (nextStatus === "cancelled") {
      if (invoice.status === "draft") {
        return apiError("Draft invoices can be deleted or edited instead of cancelled.", 400);
      }

      if (invoice.status === "paid") {
        return apiError("Paid invoices cannot be cancelled manually.", 409);
      }

      if (invoice.status === "cancelled") {
        return apiError("Invoice is already cancelled", 400);
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "cancelled",
            stripeCheckoutSessionId: null,
            stripeCheckoutSessionExpiresAt: null,
          },
        });

        return tx.invoice.findFirst({
          where: { id: invoice.id, businessId },
          include: {
            client: true,
            lineItems: {
              orderBy: { position: "asc" },
            },
            business: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        });
      });

      if (updated) {
        await logInvoiceEvent({
          invoiceId: invoice.id,
          type: "cancelled",
          actor: user.email ?? "User",
          details: "Invoice cancelled. No payment is due.",
        });
      }

      const events = updated ? await listInvoiceEvents(updated.id) : [];
      return NextResponse.json(updated ? { ...updated, events } : updated);
    }

    const hasExternalSettledPayment = invoice.payments.some(
      (payment) =>
        payment.reference !== "manual-status" &&
        (payment.status === "paid" || payment.status === "succeeded")
    );

    if (hasExternalSettledPayment) {
      return apiError(
        "This invoice has a confirmed payment and cannot be marked unpaid manually.",
        409
      );
    }

    const reopenedStatus = getOpenInvoiceStatus(invoice.dueDate);
    const reopenedFromCancelled = invoice.status === "cancelled";

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: {
          invoiceId: invoice.id,
          provider: "bank_transfer",
          reference: "manual-status",
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: reopenedStatus,
          stripeCheckoutSessionId: null,
          stripeCheckoutSessionExpiresAt: null,
        },
      });

      return tx.invoice.findFirst({
        where: { id: invoice.id, businessId },
        include: {
          client: true,
          lineItems: {
            orderBy: { position: "asc" },
          },
          business: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    if (updated) {
      await logInvoiceEvent({
        invoiceId: invoice.id,
        type: "reopened",
        actor: user.email ?? "User",
        details: reopenedFromCancelled
          ? `Invoice reopened from cancelled to ${reopenedStatus}`
          : `Invoice reopened as ${reopenedStatus}`,
      });
    }

    const events = updated ? await listInvoiceEvents(updated.id) : [];
    return NextResponse.json(updated ? { ...updated, events } : updated);
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

    console.error("Error updating invoice status:", error);
    return apiError("Server error", 500);
  }
}
