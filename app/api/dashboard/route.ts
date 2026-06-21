import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";

function getMonthRange(today: Date): { startOfMonth: Date; startOfNextMonth: Date } {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return { startOfMonth, startOfNextMonth };
}

const SETTLED_PAYMENT_STATUSES = ["manual_paid", "paid", "succeeded"];
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);

    await markOverdueInvoicesForBusiness(business.id);

    const now = new Date();
    const { startOfMonth, startOfNextMonth } = getMonthRange(now);

    const [
      revenueThisMonthAggregate,
      expensesThisMonthAggregate,
      totalRevenueAggregate,
      totalExpensesAggregate,
      prospectRevenueAggregate,
      overdueAmountAggregate,
      openInvoices,
      unpaidInvoices,
      paidInvoices,
      draftInvoices,
      sentInvoices,
      overdueInvoices,
      clientCount,
      invoiceCount,
    ] = await prisma.$transaction([
      prisma.payment.aggregate({
        where: {
          invoice: {
            businessId: business.id,
          },
          status: {
            in: SETTLED_PAYMENT_STATUSES,
          },
          createdAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          businessId: business.id,
          expenseDate: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          invoice: {
            businessId: business.id,
          },
          status: {
            in: SETTLED_PAYMENT_STATUSES,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          businessId: business.id,
        },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId: business.id,
          status: {
            in: ["draft", "sent", "overdue"],
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId: business.id,
          status: "overdue",
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
          status: {
            in: ["draft", "sent", "overdue"],
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
          status: "draft",
        },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
          status: "sent",
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
    ]);

    const recentInvoiceRows = await prisma.invoice.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [
        { issuedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
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
    });

    const recentInvoices = recentInvoiceRows.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      currency: invoice.currency,
      clientName:
        invoice.client.companyName?.trim() ||
        invoice.client.contactName?.trim() ||
        invoice.client.email,
    }));

    return NextResponse.json({
      currency: business.currency,
      revenueThisMonth: revenueThisMonthAggregate._sum.amount ?? 0,
      expensesThisMonth: expensesThisMonthAggregate._sum.amount ?? 0,
      netProfitThisMonth:
        (revenueThisMonthAggregate._sum.amount ?? 0) - (expensesThisMonthAggregate._sum.amount ?? 0),
      totalRevenue: totalRevenueAggregate._sum.amount ?? 0,
      totalExpenses: totalExpensesAggregate._sum.amount ?? 0,
      totalProfit:
        (totalRevenueAggregate._sum.amount ?? 0) - (totalExpensesAggregate._sum.amount ?? 0),
      prospectRevenue: prospectRevenueAggregate._sum.totalAmount ?? 0,
      overdueAmount: overdueAmountAggregate._sum.totalAmount ?? 0,
      openInvoices,
      unpaidInvoices,
      paidInvoices,
      draftInvoices,
      sentInvoices,
      overdueInvoices,
      clientCount,
      invoiceCount,
      recentInvoices,
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading dashboard:", error);
    return apiError("Server error", 500);
  }
}
