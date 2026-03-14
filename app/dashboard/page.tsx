"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardOverview } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Circle, Clock3, Coins, FileClock, Users, Wallet } from "lucide-react";

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

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

export default function DashboardPage() {
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
        <p className="text-sm text-slate-500">Financial overview and recent activity</p>
      </div>

      {showOnboarding ? (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader>
            <CardTitle>Welcome to your invoicing workspace</CardTitle>
            <p className="text-sm text-slate-600">
              Complete the setup below to send your first invoice.
            </p>
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
                <span>4. Send invoice</span>
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
              <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                Send from invoice actions once created
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Revenue this month"
          value={`${dashboard.currency} ${formatMoney(dashboard.revenueThisMonth)}`}
          helper="Cash collected this calendar month"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Total revenue"
          value={`${dashboard.currency} ${formatMoney(dashboard.totalRevenue)}`}
          helper={`${dashboard.paidInvoices} paid invoices`}
          icon={<Coins className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Prospect revenue"
          value={`${dashboard.currency} ${formatMoney(dashboard.prospectRevenue)}`}
          helper={`${dashboard.unpaidInvoices} unpaid invoices in pipeline`}
          icon={<FileClock className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Paid invoices"
          value={dashboard.paidInvoices}
          helper="Settled and closed"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Unpaid invoices"
          value={dashboard.unpaidInvoices}
          helper={`${dashboard.draftInvoices} draft · ${dashboard.sentInvoices} sent · ${dashboard.overdueInvoices} overdue`}
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Overdue invoices"
          value={dashboard.overdueInvoices}
          helper={`${dashboard.currency} ${formatMoney(dashboard.overdueAmount)} at risk`}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Open invoices"
          value={dashboard.openInvoices}
          helper="Draft and sent, excluding overdue"
          icon={<FileClock className="h-5 w-5" />}
        />
        <StatCard
          label="Active clients"
          value={dashboard.clientCount}
          helper={`${dashboard.invoiceCount} invoices created`}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
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
                <TableCell colSpan={4} className="text-slate-500">
                  No invoices yet.
                </TableCell>
              </TableRow>
            ) : (
              dashboard.recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {invoice.clientName}
                  </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
