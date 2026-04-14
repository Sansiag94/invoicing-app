"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AnalyticsOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { readPrivatePageCache, writePrivatePageCache } from "@/utils/privatePageCache";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme";
import { cn } from "@/lib/utils";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDeltaPercent(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "0.0%" : "New";
  }

  return `${(((current - previous) / previous) * 100).toFixed(1)}%`;
}

function MetricCard(props: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "danger";
  icon: ReactNode;
}) {
  const toneClasses =
    props.tone === "success"
      ? "border-emerald-200 bg-white dark:border-emerald-900/80 dark:bg-slate-900"
      : props.tone === "warning"
        ? "border-amber-200 bg-white dark:border-amber-900/80 dark:bg-slate-900"
        : props.tone === "danger"
          ? "border-red-200 bg-white dark:border-red-900/80 dark:bg-slate-900"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";

  const iconClasses =
    props.tone === "success"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
      : props.tone === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
        : props.tone === "danger"
          ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <Card className={toneClasses}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-300">{props.label}</CardTitle>
        <div className={`rounded-lg p-2 ${iconClasses}`}>{props.icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{props.value}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{props.helper}</p>
      </CardContent>
    </Card>
  );
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

type TimeRange = 3 | 6 | 12;
const ANALYTICS_CACHE_KEY = "analytics-overview";

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
  const [timeRange, setTimeRange] = useState<TimeRange>(6);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/analytics", { cache: "no-store" });
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
  }, []);

  const visibleSeries = useMemo(() => {
    const series = analytics?.monthlySeries ?? [];
    return series.slice(-timeRange);
  }, [analytics?.monthlySeries, timeRange]);

  const chartData = useMemo(() => {
    const revenueValues = visibleSeries.map((entry) => entry.revenue);
    const expenseValues = visibleSeries.map((entry) => entry.expenses);
    const profitValues = visibleSeries.map((entry) => entry.profit);
    const plottedValues = [...revenueValues, ...expenseValues, ...profitValues];

    return {
      revenueValues,
      expenseValues,
      profitValues,
      minValue: Math.min(0, ...plottedValues),
      maxValue: Math.max(1, ...plottedValues),
      totals: {
        revenue: revenueValues.reduce((sum, value) => sum + value, 0),
        expenses: expenseValues.reduce((sum, value) => sum + value, 0),
        profit: visibleSeries.reduce((sum, value) => sum + value.profit, 0),
      },
    };
  }, [visibleSeries]);

  const comparisonData = useMemo(() => {
    const series = analytics?.monthlySeries ?? [];
    const previousSeries = series.slice(-timeRange * 2, -timeRange);

    const total = (values: Array<{ revenue: number; expenses: number; profit: number }>) =>
      values.reduce(
        (accumulator, entry) => ({
          revenue: accumulator.revenue + entry.revenue,
          expenses: accumulator.expenses + entry.expenses,
          profit: accumulator.profit + entry.profit,
        }),
        { revenue: 0, expenses: 0, profit: 0 }
      );

    const currentTotals = total(visibleSeries);
    const previousTotals = total(previousSeries);
    const bestMonth = visibleSeries.reduce<(typeof visibleSeries)[number] | null>(
      (best, entry) => (best === null || entry.profit > best.profit ? entry : best),
      null
    );

    return {
      previousTotals,
      currentTotals,
      bestMonth,
    };
  }, [analytics?.monthlySeries, timeRange, visibleSeries]);

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
        topClient && analytics.totalRevenue > 0 ? (topClient.revenue / analytics.totalRevenue) * 100 : null,
      overdueShare:
        analytics.prospectRevenue > 0 ? (analytics.overdueAmount / analytics.prospectRevenue) * 100 : null,
    };
  }, [analytics]);

  const selectedRangeProfitMargin = useMemo(() => {
    if (chartData.totals.revenue <= 0) {
      return null;
    }

    return (chartData.totals.profit / chartData.totals.revenue) * 100;
  }, [chartData.totals.profit, chartData.totals.revenue]);
  const monthlyReport = useMemo(() => {
    const series = analytics?.monthlySeries ?? [];
    const currentMonth = series.at(-1) ?? null;
    const lastClosedMonth = series.length >= 2 ? series.at(-2) ?? null : null;

    return {
      currentMonth,
      lastClosedMonth,
    };
  }, [analytics?.monthlySeries]);

  const chartWidth = 760;
  const chartHeight = 280;
  const chartPadding = { left: 24, right: 20, top: 20, bottom: 34 };
  const revenuePath = buildLinePath(
    chartData.revenueValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
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
  const profitPath = buildLinePath(
    chartData.profitValues,
    chartWidth,
    chartHeight,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    chartPadding.bottom,
    chartData.minValue,
    chartData.maxValue
  );
  const revenuePoints = buildPoints(
    chartData.revenueValues,
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
  const profitPoints = buildPoints(
    chartData.profitValues,
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
        profit: "#e2e8f0",
      }
    : {
        grid: "#e2e8f0",
        label: "#64748b",
        profit: "#475569",
      };

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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Use this page for performance trends, collections risk, client concentration, and where expenses are accumulating.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue (selected range)"
          value={`${analytics.currency} ${formatMoney(chartData.totals.revenue)}`}
          helper={`Revenue across the ${timeRange}-month view shown below`}
          tone="default"
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Costs (selected range)"
          value={`${analytics.currency} ${formatMoney(chartData.totals.expenses)}`}
          helper={`Booked expenses across the same ${timeRange}-month view`}
          tone="warning"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <MetricCard
          label="Net result (selected range)"
          value={`${analytics.currency} ${formatMoney(chartData.totals.profit)}`}
          helper="Revenue minus expenses in the selected range"
          tone={chartData.totals.profit >= 0 ? "success" : "danger"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Margin (selected range)"
          value={selectedRangeProfitMargin === null ? "-" : formatPercent(selectedRangeProfitMargin)}
          helper="Net result divided by revenue in the selected range"
          tone={selectedRangeProfitMargin !== null && selectedRangeProfitMargin >= 0 ? "success" : "warning"}
          icon={<Clock3 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Month In Progress</CardTitle>
          <p className="text-sm text-slate-500">
            Track what has been issued this month, what cash came in this month, and what is still
            open right now.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issued this month</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {analytics.currency} {formatMoney(analytics.monthProgress.issuedAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {analytics.monthProgress.issuedCount} official invoice
                {analytics.monthProgress.issuedCount === 1 ? "" : "s"} issued this month
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Collected this month</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {analytics.currency} {formatMoney(analytics.monthProgress.collectedAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Cash received this month from all invoices</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Open now</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {analytics.currency} {formatMoney(analytics.monthProgress.openAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Unpaid amount across draft, sent, and overdue invoices</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Overdue now</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {analytics.currency} {formatMoney(analytics.monthProgress.overdueAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Currently overdue unpaid amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="monthly-report">
        <CardHeader>
          <CardTitle>Monthly Report</CardTitle>
          <p className="text-sm text-slate-500">
            Use this section as the month-by-month summary for what closed last month and what is
            happening this month so far.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last closed month</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {monthlyReport.lastClosedMonth?.label ?? "Not available yet"}
            </p>
            {monthlyReport.lastClosedMonth ? (
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Revenue: {analytics.currency} {formatMoney(monthlyReport.lastClosedMonth.revenue)}
                </p>
                <p>
                  Costs: {analytics.currency} {formatMoney(monthlyReport.lastClosedMonth.expenses)}
                </p>
                <p>
                  Net result: {analytics.currency} {formatMoney(monthlyReport.lastClosedMonth.profit)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">The report becomes available once you have a prior month on the books.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current month so far</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {monthlyReport.currentMonth?.label ?? "This month"}
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Revenue: {analytics.currency} {formatMoney(analytics.revenueThisMonth)}
              </p>
              <p>
                Costs: {analytics.currency} {formatMoney(analytics.expensesThisMonth)}
              </p>
              <p>
                Net result: {analytics.currency} {formatMoney(analytics.netProfitThisMonth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Revenue, costs, and net result</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Interactive view of the last {timeRange} months.</p>
            </div>
            <div className="flex gap-2">
              {[3, 6, 12].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range as TimeRange)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    timeRange === range
                      ? "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-100 dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {range}M
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Revenue
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Costs
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 dark:bg-slate-200" />
                Profit
              </div>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[680px]">
                {[0.25, 0.5, 0.75, 1].map((fraction) => {
                  const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - fraction);
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

                <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                <path d={expensePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <path d={profitPath} fill="none" stroke={chartColors.profit} strokeWidth="3" strokeLinecap="round" />

                {revenuePoints.map((point, index) => (
                  <circle key={`revenue-${index}`} cx={point.x} cy={point.y} r="4" fill="#10b981">
                    <title>{`${visibleSeries[index]?.label}: Revenue ${analytics.currency} ${formatMoney(point.value)}`}</title>
                  </circle>
                ))}
                {expensePoints.map((point, index) => (
                  <circle key={`expense-${index}`} cx={point.x} cy={point.y} r="4" fill="#f59e0b">
                    <title>{`${visibleSeries[index]?.label}: Costs ${analytics.currency} ${formatMoney(point.value)}`}</title>
                  </circle>
                ))}
                {profitPoints.map((point, index) => (
                  <circle key={`profit-${index}`} cx={point.x} cy={point.y} r="4" fill={chartColors.profit}>
                    <title>{`${visibleSeries[index]?.label}: Profit ${analytics.currency} ${formatMoney(visibleSeries[index]?.profit ?? 0)}`}</title>
                  </circle>
                ))}

                {visibleSeries.map((entry, index) => {
                  const usableWidth = chartWidth - chartPadding.left - chartPadding.right;
                  const stepX = visibleSeries.length === 1 ? 0 : usableWidth / (visibleSeries.length - 1);
                  const x = chartPadding.left + index * stepX;
                  return (
                    <text
                      key={entry.label}
                      x={x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill={chartColors.label}
                    >
                      {entry.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected revenue</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {analytics.currency} {formatMoney(chartData.totals.revenue)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  vs previous: {formatDeltaPercent(chartData.totals.revenue, comparisonData.previousTotals.revenue)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected costs</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {analytics.currency} {formatMoney(chartData.totals.expenses)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  vs previous: {formatDeltaPercent(chartData.totals.expenses, comparisonData.previousTotals.expenses)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected profit</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {analytics.currency} {formatMoney(chartData.totals.profit)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  vs previous: {formatDeltaPercent(chartData.totals.profit, comparisonData.previousTotals.profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections and payment behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Overdue exposure</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p>{analytics.currency} {formatMoney(analytics.overdueAmount)} currently overdue</p>
                <p>
                  {derived.overdueShare === null
                    ? "No open revenue pipeline right now."
                    : `${formatPercent(derived.overdueShare)} of the current open pipeline is overdue.`}
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
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Best month in this range</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {comparisonData.bestMonth
                  ? `${comparisonData.bestMonth.label} delivered ${analytics.currency} ${formatMoney(comparisonData.bestMonth.profit)} profit.`
                  : "Not enough data yet."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Open pipeline</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p>Open pipeline: {analytics.currency} {formatMoney(analytics.prospectRevenue)}</p>
                <p>Paid invoices: {analytics.paidInvoices}</p>
                <p>Unpaid invoices: {analytics.unpaidInvoices}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Average paid invoice</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {analytics.currency} {formatMoney(analytics.averagePaidInvoiceValue)} average value per paid invoice.
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {derived.topClientName && derived.topClientShare !== null
                  ? `${derived.topClientName} represents ${formatPercent(derived.topClientShare)} of paid revenue.`
                  : "No paid client revenue yet."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/invoices?status=overdue">Review overdue invoices</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/expenses">Review expenses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <p className="text-sm text-slate-500">See how concentrated your revenue is and which clients matter most.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topClients.length === 0 ? (
              <p className="text-sm text-slate-500">No paid client revenue yet.</p>
            ) : (
              analytics.topClients.map((client) => {
                const share = analytics.totalRevenue > 0 ? (client.revenue / analytics.totalRevenue) * 100 : 0;
                return (
                  <div key={client.clientId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{client.clientName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {client.invoiceCount} paid invoices - {formatPercent(share)} of revenue
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
            <CardTitle>Expense Breakdown</CardTitle>
            <p className="text-sm text-slate-500">Identify where money is going so you can cut or control the biggest categories.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.expenseBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses booked yet.</p>
            ) : (
              analytics.expenseBreakdown.map((entry) => (
                <div key={entry.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{getExpenseCategoryLabel(entry.category)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {analytics.currency} {formatMoney(entry.amount)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-slate-600 dark:bg-slate-300"
                      style={{ width: `${Math.max(6, (entry.amount / maxBreakdownValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
