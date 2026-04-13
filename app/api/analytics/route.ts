import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { AnalyticsOverview, ExpenseCategory, InvoiceCurrency } from "@/lib/types";
import { normalizeExpenseCurrency } from "@/lib/expenses";

const SETTLED_PAYMENT_STATUSES = ["manual_paid", "paid", "succeeded"];
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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

function isSettledPaymentStatus(status: string): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status);
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
    const nextMonthStart = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() + 1,
      1
    );

    const [
      settledPaymentsRaw,
      openInvoicesRaw,
      issuedThisMonthRaw,
      expensesRaw,
      paidInvoicesCount,
      unpaidInvoicesCount,
    ] =
      await prisma.$transaction([
        prisma.payment.findMany({
          where: {
            invoice: {
              businessId: business.id,
            },
            status: {
              in: SETTLED_PAYMENT_STATUSES,
            },
          },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            invoice: {
              select: {
                id: true,
                issueDate: true,
                client: {
                  select: {
                    id: true,
                    companyName: true,
                    contactName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
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
        prisma.invoice.findMany({
          where: {
            businessId: business.id,
            issuedAt: {
              gte: currentMonthStart,
              lt: nextMonthStart,
            },
            status: {
              not: "cancelled",
            },
          },
          select: {
            status: true,
            totalAmount: true,
            payments: {
              select: {
                amount: true,
                status: true,
                createdAt: true,
              },
            },
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
              in: ["draft", "sent", "overdue"],
            },
          },
        }),
      ]);

    let revenueThisMonth = 0;
    let totalRevenue = 0;
    const monthlyRevenue = new Map<string, number>(months.map((month) => [month.key, 0]));
    const topClientMap = new Map<string, { clientId: string; clientName: string; revenue: number; invoiceIds: Set<string> }>();
    const paymentDelays: number[] = [];

    for (const payment of settledPaymentsRaw) {
      totalRevenue += payment.amount;

      const revenueDate = payment.createdAt;
      if (revenueDate >= currentMonthStart && revenueDate < nextMonthStart) {
        revenueThisMonth += payment.amount;
      }

      const revenueMonthKey = getMonthKey(revenueDate);
      if (monthlyRevenue.has(revenueMonthKey)) {
        monthlyRevenue.set(revenueMonthKey, (monthlyRevenue.get(revenueMonthKey) ?? 0) + payment.amount);
      }

      const clientId = payment.invoice.client.id;
      const clientName =
        payment.invoice.client.companyName ||
        payment.invoice.client.contactName ||
        payment.invoice.client.email;
      const existingClient = topClientMap.get(clientId);
      const invoiceIds = existingClient?.invoiceIds ?? new Set<string>();
      invoiceIds.add(payment.invoice.id);
      topClientMap.set(clientId, {
        clientId,
        clientName,
        revenue: (existingClient?.revenue ?? 0) + payment.amount,
        invoiceIds,
      });

      const diffMs = payment.createdAt.getTime() - payment.invoice.issueDate.getTime();
      paymentDelays.push(Math.max(0, diffMs / (1000 * 60 * 60 * 24)));
    }

    let expensesThisMonth = 0;
    let totalExpenses = 0;
    const monthlyExpenses = new Map<string, number>(months.map((month) => [month.key, 0]));
    const expenseCategoryMap = new Map<ExpenseCategory, number>();

    for (const expense of expensesRaw) {
      totalExpenses += expense.amount;

      if (expense.expenseDate >= currentMonthStart && expense.expenseDate < nextMonthStart) {
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
    const monthProgress = issuedThisMonthRaw.reduce(
      (summary, invoice) => {
        summary.issuedAmount += invoice.totalAmount;
        summary.issuedCount += 1;

        const settledInvoicePayments = invoice.payments.filter((payment) =>
          isSettledPaymentStatus(payment.status)
        );
        const collectedOnInvoice = settledInvoicePayments.reduce((sum, payment) => sum + payment.amount, 0);

        summary.collectedAmount += settledInvoicePayments
          .filter((payment) => payment.createdAt >= currentMonthStart && payment.createdAt < nextMonthStart)
          .reduce((sum, payment) => sum + payment.amount, 0);

        if (invoice.status !== "paid") {
          summary.openAmount += Math.max(0, invoice.totalAmount - collectedOnInvoice);
        }

        if (invoice.status === "overdue") {
          summary.overdueAmount += invoice.totalAmount;
        }

        return summary;
      },
      {
        issuedAmount: 0,
        issuedCount: 0,
        collectedAmount: 0,
        openAmount: 0,
        overdueAmount: 0,
      }
    );

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
      .map((client) => ({
        clientId: client.clientId,
        clientName: client.clientName,
        revenue: client.revenue,
        invoiceCount: client.invoiceIds.size,
      }))
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
      averagePaidInvoiceValue: paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0,
      monthProgress,
      monthlySeries,
      topClients,
      expenseBreakdown,
    };

    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading analytics:", error);
    return apiError("Server error", 500);
  }
}
