import prisma from "@/lib/prisma";

export async function ensureBusiness(userId: string) {
  let business = await prisma.business.findFirst({
    where: { userId },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        userId,
        name: "My Business",
        address: "",
        country: "Switzerland",
        currency: "CHF",
        invoicePrefix: "INV",
        invoiceCounter: 0,
      },
    });
  }

  return business;
}