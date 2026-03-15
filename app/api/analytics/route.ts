import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { AnalyticsOverview, ExpenseCategory, InvoiceCurrency } from "@/lib/types";
import { normalizeExpenseCurrency } from "@/lib/expenses";

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-CH", { month: "short", year: "numeric" }).format(date);
}

function getTrailingMonths(count: number): Array<{ key: string; label: string; start: Date; end: Date }> {
  const now = new Date();
  const months: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
    months.push({
      key: getMonthKey(start),
      label: getMonthLabel(start),
      start,
      end,
    });
  }

  return months;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

    const currency: InvoiceCurrency = normalizeExpenseCurrency(business.currency, "CHF");
    const months = getTrailingMonths(12);
    const currentMonthStart = startOfMonth(new Date());

    const [paidInvoicesRaw, openInvoicesRaw, expensesRaw, paidInvoicesCount, unpaidInvoicesCount] =
      await prisma.$transaction([
        prisma.invoice.findMany({
          where: {
            businessId: business.id,
            status: "paid",
          },
          select: {
            id: true,
            issueDate: true,
            totalAmount: true,
            client: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                email: true,
              },
            },
            payments: {
              orderBy: { createdAt: "asc" },
              select: {
                createdAt: true,
              },
            },
          },
        }),
        prisma.invoice.findMany({
          where: {
            businessId: business.id,
            status: {
              in: ["draft", "sent", "overdue"],
            },
          },
          select: {
            status: true,
            totalAmount: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            businessId: business.id,
          },
          select: {
            amount: true,
            category: true,
            expenseDate: true,
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
            status: {
              not: "paid",
            },
          },
        }),
      ]);

    let revenueThisMonth = 0;
    let totalRevenue = 0;
    const monthlyRevenue = new Map<string, number>(months.map((month) => [month.key, 0]));
    const topClientMap = new Map<string, { clientId: string; clientName: string; revenue: number; invoiceCount: number }>();
    const paymentDelays: number[] = [];

    for (const invoice of paidInvoicesRaw) {
      totalRevenue += invoice.totalAmount;

      const revenueDate = invoice.payments[0]?.createdAt ?? invoice.issueDate;
      if (revenueDate >= currentMonthStart) {
        revenueThisMonth += invoice.totalAmount;
      }

      const revenueMonthKey = getMonthKey(revenueDate);
      if (monthlyRevenue.has(revenueMonthKey)) {
        monthlyRevenue.set(revenueMonthKey, (monthlyRevenue.get(revenueMonthKey) ?? 0) + invoice.totalAmount);
      }

      const clientId = invoice.client.id;
      const clientName = invoice.client.companyName || invoice.client.contactName || invoice.client.email;
      const existingClient = topClientMap.get(clientId);
      topClientMap.set(clientId, {
        clientId,
        clientName,
        revenue: (existingClient?.revenue ?? 0) + invoice.totalAmount,
        invoiceCount: (existingClient?.invoiceCount ?? 0) + 1,
      });

      if (invoice.payments[0]?.createdAt) {
        const diffMs = invoice.payments[0].createdAt.getTime() - invoice.issueDate.getTime();
        paymentDelays.push(Math.max(0, diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    let expensesThisMonth = 0;
    let totalExpenses = 0;
    const monthlyExpenses = new Map<string, number>(months.map((month) => [month.key, 0]));
    const expenseCategoryMap = new Map<ExpenseCategory, number>();

    for (const expense of expensesRaw) {
      totalExpenses += expense.amount;

      if (expense.expenseDate >= currentMonthStart) {
        expensesThisMonth += expense.amount;
      }

      const expenseMonthKey = getMonthKey(expense.expenseDate);
      if (monthlyExpenses.has(expenseMonthKey)) {
        monthlyExpenses.set(expenseMonthKey, (monthlyExpenses.get(expenseMonthKey) ?? 0) + expense.amount);
      }

      expenseCategoryMap.set(expense.category, (expenseCategoryMap.get(expense.category) ?? 0) + expense.amount);
    }

    const prospectRevenue = openInvoicesRaw.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const overdueAmount = openInvoicesRaw
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const monthlySeries = months.map((month) => {
      const revenue = monthlyRevenue.get(month.key) ?? 0;
      const expenses = monthlyExpenses.get(month.key) ?? 0;
      return {
        label: month.label,
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });

    const topClients = Array.from(topClientMap.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5);

    const expenseBreakdown = Array.from(expenseCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount);

    const averageDaysToPay =
      paymentDelays.length > 0
        ? paymentDelays.reduce((sum, value) => sum + value, 0) / paymentDelays.length
        : null;

    const payload: AnalyticsOverview = {
      currency,
      revenueThisMonth,
      expensesThisMonth,
      netProfitThisMonth: revenueThisMonth - expensesThisMonth,
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      prospectRevenue,
      overdueAmount,
      paidInvoices: paidInvoicesCount,
      unpaidInvoices: unpaidInvoicesCount,
      averageDaysToPay,
      monthlySeries,
      topClients,
      expenseBreakdown,
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading analytics:", error);
    return apiError("Server error", 500);
  }
}
