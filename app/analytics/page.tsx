"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Download, LineChart } from "lucide-react";
import { AnalyticsOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { readPrivatePageCache, writePrivatePageCache } from "@/utils/privatePageCache";
import { getExpenseDisplayCategoryLabel } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHeroMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replaceAll(".", "'");
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="h-4 w-[32rem] max-w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`analytics-skeleton-stat-${index}`} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="space-y-3 pb-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="h-8 w-36 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-44 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`analytics-skeleton-progress-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="mt-3 h-4 w-44 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const ANALYTICS_CACHE_KEY = "analytics-overview";

function getDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultAnalyticsDateRange() {
  const now = new Date();
  return {
    startDate: getDateInputValue(new Date(now.getFullYear(), 0, 1)),
    endDate: getDateInputValue(new Date(now.getFullYear(), 11, 31)),
  };
}

function getYearDateRange(year: number) {
  return {
    startDate: getDateInputValue(new Date(year, 0, 1)),
    endDate: getDateInputValue(new Date(year, 11, 31)),
  };
}

function getMonthDateRange(year: number, month: number) {
  return {
    startDate: getDateInputValue(new Date(year, month, 1)),
    endDate: getDateInputValue(new Date(year, month + 1, 0)),
  };
}

function getLastMonthsDateRange(monthCount: number) {
  const now = new Date();
  return {
    startDate: getDateInputValue(new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1)),
    endDate: getDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function getRangeYear(startDate: string, endDate: string): string {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));

  if (
    Number.isFinite(startYear) &&
    startYear === endYear &&
    startDate === `${startYear}-01-01` &&
    endDate === `${startYear}-12-31`
  ) {
    return String(startYear);
  }

  return "custom";
}

