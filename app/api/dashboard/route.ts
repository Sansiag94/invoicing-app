import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";

type RecentInvoiceRow = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: "CHF" | "EUR";
  clientName: string;
};

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
      prisma.invoice.aggregate({
        where: {
          businessId: business.id,
          status: "paid",
        },
        _sum: { totalAmount: true },
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

    const recentInvoices = await prisma.$queryRaw<RecentInvoiceRow[]>`
      SELECT
        ranked."id",
        ranked."invoiceNumber",
        ranked."totalAmount",
        ranked."status",
        ranked."currency",
        ranked."clientName"
      FROM (
        SELECT
          i."uuid" AS "id",
          i."invoiceNumber",
          i."totalAmount",
          i."status",
          i."currency",
          i."issuedAt",
          i."createdAt",
          COALESCE(c."companyName", c."contactName", c."email") AS "clientName",
          CASE
            WHEN i."invoiceNumber" ~ '^[A-Z0-9]+[0-9]{4}-[0-9]+$' AND i."invoiceNumber" NOT LIKE 'DRAFT-%'
              THEN 0
            ELSE 1
          END AS "sortGroup",
          CASE
            WHEN i."invoiceNumber" ~ '^[A-Z0-9]+([0-9]{4})-([0-9]+)$' AND i."invoiceNumber" NOT LIKE 'DRAFT-%'
              THEN ((regexp_match(i."invoiceNumber", '^[A-Z0-9]+([0-9]{4})-([0-9]+)$'))[1])::integer
            ELSE NULL
          END AS "sortYear",
          CASE
            WHEN i."invoiceNumber" ~ '^[A-Z0-9]+([0-9]{4})-([0-9]+)$' AND i."invoiceNumber" NOT LIKE 'DRAFT-%'
              THEN ((regexp_match(i."invoiceNumber", '^[A-Z0-9]+([0-9]{4})-([0-9]+)$'))[2])::integer
            ELSE NULL
          END AS "sortSequence"
        FROM "Invoice" i
        INNER JOIN "Client" c
          ON c."uuid" = i."clientId"
        WHERE i."businessId" = ${business.id}
      ) AS ranked
      ORDER BY
        ranked."sortGroup" ASC,
        ranked."sortYear" DESC NULLS LAST,
        ranked."sortSequence" DESC NULLS LAST,
        COALESCE(ranked."issuedAt", ranked."createdAt") DESC,
        ranked."createdAt" DESC
      LIMIT 5
    `;

    return NextResponse.json({
      currency: business.currency,
      revenueThisMonth: revenueThisMonthAggregate._sum.totalAmount ?? 0,
      expensesThisMonth: expensesThisMonthAggregate._sum.amount ?? 0,
      netProfitThisMonth:
        (revenueThisMonthAggregate._sum.totalAmount ?? 0) - (expensesThisMonthAggregate._sum.amount ?? 0),
      totalRevenue: totalRevenueAggregate._sum.totalAmount ?? 0,
      totalExpenses: totalExpensesAggregate._sum.amount ?? 0,
      totalProfit:
        (totalRevenueAggregate._sum.totalAmount ?? 0) - (totalExpensesAggregate._sum.amount ?? 0),
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
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading dashboard:", error);
    return apiError("Server error", 500);
  }
}
