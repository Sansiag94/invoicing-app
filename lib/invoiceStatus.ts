import prisma from "@/lib/prisma";

export const OPEN_INVOICE_STATUSES = ["draft", "sent", "overdue"] as const;
export const COLLECTIBLE_INVOICE_STATUSES = ["sent", "overdue"] as const;

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getOpenInvoiceStatus(dueDate: Date, today = new Date()): "sent" | "overdue" {
  return dueDate.getTime() < startOfLocalDay(today).getTime() ? "overdue" : "sent";
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
  const todayStart = startOfLocalDay();

  await prisma.$transaction([
    prisma.invoice.updateMany({
      where: {
        businessId,
        ...(invoiceId ? { id: invoiceId } : {}),
        status: "sent",
        dueDate: {
          lt: todayStart,
        },
      },
      data: {
        status: "overdue",
      },
    }),
    prisma.invoice.updateMany({
      where: {
        businessId,
        ...(invoiceId ? { id: invoiceId } : {}),
        status: "overdue",
        dueDate: {
          gte: todayStart,
        },
      },
      data: {
        status: "sent",
      },
    }),
  ]);
}