function getShortMonthLabel(label: string): string {
  return label.split(" ")[0] ?? label;
}

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  paddingLeft: number,
  paddingRight: number,
  paddingTop: number,
  paddingBottom: number,
  minValue: number,
  maxValue: number
): string {
  if (values.length === 0) return "";

  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const stepX = values.length === 1 ? 0 : usableWidth / (values.length - 1);
  const valueRange = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = paddingLeft + index * stepX;
      const y = paddingTop + usableHeight - ((value - minValue) / valueRange) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildPoints(
  values: number[],
  width: number,
  height: number,
  paddingLeft: number,
  paddingRight: number,
  paddingTop: number,
  paddingBottom: number,
  minValue: number,
  maxValue: number
) {
  if (values.length === 0) return [];

  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const stepX = values.length === 1 ? 0 : usableWidth / (values.length - 1);
  const valueRange = Math.max(1, maxValue - minValue);

  return values.map((value, index) => ({
    x: paddingLeft + index * stepX,
    y: paddingTop + usableHeight - ((value - minValue) / valueRange) * usableHeight,
    value,
  }));
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const initialAnalyticsRef = useRef(readPrivatePageCache<AnalyticsOverview>(ANALYTICS_CACHE_KEY));
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(initialAnalyticsRef.current);
  const [isLoading, setIsLoading] = useState(() => !initialAnalyticsRef.current);
  const initialRange = initialAnalyticsRef.current?.dateRange ?? getDefaultAnalyticsDateRange();
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [selectedYear, setSelectedYear] = useState(() => getRangeYear(initialRange.startDate, initialRange.endDate));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  function handleYearChange(value: string) {
    setSelectedYear(value);

    if (value === "custom") {
      return;
    }

    const range = getYearDateRange(Number(value));
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setSelectedYear(getRangeYear(value, endDate));
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    setSelectedYear(getRangeYear(startDate, value));
  }

  function applyDateRange(range: { startDate: string; endDate: string }) {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSelectedYear(getRangeYear(range.startDate, range.endDate));
  }

  const quickRanges = useMemo(() => {
    const now = new Date();
    return [
      { label: "This month", range: getMonthDateRange(now.getFullYear(), now.getMonth()) },
      { label: "Last month", range: getMonthDateRange(now.getFullYear(), now.getMonth() - 1) },
      { label: "Last 3 months", range: getLastMonthsDateRange(3) },
      { label: "This year", range: getYearDateRange(now.getFullYear()) },
      { label: "Last year", range: getYearDateRange(now.getFullYear() - 1) },
    ];
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch(`/api/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, { cache: "no-store" });
        const data = (await response.json()) as AnalyticsOverview | { error?: string };

        if (!response.ok || ("error" in data && data.error)) {
          throw new Error(("error" in data ? data.error : null) ?? "Failed to load analytics");
        }

        writePrivatePageCache(ANALYTICS_CACHE_KEY, data as AnalyticsOverview);

        if (mounted) {
          setAnalytics(data as AnalyticsOverview);
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
        if (mounted && !initialAnalyticsRef.current) {
          setAnalytics(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [endDate, startDate]);

  const visibleSeries = useMemo(() => {
    const series = analytics?.monthlySeries ?? [];
    return series.map((entry) => ({
      ...entry,
      billed: entry.billed ?? 0,
      invoiceCount: entry.invoiceCount ?? 0,
    }));
  }, [analytics?.monthlySeries]);

  const chartData = useMemo(() => {
    const billedValues = visibleSeries.map((entry) => entry.billed);
    const revenueValues = visibleSeries.map((entry) => entry.revenue);
    const expenseValues = visibleSeries.map((entry) => entry.expenses);
    const billedNetValues = visibleSeries.map((entry) => entry.billed - entry.expenses);
    const plottedValues = [...billedValues, ...expenseValues, ...billedNetValues];
    const monthCount = Math.max(1, visibleSeries.length);

    return {
      billedValues,
      revenueValues,
      expenseValues,
      billedNetValues,
      minValue: Math.min(0, ...plottedValues),
      maxValue: Math.max(1, ...plottedValues),
      totals: {
        billed: billedValues.reduce((sum, value) => sum + value, 0),
        revenue: revenueValues.reduce((sum, value) => sum + value, 0),
        expenses: expenseValues.reduce((sum, value) => sum + value, 0),
        billedNet: billedNetValues.reduce((sum, value) => sum + value, 0),
      },
      averages: {
        billed: billedValues.reduce((sum, value) => sum + value, 0) / monthCount,
        revenue: revenueValues.reduce((sum, value) => sum + value, 0) / monthCount,
        expenses: expenseValues.reduce((sum, value) => sum + value, 0) / monthCount,
        billedNet: billedNetValues.reduce((sum, value) => sum + value, 0) / monthCount,
      },
    };
  }, [visibleSeries]);

  const heroData = useMemo(() => {
    const profit = chartData.totals.billedNet;
    const positiveProfit = Math.max(0, profit);
    return {
      incomeTaxEstimate: positiveProfit * 0.2,
      socialSecurityEstimate: positiveProfit * 0.1,
    };
  }, [chartData.totals.billedNet]);

  const maxMonthlyBilled = useMemo(() => Math.max(1, ...visibleSeries.map((entry) => entry.billed)), [visibleSeries]);

  function exportAnalyticsCsv() {
    if (!analytics) return;

    const isSingleMonthExport = visibleSeries.length <= 1;
    const averageIssuedInvoiceValue =
      analytics.monthProgress.issuedCount > 0 ? chartData.totals.billed / analytics.monthProgress.issuedCount : 0;
    const reserveTotal = heroData.incomeTaxEstimate + heroData.socialSecurityEstimate;
    const largestInvoice = analytics.largestInvoice;
    const rows = [
      ["Sierra Invoices Analytics Report"],
      ["Period", startDate, endDate],
      ["Currency", analytics.currency],
      [],
      ["Summary"],
      ["Total billed", chartData.totals.billed.toFixed(2)],
      ["Invoices issued", analytics.monthProgress.issuedCount],
      ["Average issued invoice value", averageIssuedInvoiceValue.toFixed(2)],
      ["Collected", chartData.totals.revenue.toFixed(2)],
      ["Expenses", chartData.totals.expenses.toFixed(2)],
      ["Net billed after expenses", chartData.totals.billedNet.toFixed(2)],
      ["Open amount", analytics.monthProgress.openAmount.toFixed(2)],
      ["Overdue amount", analytics.monthProgress.overdueAmount.toFixed(2)],
      ...(largestInvoice
        ? [
            ["Largest invoice", largestInvoice.invoiceNumber],
            ["Largest invoice client", largestInvoice.clientName],
            ["Largest invoice amount", largestInvoice.amount.toFixed(2)],
            ["Largest invoice issue date", largestInvoice.issueDate.slice(0, 10)],
          ]
        : [["Largest invoice", "No invoices issued"]]),
      [],
      ["Planning"],
      ["Income tax estimate", heroData.incomeTaxEstimate.toFixed(2)],
      ["Social security estimate", heroData.socialSecurityEstimate.toFixed(2)],
      ["Suggested reserve total", reserveTotal.toFixed(2)],
      ["Note", "Planning estimate only. Confirm final tax and social security amounts with your accountant."],
      [],
      ["Monthly Breakdown"],
      ["Month", "Invoices issued", "Billed", "Collected", "Expenses", "Net billed after expenses"],
      ...visibleSeries.map((entry) => [
        entry.label,
        entry.invoiceCount,
        entry.billed.toFixed(2),
        entry.revenue.toFixed(2),
        entry.expenses.toFixed(2),
        (entry.billed - entry.expenses).toFixed(2),
      ]),
      [],
      ...(!isSingleMonthExport
        ? [
            ["Averages"],
            ["Average billed per month", chartData.averages.billed.toFixed(2)],
            ["Average collected per month", chartData.averages.revenue.toFixed(2)],
            ["Average expenses per month", chartData.averages.expenses.toFixed(2)],
            ["Average net billed per month", chartData.averages.billedNet.toFixed(2)],
            [],
          ]
        : []),
      ["Client Breakdown"],
      ["Client", "Invoices issued", "Billed", "Share of billed total"],
      ...(analytics.topClients.length === 0
        ? [["No billed client work"]]
        : analytics.topClients.map((client) => {
            const share = chartData.totals.billed > 0 ? (client.revenue / chartData.totals.billed) * 100 : 0;
            return [client.clientName, client.invoiceCount, client.revenue.toFixed(2), `${share.toFixed(1)}%`];
          })),
      [],
      ["Payment Status"],
      ["Paid invoices", analytics.paidInvoices],
      ["Unpaid invoices", analytics.unpaidInvoices],
      ["Collected", chartData.totals.revenue.toFixed(2)],
      ["Open amount", analytics.monthProgress.openAmount.toFixed(2)],
      ["Overdue amount", analytics.monthProgress.overdueAmount.toFixed(2)],
      ["Average days to pay", analytics.averageDaysToPay === null ? "Not enough paid invoices yet" : analytics.averageDaysToPay.toFixed(1)],
      [],
      ["Expense Breakdown"],
      ["Category", "Amount"],
      ...(analytics.expenseBreakdown.length === 0
        ? [["No expenses booked"]]
        : analytics.expenseBreakdown.map((entry) => [
            getExpenseDisplayCategoryLabel(entry.category, entry.otherCategoryName),
            entry.amount.toFixed(2),
          ])),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const comparisonData = useMemo(() => {
    const bestMonth = visibleSeries.reduce<(typeof visibleSeries)[number] | null>(
      (best, entry) => (best === null || entry.billed > best.billed ? entry : best),
      null
    );

    return {
      bestMonth,
    };
  }, [visibleSeries]);

  const maxBreakdownValue = useMemo(() => {
    const breakdown = analytics?.expenseBreakdown ?? [];
    return Math.max(1, ...breakdown.map((entry) => entry.amount));
  }, [analytics?.expenseBreakdown]);

  const derived = useMemo(() => {
    if (!analytics) {
      return {
        topClientShare: null as number | null,
        overdueShare: null as number | null,
        topClientName: null as string | null,
      };
    }

    const topClient = analytics.topClients[0] ?? null;
    return {
      topClientName: topClient?.clientName ?? null,
      topClientShare:
        topClient && chartData.totals.billed > 0 ? (topClient.revenue / chartData.totals.billed) * 100 : null,
      overdueShare:
        analytics.prospectRevenue > 0 ? (analytics.overdueAmount / analytics.prospectRevenue) * 100 : null,
    };
  }, [analytics, chartData.totals.billed]);

  const chartWidth = 760;
  const chartHeight = 280;
  const chartPadding = { left: 24, right: 20, top: 20, bottom: 34 };
  const expensePath = buildLinePath(
    chartData.expenseValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
  const billedNetPath = buildLinePath(
    chartData.billedNetValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
  const expensePoints = buildPoints(
    chartData.expenseValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
  const billedNetPoints = buildPoints(
    chartData.billedNetValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
  const chartValueRange = Math.max(1, chartData.maxValue - chartData.minValue);
  const zeroLineY =
    chartPadding.top +
    (chartHeight - chartPadding.top - chartPadding.bottom) -
    ((0 - chartData.minValue) / chartValueRange) *
      (chartHeight - chartPadding.top - chartPadding.bottom);
  const chartColors = theme === "dark"
    ? {
        grid: "#334155",
        label: "#94a3b8",
        billed: "#38bdf8",
        net: "#e2e8f0",
      }
    : {
        grid: "#e2e8f0",
        label: "#64748b",
        billed: "#0f172a",
        net: "#475569",
      };
  const usableChartWidth = chartWidth - chartPadding.left - chartPadding.right;
  const usableChartHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartStepX = visibleSeries.length === 1 ? 0 : usableChartWidth / (visibleSeries.length - 1);
  const chartBarWidth = Math.max(12, Math.min(34, visibleSeries.length === 0 ? 24 : usableChartWidth / visibleSeries.length / 2.4));
  const getChartY = (value: number) =>
    chartPadding.top + usableChartHeight - ((value - chartData.minValue) / chartValueRange) * usableChartHeight;

  if (isLoading) {
    return <AnalyticsPageSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-100">
        Unable to load analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-slate-50">
              <Link href="/dashboard" aria-label="Back to dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Analytics</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Billed work and business costs for {startDate} to {endDate}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {quickRanges.map((item) => {
                const isActive = startDate === item.range.startDate && endDate === item.range.endDate;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyDateRange(item.range)}
                    className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={(event) => handleYearChange(event.target.value)}
                  className="bg-transparent text-sm font-semibold outline-none"
                  aria-label="Analytics year"
                >
                  <option value="custom">Custom</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="sr-only">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="sr-only">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => handleEndDateChange(event.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <Button
                type="button"
                onClick={exportAnalyticsCsv}
                className="h-10 rounded-md bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total billed</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {formatHeroMoney(chartData.totals.billed)} <span className="text-base font-medium text-slate-500">{analytics.currency}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {analytics.monthProgress.issuedCount} invoice{analytics.monthProgress.issuedCount === 1 ? "" : "s"} issued in range
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average billed / month</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {formatHeroMoney(chartData.averages.billed)} <span className="text-base font-medium text-slate-500">{analytics.currency}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your normal monthly invoice volume</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/70 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Expenses</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {formatHeroMoney(chartData.totals.expenses)} <span className="text-base font-medium text-slate-500">{analytics.currency}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Costs booked in the selected range</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Net after expenses</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {formatHeroMoney(chartData.totals.billedNet)} <span className="text-base font-medium text-slate-500">{analytics.currency}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Billed amount minus booked expenses</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_2fr] md:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tax planning estimate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {formatHeroMoney(heroData.incomeTaxEstimate + heroData.socialSecurityEstimate)} {analytics.currency}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Based on positive net after expenses.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatHeroMoney(heroData.incomeTaxEstimate)} {analytics.currency}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Income tax estimate</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatHeroMoney(heroData.socialSecurityEstimate)} {analytics.currency}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Social security estimate</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Planning estimate only. Confirm final tax and social security amounts with your accountant.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Billing</CardTitle>
            <p className="text-sm text-slate-500">
              Billed amount is the main bar. Expenses and net after expenses show whether each month was strong or costly.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-slate-100" />
                Billed
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Expenses
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Net
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[680px]">
                {[0.25, 0.5, 0.75, 1].map((fraction) => {
                  const y = chartPadding.top + usableChartHeight * (1 - fraction);
                  return (
                    <line
                      key={fraction}
                      x1={chartPadding.left}
                      x2={chartWidth - chartPadding.right}
                      y1={y}
                      y2={y}
                      stroke={chartColors.grid}
                      strokeDasharray="4 4"
                    />
                  );
                })}
                <line
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={zeroLineY}
                  y2={zeroLineY}
                  stroke={chartColors.grid}
                  strokeWidth="1.5"
                />

                {visibleSeries.map((entry, index) => {
                  const x = chartPadding.left + index * chartStepX;
                  const billedY = getChartY(entry.billed);
                  return (
                    <rect
                      key={`billed-${entry.label}`}
                      x={x - chartBarWidth / 2}
                      y={Math.min(billedY, zeroLineY)}
                      width={chartBarWidth}
                      height={Math.max(2, Math.abs(zeroLineY - billedY))}
                      rx="5"
                      fill={entry.billed > 0 ? chartColors.billed : chartColors.grid}
                    >
                      <title>{`${entry.label}: Billed ${analytics.currency} ${formatMoney(entry.billed)}`}</title>
                    </rect>
                  );
                })}

                <path d={expensePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <path d={billedNetPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

                {expensePoints.map((point, index) => (
                  <circle key={`expense-${index}`} cx={point.x} cy={point.y} r="4" fill="#f59e0b">
                    <title>{`${visibleSeries[index]?.label}: Expenses ${analytics.currency} ${formatMoney(point.value)}`}</title>
                  </circle>
                ))}
                {billedNetPoints.map((point, index) => (
                  <circle key={`net-${index}`} cx={point.x} cy={point.y} r="4" fill="#10b981">
                    <title>{`${visibleSeries[index]?.label}: Net ${analytics.currency} ${formatMoney(point.value)}`}</title>
                  </circle>
                ))}

                {visibleSeries.map((entry, index) => {
                  const x = chartPadding.left + index * chartStepX;
                  return (
                    <text
                      key={entry.label}
                      x={x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill={chartColors.label}
                    >
                      {getShortMonthLabel(entry.label)}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3 text-right">Invoices</th>
                    <th className="py-2 pr-3 text-right">Billed</th>
                    <th className="py-2 pr-3 text-right">Expenses</th>
                    <th className="py-2 pr-3 text-right">Net</th>
                    <th className="py-2 text-right">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleSeries.map((entry) => {
                    const net = entry.billed - entry.expenses;
                    return (
                      <tr key={entry.label}>
                        <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">{entry.label}</td>
                        <td className="py-3 pr-3 text-right text-slate-600 dark:text-slate-300">{entry.invoiceCount}</td>
                        <td className="py-3 pr-3 text-right text-slate-900 dark:text-slate-100">
                          {analytics.currency} {formatMoney(entry.billed)}
                        </td>
                        <td className="py-3 pr-3 text-right text-slate-600 dark:text-slate-300">
                          {analytics.currency} {formatMoney(entry.expenses)}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {analytics.currency} {formatMoney(net)}
                        </td>
                        <td className="py-3 text-right text-slate-500 dark:text-slate-400">
                          {analytics.currency} {formatMoney(entry.revenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month Notes</CardTitle>
            <p className="text-sm text-slate-500">Quick signals from the selected range.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Best billing month</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {comparisonData.bestMonth
                  ? `${comparisonData.bestMonth.label} had ${analytics.currency} ${formatMoney(comparisonData.bestMonth.billed)} billed.`
                  : "Not enough data yet."}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Cash collected</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {analytics.currency} {formatMoney(chartData.totals.revenue)} collected in this range.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Useful for cash flow, but not the main billing target.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Largest month</p>
              <div className="mt-3 space-y-2">
                {visibleSeries.map((entry) => (
                  <div key={entry.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{entry.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">{analytics.currency} {formatMoney(entry.billed)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-slate-950 dark:bg-slate-100"
                        style={{ width: `${entry.billed > 0 ? Math.max(6, (entry.billed / maxMonthlyBilled) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best Clients</CardTitle>
            <p className="text-sm text-slate-500">Clients ranked by billed invoice totals in the selected period.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topClients.length === 0 ? (
              <p className="text-sm text-slate-500">No billed client work yet.</p>
            ) : (
              analytics.topClients.map((client) => {
                const share = chartData.totals.billed > 0 ? (client.revenue / chartData.totals.billed) * 100 : 0;
                return (
                  <div key={client.clientId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{client.clientName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {client.invoiceCount} invoice{client.invoiceCount === 1 ? "" : "s"} - {formatPercent(share)} of billed work
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {analytics.currency} {formatMoney(client.revenue)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where Money Went</CardTitle>
            <p className="text-sm text-slate-500">Expenses grouped by category for the selected period.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.expenseBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses booked yet.</p>
            ) : (
              analytics.expenseBreakdown.map((entry) => (
                <div key={entry.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {getExpenseDisplayCategoryLabel(entry.category, entry.otherCategoryName)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {analytics.currency} {formatMoney(entry.amount)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${Math.max(6, (entry.amount / maxBreakdownValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Payment Health</CardTitle>
            <p className="text-sm text-slate-500">Secondary view for follow-up and cash flow.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Open now</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {analytics.currency} {formatMoney(analytics.monthProgress.openAmount)}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Overdue now</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {analytics.currency} {formatMoney(analytics.monthProgress.overdueAmount)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Average days to pay</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {analytics.averageDaysToPay === null
                  ? "Not enough paid invoices yet."
                  : `${analytics.averageDaysToPay.toFixed(1)} days based on invoices with recorded payments.`}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {derived.overdueShare === null
                  ? "No open invoice pipeline right now."
                  : `${formatPercent(derived.overdueShare)} of the current open invoice pipeline is overdue.`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/invoices?status=overdue">Review overdue invoices</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/invoices">Open invoices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="monthly-report">
          <CardHeader>
            <CardTitle>Monthly Report</CardTitle>
            <p className="text-sm text-slate-500">
              Saved report history generated automatically on the 1st of each month.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest saved report</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {analytics.monthlyReports[0]?.month ?? "Not available yet"}
              </p>
              {analytics.monthlyReports[0] ? (
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>
                    Revenue: {analytics.monthlyReports[0].currency} {formatMoney(analytics.monthlyReports[0].metrics.revenue)}
                  </p>
                  <p>
                    Costs: {analytics.monthlyReports[0].currency} {formatMoney(analytics.monthlyReports[0].metrics.expenses)}
                  </p>
                  <p>
                    Net result: {analytics.monthlyReports[0].currency} {formatMoney(analytics.monthlyReports[0].metrics.profit)}
                  </p>
                  <p>Email status: {analytics.monthlyReports[0].emailStatus}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">The first saved report appears after the next monthly automation run.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Report history</p>
              {analytics.monthlyReports.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No saved reports yet.</p>
              ) : (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
                  {analytics.monthlyReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{report.month}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Generated {new Date(report.generatedAt).toLocaleDateString()} - {report.emailStatus}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {report.currency} {formatMoney(report.metrics.profit)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
