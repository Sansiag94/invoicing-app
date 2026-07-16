import type { PrismaClient } from "@prisma/client";
import type {
  AnalyticsExpenseBreakdown,
  AnalyticsOverview,
  ExpenseCategory,
  InvoiceCurrency,
  MonthlyReportMetrics,
  MonthlyReportRecord,
} from "@/lib/types";
import { normalizeExpenseCurrency } from "@/lib/expenses";

const SETTLED_PAYMENT_STATUSES = ["manual_paid", "paid", "succeeded"];

export type AnalyticsDateRange = {
  startDate: Date;
  endDateExclusive: Date;
  startDateInput: string;
  endDateInput: string;
};

type MonthlyReportDbRecord = {
  id: string;
  month: string;
  currency: string;
  metrics: unknown;
  emailStatus: string;
  emailSentAt: Date | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-CH", { month: "short", year: "numeric" }).format(date);
}

export function resolveAnalyticsDateRange(url: URL, now = new Date()): AnalyticsDateRange {
  const fallbackStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fallbackEnd = addDays(new Date(now.getFullYear(), now.getMonth() + 1, 0), 1);
  const requestedStart = parseDateInput(url.searchParams.get("startDate"));
  const requestedEnd = parseDateInput(url.searchParams.get("endDate"));
  const startDate = requestedStart ?? fallbackStart;
  const inclusiveEnd = requestedEnd ?? addDays(fallbackEnd, -1);
  const normalizedEnd = inclusiveEnd < startDate ? startDate : inclusiveEnd;
  const endDateExclusive = addDays(normalizedEnd, 1);

  return {
    startDate,
    endDateExclusive,
    startDateInput: toDateInputValue(startDate),
    endDateInput: toDateInputValue(normalizedEnd),
  };
}

export function getPreviousMonthReportRange(now = new Date()): {
  month: string;
  startDate: Date;
  endDateExclusive: Date;
} {
  const currentMonthStart = startOfMonth(now);
  const startDate = addMonths(currentMonthStart, -1);
  return {
    month: getMonthKey(startDate),
    startDate,
    endDateExclusive: currentMonthStart,
  };
}

function isSettledPaymentStatus(status: string): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status);
}

