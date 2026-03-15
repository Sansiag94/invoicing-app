"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Clock3,
  TrendingUp,
  Wallet,
  TrendingDown,
} from "lucide-react";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function StatCard(props: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
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

  const content = (
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

  if (props.href) {
    return (
      <Link href={props.href} className="block transition-transform hover:-translate-y-0.5">
        {content}
      </Link>
    );
  }

  return content;
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/dashboard");
        const data = (await response.json()) as DashboardOverview | { error?: string };

        if (!response.ok || ("error" in data && data.error)) {
          throw new Error(("error" in data ? data.error : null) ?? "Failed to load dashboard");
        }

        if (mounted) {
          setDashboard(data as DashboardOverview);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
        if (mounted) {
          setDashboard(null);
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

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4">Unable to load dashboard.</div>;
  }

  const showOnboarding = dashboard.clientCount === 0 && dashboard.invoiceCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">What needs attention now, without the extra reporting noise.</p>
      </div>

      {showOnboarding ? (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader>
            <CardTitle>Welcome to your invoicing workspace</CardTitle>
            <p className="text-sm text-slate-600">Complete the setup below to send your first invoice.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Circle className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>1. Add business info</span>
              </li>
              <li className="flex items-start gap-2">
                <Circle className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>2. Create first client</span>
              </li>
              <li className="flex items-start gap-2">
                <Circle className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>3. Create first invoice</span>
              </li>
              <li className="flex items-start gap-2">
                <Circle className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>4. Add first expense</span>
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/settings">Add business info</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/clients">Create client</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/invoices">Create invoice</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/expenses">Track expenses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={`${dashboard.currency} ${formatMoney(dashboard.revenueThisMonth)}`}
          helper="Cash collected this calendar month"
          icon={<Wallet className="h-5 w-5" />}
          href="/invoices?status=paid"
        />
        <StatCard
          label="Expenses this month"
          value={`${dashboard.currency} ${formatMoney(dashboard.expensesThisMonth)}`}
          helper="Booked costs in the current month"
          icon={<TrendingDown className="h-5 w-5" />}
          tone="warning"
          href="/expenses"
        />
        <StatCard
          label="Net this month"
          value={`${dashboard.currency} ${formatMoney(dashboard.netProfitThisMonth)}`}
          helper="Collected revenue minus expenses"
          icon={<TrendingUp className="h-5 w-5" />}
          tone={dashboard.netProfitThisMonth >= 0 ? "success" : "danger"}
          href="/analytics"
        />
        <StatCard
          label="Unpaid invoices"
          value={dashboard.unpaidInvoices}
          helper={`${dashboard.draftInvoices} draft / ${dashboard.sentInvoices} sent / ${dashboard.overdueInvoices} overdue`}
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
          href="/invoices?status=unpaid"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priority</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue now</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.overdueInvoices}</p>
            <p className="text-sm text-slate-600">
              {dashboard.currency} {formatMoney(dashboard.overdueAmount)} currently overdue
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.currency} {formatMoney(dashboard.prospectRevenue)}
            </p>
            <p className="text-sm text-slate-600">{dashboard.sentInvoices} sent invoices still awaiting payment</p>
          </div>
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
              <p className="mt-2 text-sm text-slate-600">
                {dashboard.overdueInvoices > 0
                  ? `Review overdue invoices first, then follow up on ${dashboard.sentInvoices} sent invoice${dashboard.sentInvoices === 1 ? "" : "s"}.`
                  : "No overdue invoices right now. Focus on turning sent invoices into paid revenue."}
              </p>
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href={dashboard.overdueInvoices > 0 ? "/invoices?status=overdue" : "/invoices?status=sent"}>
                {dashboard.overdueInvoices > 0 ? "Review overdue invoices" : "Review sent invoices"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                        <p className="text-base font-medium text-slate-900">No invoice activity yet</p>
                        <p className="text-sm text-slate-600">Create an invoice or add a client to start building revenue.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link href="/invoices">Create Invoice</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/clients">Add Client</Link>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboard.recentInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      role="link"
                      tabIndex={0}
                      onClick={() => {
                        router.push(`/invoices/${invoice.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/invoices/${invoice.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-slate-900 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>
                        {invoice.currency} {formatMoney(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {dashboard.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <p className="text-base font-medium text-slate-900">No invoice activity yet</p>
                <p className="text-sm text-slate-600">Create an invoice or add a client to start building revenue.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/invoices">Create Invoice</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/clients">Add Client</Link>
                  </Button>
                </div>
              </div>
            ) : (
              dashboard.recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-slate-600">{invoice.clientName}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {invoice.currency} {formatMoney(invoice.totalAmount)}
                      </p>
                    </div>
                    <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
