"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock3, TrendingUp, Wallet } from "lucide-react";
import { AnalyticsOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function MetricCard(props: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "danger";
  icon: ReactNode;
}) {
  const toneClasses =
    props.tone === "success"
      ? "border-emerald-200 bg-emerald-50/70"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : props.tone === "danger"
          ? "border-red-200 bg-red-50/70"
          : "border-slate-200 bg-white";

  const iconClasses =
    props.tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : props.tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : props.tone === "danger"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700";

  return (
    <Card className={toneClasses}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{props.label}</CardTitle>
        <div className={`rounded-lg p-2 ${iconClasses}`}>{props.icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{props.value}</p>
        <p className="mt-2 text-sm text-slate-600">{props.helper}</p>
      </CardContent>
    </Card>
  );
}

type TimeRange = 3 | 6 | 12;

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  paddingLeft: number,
  paddingRight: number,
  paddingTop: number,
  paddingBottom: number,
  maxValue: number
): string {
  if (values.length === 0) return "";

  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const stepX = values.length === 1 ? 0 : usableWidth / (values.length - 1);

  return values
    .map((value, index) => {
      const x = paddingLeft + index * stepX;
      const y = paddingTop + usableHeight - (value / maxValue) * usableHeight;
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
  maxValue: number
) {
  if (values.length === 0) return [];

  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const stepX = values.length === 1 ? 0 : usableWidth / (values.length - 1);

  return values.map((value, index) => ({
    x: paddingLeft + index * stepX,
    y: paddingTop + usableHeight - (value / maxValue) * usableHeight,
    value,
  }));
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(6);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/analytics");
        const data = (await response.json()) as AnalyticsOverview | { error?: string };

        if (!response.ok || ("error" in data && data.error)) {
          throw new Error(("error" in data ? data.error : null) ?? "Failed to load analytics");
        }

        if (mounted) {
          setAnalytics(data as AnalyticsOverview);
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
        if (mounted) {
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
    const profitValues = visibleSeries.map((entry) => Math.max(0, entry.profit));

    return {
      revenueValues,
      expenseValues,
      profitValues,
      maxValue: Math.max(1, ...revenueValues, ...expenseValues, ...profitValues),
      totals: {
        revenue: revenueValues.reduce((sum, value) => sum + value, 0),
        expenses: expenseValues.reduce((sum, value) => sum + value, 0),
        profit: visibleSeries.reduce((sum, value) => sum + value.profit, 0),
      },
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
        profitMargin: null as number | null,
        overdueShare: null as number | null,
        topClientName: null as string | null,
      };
    }

    const topClient = analytics.topClients[0] ?? null;
    return {
      topClientName: topClient?.clientName ?? null,
      topClientShare:
        topClient && analytics.totalRevenue > 0 ? (topClient.revenue / analytics.totalRevenue) * 100 : null,
      profitMargin:
        analytics.totalRevenue > 0 ? (analytics.totalProfit / analytics.totalRevenue) * 100 : null,
      overdueShare:
        analytics.prospectRevenue > 0 ? (analytics.overdueAmount / analytics.prospectRevenue) * 100 : null,
    };
  }, [analytics]);

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
    chartData.maxValue
  );

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4">Unable to load analytics.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Use this page for longer-term signals: profitability, payment behavior, client concentration, and where expenses are accumulating.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total profit"
          value={`${analytics.currency} ${formatMoney(analytics.totalProfit)}`}
          helper={`${analytics.currency} ${formatMoney(analytics.totalRevenue)} revenue minus ${analytics.currency} ${formatMoney(analytics.totalExpenses)} expenses`}
          tone={analytics.totalProfit >= 0 ? "success" : "danger"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Profit margin"
          value={derived.profitMargin === null ? "-" : formatPercent(derived.profitMargin)}
          helper="How much of billed revenue remains after expenses"
          tone={derived.profitMargin !== null && derived.profitMargin >= 0 ? "success" : "warning"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Average days to pay"
          value={analytics.averageDaysToPay === null ? "-" : `${analytics.averageDaysToPay.toFixed(1)} d`}
          helper="Based on invoices with recorded payments"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Overdue exposure"
          value={`${analytics.currency} ${formatMoney(analytics.overdueAmount)}`}
          helper={
            derived.overdueShare === null
              ? "No open revenue pipeline"
              : `${formatPercent(derived.overdueShare)} of current pipeline is overdue`
          }
          tone="danger"
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Revenue, Costs & Profit</CardTitle>
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
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {range}M
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Revenue
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Costs
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
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
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                <path d={expensePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <path d={profitPath} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

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
                  <circle key={`profit-${index}`} cx={point.x} cy={point.y} r="4" fill="#0f172a">
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
                      fill="#64748b"
                    >
                      {entry.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected revenue</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {analytics.currency} {formatMoney(chartData.totals.revenue)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected costs</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {analytics.currency} {formatMoney(chartData.totals.expenses)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected profit</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {analytics.currency} {formatMoney(chartData.totals.profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Current month</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Revenue: {analytics.currency} {formatMoney(analytics.revenueThisMonth)}</p>
                <p>Expenses: {analytics.currency} {formatMoney(analytics.expensesThisMonth)}</p>
                <p className="font-medium text-slate-900">Net: {analytics.currency} {formatMoney(analytics.netProfitThisMonth)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Client concentration</p>
              <p className="mt-2 text-sm text-slate-600">
                {derived.topClientName && derived.topClientShare !== null
                  ? `${derived.topClientName} represents ${formatPercent(derived.topClientShare)} of paid revenue.`
                  : "No paid client revenue yet."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Collections risk</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Prospect revenue: {analytics.currency} {formatMoney(analytics.prospectRevenue)}</p>
                <p>Overdue amount: {analytics.currency} {formatMoney(analytics.overdueAmount)}</p>
              </div>
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
                  <div key={client.clientId} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{client.clientName}</p>
                        <p className="text-sm text-slate-500">
                          {client.invoiceCount} paid invoices - {formatPercent(share)} of revenue
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">
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
                    <p className="font-medium text-slate-900">{getExpenseCategoryLabel(entry.category)}</p>
                    <p className="text-sm text-slate-600">
                      {analytics.currency} {formatMoney(entry.amount)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
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
