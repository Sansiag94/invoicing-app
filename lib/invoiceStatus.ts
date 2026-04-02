import prisma from "@/lib/prisma";

export const OPEN_INVOICE_STATUSES = ["draft", "sent", "overdue"] as const;
export const COLLECTIBLE_INVOICE_STATUSES = ["sent", "overdue"] as const;

export function getOpenInvoiceStatus(dueDate: Date): "sent" | "overdue" {
  return dueDate.getTime() < Date.now() ? "overdue" : "sent";
}

export function isOpenInvoiceStatus(
  status: string
): status is (typeof OPEN_INVOICE_STATUSES)[number] {
  return OPEN_INVOICE_STATUSES.includes(status as (typeof OPEN_INVOICE_STATUSES)[number]);
}

export function isCollectibleInvoiceStatus(
  status: string
): status is (typeof COLLECTIBLE_INVOICE_STATUSES)[number] {
  return COLLECTIBLE_INVOICE_STATUSES.includes(
    status as (typeof COLLECTIBLE_INVOICE_STATUSES)[number]
  );
}

export function getInvoiceAmountDue(status: string, totalAmount: number): number {
  return status === "paid" || status === "cancelled" ? 0 : totalAmount;
}

export async function markOverdueInvoicesForBusiness(
  businessId: string,
  invoiceId?: string
): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      businessId,
      ...(invoiceId ? { id: invoiceId } : {}),
      status: "sent",
      dueDate: {
        lt: new Date(),
      },
    },
    data: {
      status: "overdue",
    },
  });
}
