import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getOpenInvoiceStatus } from "@/lib/invoiceStatus";

type UpdateInvoiceStatusBody = {
  status?: unknown;
};

function asStatus(value: unknown): "paid" | "unpaid" | null {
  return value === "paid" || value === "unpaid" ? value : null;
}

async function getBusinessId(request: Request): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  return business?.id ?? null;
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

    const body = (await request.json()) as UpdateInvoiceStatusBody;
    const nextStatus = asStatus(body.status);

    if (!nextStatus) {
      return apiError("Invalid status", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        payments: {
          select: {
            id: true,
            provider: true,
            status: true,
            reference: true,
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    if (nextStatus === "paid") {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "paid" },
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
            lineItems: true,
            business: true,
          },
        });
      });

      return NextResponse.json(updated);
    }

    const hasExternalSettledPayment = invoice.payments.some(
      (payment) =>
        payment.reference !== "manual-status" &&
        (payment.status === "paid" || payment.status === "succeeded")
    );

    if (hasExternalSettledPayment) {
      return apiError("This invoice has a confirmed payment and cannot be marked unpaid manually.", 409);
    }

    const reopenedStatus = getOpenInvoiceStatus(invoice.dueDate);

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
        data: { status: reopenedStatus },
      });

      return tx.invoice.findFirst({
        where: { id: invoice.id, businessId },
        include: {
          client: true,
          lineItems: true,
          business: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating invoice status:", error);
    return apiError("Server error", 500);
  }
}
