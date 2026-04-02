"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CreditCard, ChevronDown, Sparkles } from "lucide-react";
import type { BillingStatus } from "@/lib/types";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingPlanChipProps = {
  billingStatus: BillingStatus | null;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  isSubmitting?: boolean;
};

function formatDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPlanTone(status: BillingStatus): "default" | "success" | "warning" {
  if (status.isComplimentaryPro || status.hasUnlimitedInvoices) {
    return "success";
  }

  return (status.remainingInvoices ?? 0) <= 1 ? "warning" : "default";
}

function getPlanLabel(status: BillingStatus): string {
  if (status.isComplimentaryPro) {
    return "Complimentary Pro";
  }

  return status.hasUnlimitedInvoices ? "Pro" : "Free";
}

function getPlanSummary(status: BillingStatus): string {
  if (status.isComplimentaryPro) {
    return "Unlimited invoices included.";
  }

  if (status.hasUnlimitedInvoices) {
    const renewalLabel = formatDate(status.subscriptionCurrentPeriodEnd);
    return renewalLabel ? `Unlimited invoices. Renews on ${renewalLabel}.` : "Unlimited invoices active.";
  }

  const resetLabel = formatDate(status.usagePeriodEndExclusive);
  const remaining = status.remainingInvoices ?? 0;
  return `${remaining} official invoice${remaining === 1 ? "" : "s"} remaining.${resetLabel ? ` Resets on ${resetLabel}.` : ""}`;
}

export default function BillingPlanChip({
  billingStatus,
  onUpgrade,
  onManageBilling,
  isSubmitting = false,
}: BillingPlanChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const content = useMemo(() => {
    if (!billingStatus) {
      return {
        badgeLabel: "Billing",
        summary: "Loading billing details...",
      };
    }

    return {
      badgeLabel: getPlanLabel(billingStatus),
      summary: getPlanSummary(billingStatus),
    };
  }, [billingStatus]);

  const tone = billingStatus ? getPlanTone(billingStatus) : "default";
  const canUpgrade = Boolean(
    billingStatus &&
      !billingStatus.hasUnlimitedInvoices &&
      billingStatus.checkoutAvailable &&
      typeof onUpgrade === "function"
  );
  const canManage = Boolean(
    billingStatus &&
      !billingStatus.isComplimentaryPro &&
      billingStatus.portalAvailable &&
      typeof onManageBilling === "function"
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          badgeVariants({ variant: tone }),
          "cursor-pointer gap-2 px-3 py-1.5 text-left shadow-sm transition-colors hover:opacity-95"
        )}
        aria-expanded={open}
        aria-label="Open plan details"
      >
        {billingStatus?.hasUnlimitedInvoices ? (
          <BadgeCheck className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        <span>{content.badgeLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="space-y-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                <CreditCard className="h-4 w-4 text-slate-600" />
                {content.badgeLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{content.summary}</p>
            </div>

            {billingStatus ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {!billingStatus.hasUnlimitedInvoices ? (
                  <p>
                    Free includes {billingStatus.monthlyInvoiceLimit} official invoices per calendar
                    month. Drafts stay free.
                  </p>
                ) : billingStatus.isComplimentaryPro ? (
                  <p>Complimentary Pro is active on this workspace. No Stripe subscription is required.</p>
                ) : (
                  <p>
                    Pro is active for this workspace. Use the billing portal if you need to review or
                    cancel the subscription.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {canUpgrade ? (
                <Button
                  onClick={onUpgrade}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Opening checkout..." : "Upgrade to Pro"}
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={onManageBilling}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Opening portal..." : "Manage billing"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
