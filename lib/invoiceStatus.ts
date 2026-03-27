import prisma from "@/lib/prisma";

export function getOpenInvoiceStatus(dueDate: Date): "sent" | "overdue" {
  return dueDate.getTime() < Date.now() ? "overdue" : "sent";
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
