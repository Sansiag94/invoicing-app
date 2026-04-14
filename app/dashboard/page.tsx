"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { readPrivatePageCache, writePrivatePageCache } from "@/utils/privatePageCache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Clock3,
  Wallet,
  AlertTriangle,
  Send,
} from "lucide-react";

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`dashboard-skeleton-stat-${index}`} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="space-y-3 pb-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="h-8 w-32 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`dashboard-skeleton-priority-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`dashboard-skeleton-row-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

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

  const labelClasses =
    props.tone === "success"
      ? "text-slate-500 dark:text-slate-300"
      : props.tone === "warning"
        ? "text-slate-500 dark:text-slate-300"
        : props.tone === "danger"
          ? "text-slate-500 dark:text-slate-300"
          : "text-slate-500 dark:text-slate-300";

  const valueClasses =
    props.tone === "success" || props.tone === "warning" || props.tone === "danger"
      ? "text-slate-900 dark:text-white"
      : "text-slate-900 dark:text-slate-50";

  const helperClasses =
    props.tone === "success"
      ? "text-slate-600 dark:text-slate-300"
      : props.tone === "warning"
        ? "text-slate-600 dark:text-slate-300"
        : props.tone === "danger"
          ? "text-slate-600 dark:text-slate-300"
          : "text-slate-600 dark:text-slate-300";

  const content = (
    <Card className={toneClasses}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${labelClasses}`}>{props.label}</CardTitle>
        <div className={`rounded-lg p-2 ${iconClasses}`}>{props.icon}</div>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold ${valueClasses}`}>{props.value}</p>
        <p className={`mt-2 text-sm ${helperClasses}`}>{props.helper}</p>
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

const DASHBOARD_CACHE_KEY = "dashboard-overview";

export default function DashboardPage() {
  const router = useRouter();
  const initialDashboardRef = useRef(readPrivatePageCache<DashboardOverview>(DASHBOARD_CACHE_KEY));
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(initialDashboardRef.current);
  const [isLoading, setIsLoading] = useState(() => !initialDashboardRef.current);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/dashboard", { cache: "no-store" });
        const data = (await response.json()) as DashboardOverview | { error?: string };

        if (!response.ok || ("error" in data && data.error)) {
          throw new Error(("error" in data ? data.error : null) ?? "Failed to load dashboard");
        }

        writePrivatePageCache(DASHBOARD_CACHE_KEY, data as DashboardOverview);

        if (mounted) {
          setDashboard(data as DashboardOverview);
          setLoadError(null);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
        if (mounted && !initialDashboardRef.current) {
          setDashboard(null);
          setLoadError("Unable to load dashboard.");
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
    return <DashboardLoadingSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-100">
        {loadError ?? "Unable to load dashboard."}
      </div>
    );
  }

  const showOnboarding = dashboard.clientCount === 0 && dashboard.invoiceCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">What needs attention now, without the extra reporting noise.</p>
      </div>

      {showOnboarding ? (
        <Card className="border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/25">
          <CardHeader>
            <CardTitle>Welcome to your invoicing workspace</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300">Complete the setup below to send your first invoice.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
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
              <Button asChild size="sm" variant="outline">
                <Link href="/help?from=app#onboarding">Help & onboarding</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={`${dashboard.currency} ${formatMoney(dashboard.revenueThisMonth)}`}
          helper="Cash collected this calendar month"
          icon={<Wallet className="h-5 w-5" />}
          href="/invoices?status=paid"
        />
        <StatCard
          label="Unpaid pipeline"
          value={`${dashboard.currency} ${formatMoney(dashboard.prospectRevenue)}`}
          helper={`${dashboard.unpaidInvoices} draft, sent, or overdue invoice${dashboard.unpaidInvoices === 1 ? "" : "s"}`}
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
          href="/invoices?status=unpaid"
        />
        <StatCard
          label="Overdue now"
          value={dashboard.overdueInvoices}
          helper={`${dashboard.currency} ${formatMoney(dashboard.overdueAmount)} needs follow-up`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={dashboard.overdueInvoices > 0 ? "danger" : "success"}
          href="/invoices?status=overdue"
        />
        <StatCard
          label="Awaiting payment"
          value={dashboard.sentInvoices}
          helper="Sent invoices not paid or overdue yet"
          icon={<Send className="h-5 w-5" />}
          href="/invoices?status=sent"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Quick actions</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Create, follow up, or jump into the full performance view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/invoices">Create invoice</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/clients">Add client</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/expenses">Record expense</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/analytics">Open analytics</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priority</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue now</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{dashboard.overdueInvoices}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {dashboard.currency} {formatMoney(dashboard.overdueAmount)} currently overdue
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {dashboard.currency} {formatMoney(dashboard.prospectRevenue)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Draft, sent, and overdue invoices not yet paid
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
                      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="text-base font-medium text-slate-900 dark:text-slate-100">No invoice activity yet</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Create an invoice or add a client to start building revenue.</p>
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
                          className="font-medium text-slate-900 hover:underline dark:text-slate-100"
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
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">No invoice activity yet</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">Create an invoice or add a client to start building revenue.</p>
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
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{invoice.clientName}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
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
