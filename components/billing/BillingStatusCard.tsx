"use client";

import { BadgeCheck, CreditCard, Sparkles } from "lucide-react";
import type { BillingStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BillingStatusCardProps = {
  title: string;
  description: string;
  billingStatus: BillingStatus | null;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  isSubmitting?: boolean;
};

function formatUsageLabel(status: BillingStatus): string {
  if (status.monthlyInvoiceLimit === null) {
    return "Unlimited invoices on Pro";
  }

  return `${status.monthlyIssuedInvoices} of ${status.monthlyInvoiceLimit} issued invoices used this month`;
}

export default function BillingStatusCard({
  title,
  description,
  billingStatus,
  onUpgrade,
  onManageBilling,
  isSubmitting = false,
}: BillingStatusCardProps) {
  if (!billingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading billing details...</p>
        </CardContent>
      </Card>
    );
  }

  const planLabel = billingStatus.hasUnlimitedInvoices ? "Pro" : billingStatus.planTier === "pro" ? "Pro" : "Free";
  const canManageBilling = billingStatus.portalAvailable && typeof onManageBilling === "function";
  const canUpgrade = !billingStatus.hasUnlimitedInvoices && typeof onUpgrade === "function";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <p className="max-w-3xl text-sm text-slate-500">{description}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            {billingStatus.hasUnlimitedInvoices ? <BadgeCheck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {planLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage this month</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatUsageLabel(billingStatus)}</p>
            <p className="mt-2 text-sm text-slate-600">
              {billingStatus.monthlyInvoiceLimit === null
                ? `Current subscription status: ${billingStatus.stripeSubscriptionStatus.replaceAll("_", " ")}.`
                : `Upgrade to Pro for CHF ${billingStatus.proPriceMonthlyChf}/month when you need more than ${billingStatus.monthlyInvoiceLimit} issued invoices.`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
              <CreditCard className="h-4 w-4 text-slate-600" />
              Plan actions
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {canUpgrade ? (
                <Button onClick={onUpgrade} disabled={isSubmitting || !billingStatus.checkoutAvailable}>
                  {isSubmitting ? "Opening checkout..." : `Upgrade to Pro`}
                </Button>
              ) : null}
              {canManageBilling ? (
                <Button variant="outline" onClick={onManageBilling} disabled={isSubmitting}>
                  {isSubmitting ? "Opening portal..." : "Manage billing"}
                </Button>
              ) : null}
              {!billingStatus.checkoutAvailable && !billingStatus.hasUnlimitedInvoices ? (
                <Button asChild variant="outline">
                  <a href={`mailto:${billingStatus.supportEmail}?subject=Sierra%20Invoices%20Pro%20setup`}>
                    Contact support
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
