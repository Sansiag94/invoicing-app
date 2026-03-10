import prisma from "@/lib/prisma";

export async function markOverdueInvoicesForBusiness(
  businessId: string,
  invoiceId?: string
): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      businessId,
      ...(invoiceId ? { id: invoiceId } : {}),
      status: {
        in: ["draft", "sent"],
      },
      dueDate: {
        lt: new Date(),
      },
    },
    data: {
      status: "overdue",
    },
  });
}