function getSettledPaymentAmount(payments: Array<{ amount: number; status: string }>): number {
  return payments
    .filter((payment) => isSettledPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

function getInvoiceOutstandingAmount(invoice: {
  totalAmount: number;
  payments: Array<{ amount: number; status: string }>;
}): number {
  return Math.max(0, invoice.totalAmount - getSettledPaymentAmount(invoice.payments));
}

function buildMonthBuckets(range: AnalyticsDateRange): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = [];
  const endMonth = startOfMonth(addDays(range.endDateExclusive, -1));

  for (let cursor = startOfMonth(range.startDate); cursor <= endMonth; cursor = addMonths(cursor, 1)) {
    months.push({ key: getMonthKey(cursor), label: getMonthLabel(cursor) });
  }

  return months;
}

function isMonthlyReportMetrics(value: unknown): value is MonthlyReportMetrics {
  return Boolean(value && typeof value === "object" && "revenue" in value && "expenses" in value);
}

export function toMonthlyReportRecord(report: MonthlyReportDbRecord): MonthlyReportRecord {
  return {
    id: report.id,
    month: report.month,
    currency: normalizeExpenseCurrency(report.currency, "CHF"),
    metrics: isMonthlyReportMetrics(report.metrics)
      ? report.metrics
      : {
          revenue: 0,
          expenses: 0,
          profit: 0,
          issuedAmount: 0,
          issuedCount: 0,
          collectedAmount: 0,
          openAmount: 0,
          overdueAmount: 0,
          paidInvoices: 0,
          unpaidInvoices: 0,
          averageDaysToPay: null,
          averagePaidInvoiceValue: 0,
          topClients: [],
          expenseBreakdown: [],
        },
    emailStatus: report.emailStatus,
    emailSentAt: report.emailSentAt?.toISOString() ?? null,
    generatedAt: report.generatedAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export async function buildAnalyticsOverview(
  db: PrismaClient,
  businessId: string,
  businessCurrency: string,
  range: AnalyticsDateRange
): Promise<Omit<AnalyticsOverview, "monthlyReports">> {
  const currency: InvoiceCurrency = normalizeExpenseCurrency(businessCurrency, "CHF");
  const months = buildMonthBuckets(range);

  const [
    settledPaymentsRaw,
    openInvoicesRaw,
    issuedInRangeRaw,
    expensesRaw,
    paidInvoicesCount,
    unpaidInvoicesCount,
  ] = await db.$transaction([
    db.payment.findMany({
      where: {
        invoice: { businessId },
        status: { in: SETTLED_PAYMENT_STATUSES },
        createdAt: { gte: range.startDate, lt: range.endDateExclusive },
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
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      where: {
        businessId,
        status: { in: ["draft", "sent", "overdue"] },
      },
      select: {
        status: true,
        totalAmount: true,
        payments: {
          select: { amount: true, status: true },
        },
      },
    }),
    db.invoice.findMany({
      where: {
        businessId,
        issuedAt: { gte: range.startDate, lt: range.endDateExclusive },
        status: { not: "cancelled" },
      },
      select: { issuedAt: true, issueDate: true, totalAmount: true },
    }),
    db.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: range.startDate, lt: range.endDateExclusive },
      },
      select: {
        amount: true,
        category: true,
        otherCategoryName: true,
        expenseDate: true,
      },
    }),
    db.invoice.count({
      where: {
        businessId,
        status: "paid",
      },
    }),
    db.invoice.count({
      where: {
        businessId,
        status: { in: ["draft", "sent", "overdue"] },
      },
    }),
  ]);

  let totalRevenue = 0;
  const monthlyRevenue = new Map<string, number>(months.map((month) => [month.key, 0]));
  const topClientMap = new Map<string, { clientId: string; clientName: string; revenue: number; invoiceIds: Set<string> }>();
  const paymentDelays: number[] = [];

  for (const payment of settledPaymentsRaw) {
    totalRevenue += payment.amount;

    const revenueMonthKey = getMonthKey(payment.createdAt);
    if (monthlyRevenue.has(revenueMonthKey)) {
      monthlyRevenue.set(revenueMonthKey, (monthlyRevenue.get(revenueMonthKey) ?? 0) + payment.amount);
    }

    const clientId = payment.invoice.client.id;
    const clientName = payment.invoice.client.companyName || payment.invoice.client.contactName || payment.invoice.client.email;
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

  let totalExpenses = 0;
  const monthlyExpenses = new Map<string, number>(months.map((month) => [month.key, 0]));
  const expenseCategoryMap = new Map<string, AnalyticsExpenseBreakdown>();

  for (const expense of expensesRaw) {
    totalExpenses += expense.amount;

    const expenseMonthKey = getMonthKey(expense.expenseDate);
    if (monthlyExpenses.has(expenseMonthKey)) {
      monthlyExpenses.set(expenseMonthKey, (monthlyExpenses.get(expenseMonthKey) ?? 0) + expense.amount);
    }

    const mapKey = `${expense.category}:${expense.category === "other" ? expense.otherCategoryName ?? "" : ""}`;
    const existing = expenseCategoryMap.get(mapKey);
    expenseCategoryMap.set(mapKey, {
      category: expense.category as ExpenseCategory,
      otherCategoryName: expense.category === "other" ? expense.otherCategoryName : null,
      amount: (existing?.amount ?? 0) + expense.amount,
    });
  }

  const prospectRevenue = openInvoicesRaw.reduce((sum, invoice) => sum + getInvoiceOutstandingAmount(invoice), 0);
  const overdueAmount = openInvoicesRaw
    .filter((invoice) => invoice.status === "overdue")
    .reduce((sum, invoice) => sum + getInvoiceOutstandingAmount(invoice), 0);
  const issuedInRangeSummary = issuedInRangeRaw.reduce(
    (summary, invoice) => ({
      issuedAmount: summary.issuedAmount + invoice.totalAmount,
      issuedCount: summary.issuedCount + 1,
    }),
    { issuedAmount: 0, issuedCount: 0 }
  );
  const monthlyBilled = new Map<string, number>(months.map((month) => [month.key, 0]));
  for (const invoice of issuedInRangeRaw) {
    const billedMonthKey = getMonthKey(invoice.issuedAt ?? invoice.issueDate);
    if (monthlyBilled.has(billedMonthKey)) {
      monthlyBilled.set(billedMonthKey, (monthlyBilled.get(billedMonthKey) ?? 0) + invoice.totalAmount);
    }
  }
  const monthlySeries = months.map((month) => {
    const billed = monthlyBilled.get(month.key) ?? 0;
    const revenue = monthlyRevenue.get(month.key) ?? 0;
    const expenses = monthlyExpenses.get(month.key) ?? 0;
    return {
      label: month.label,
      billed,
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

  const expenseBreakdown = Array.from(expenseCategoryMap.values()).sort((left, right) => right.amount - left.amount);
  const averageDaysToPay =
    paymentDelays.length > 0 ? paymentDelays.reduce((sum, value) => sum + value, 0) / paymentDelays.length : null;

  return {
    currency,
    dateRange: {
      startDate: range.startDateInput,
      endDate: range.endDateInput,
    },
    revenueThisMonth: totalRevenue,
    expensesThisMonth: totalExpenses,
    netProfitThisMonth: totalRevenue - totalExpenses,
    totalRevenue,
    totalExpenses,
    totalProfit: totalRevenue - totalExpenses,
    prospectRevenue,
    overdueAmount,
    paidInvoices: paidInvoicesCount,
    unpaidInvoices: unpaidInvoicesCount,
    averageDaysToPay,
    averagePaidInvoiceValue: paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0,
    monthProgress: {
      issuedAmount: issuedInRangeSummary.issuedAmount,
      issuedCount: issuedInRangeSummary.issuedCount,
      collectedAmount: totalRevenue,
      openAmount: prospectRevenue,
      overdueAmount,
    },
    monthlySeries,
    topClients,
    expenseBreakdown,
  };
}

export function buildMonthlyReportMetrics(overview: Omit<AnalyticsOverview, "monthlyReports">): MonthlyReportMetrics {
  return {
    revenue: overview.totalRevenue,
    expenses: overview.totalExpenses,
    profit: overview.totalProfit,
    issuedAmount: overview.monthProgress.issuedAmount,
    issuedCount: overview.monthProgress.issuedCount,
    collectedAmount: overview.revenueThisMonth,
    openAmount: overview.prospectRevenue,
    overdueAmount: overview.overdueAmount,
    paidInvoices: overview.paidInvoices,
    unpaidInvoices: overview.unpaidInvoices,
    averageDaysToPay: overview.averageDaysToPay,
    averagePaidInvoiceValue: overview.averagePaidInvoiceValue,
    topClients: overview.topClients,
    expenseBreakdown: overview.expenseBreakdown,
  };
}

export function buildMonthlyReportDateRange(startDate: Date, endDateExclusive: Date): AnalyticsDateRange {
  return {
    startDate,
    endDateExclusive,
    startDateInput: toDateInputValue(startDate),
    endDateInput: toDateInputValue(addDays(endDateExclusive, -1)),
  };
}
