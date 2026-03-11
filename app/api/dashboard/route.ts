import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";

function getMonthRange(today: Date): { startOfMonth: Date; startOfNextMonth: Date } {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return { startOfMonth, startOfNextMonth };
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true, currency: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    await markOverdueInvoicesForBusiness(business.id);

    const now = new Date();
    const { startOfMonth, startOfNextMonth } = getMonthRange(now);

    const [
      revenueThisMonthAggregate,
      totalRevenueAggregate,
      openInvoices,
      paidInvoices,
      overdueInvoices,
      clientCount,
      invoiceCount,
      recentInvoicesRaw,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          businessId: business.id,
          status: "paid",
          issueDate: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId: business.id,
          status: "paid",
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
          status: {
            in: ["draft", "sent"],
          },
        },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
          status: "paid",
        },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
          status: "overdue",
        },
      }),
      prisma.client.count({
        where: {
          businessId: business.id,
        },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
        },
      }),
      prisma.invoice.findMany({
        where: {
          businessId: business.id,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          currency: true,
          client: {
            select: {
              companyName: true,
              contactName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const recentInvoices = recentInvoicesRaw.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      currency: invoice.currency,
      clientName:
        invoice.client.companyName || invoice.client.contactName || invoice.client.email,
    }));

    return NextResponse.json({
      currency: business.currency,
      revenueThisMonth: revenueThisMonthAggregate._sum.totalAmount ?? 0,
      totalRevenue: totalRevenueAggregate._sum.totalAmount ?? 0,
      openInvoices,
      paidInvoices,
      overdueInvoices,
      clientCount,
      invoiceCount,
      recentInvoices,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading dashboard:", error);
    return apiError("Server error", 500);
  }
}
