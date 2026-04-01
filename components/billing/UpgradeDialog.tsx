"use client";

import type { BillingLimitDetails } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: BillingLimitDetails | null;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  isSubmitting?: boolean;
};

export default function UpgradeDialog({
  open,
  onOpenChange,
  details,
  onUpgrade,
  onManageBilling,
  isSubmitting = false,
}: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to keep issuing invoices</DialogTitle>
          <DialogDescription>
            {details
              ? `You have used ${details.monthlyIssuedInvoices} of ${details.monthlyInvoiceLimit ?? "unlimited"} issued invoices this month on the Free plan. Upgrade to Pro for CHF ${details.proPriceMonthlyChf}/month to remove the limit.`
              : "This workspace has reached its monthly Free plan invoice limit."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">What stays available</p>
          <p className="mt-2">
            You can still edit drafts, review existing invoices, send reminders, and manage the rest
            of your workspace. Upgrading only unlocks the next official invoice.
          </p>
        </div>

        <DialogFooter>
          {details?.portalAvailable && onManageBilling ? (
            <Button variant="outline" onClick={onManageBilling} disabled={isSubmitting}>
              {isSubmitting ? "Opening..." : "Manage billing"}
            </Button>
          ) : null}
          {onUpgrade ? (
            <Button onClick={onUpgrade} disabled={isSubmitting || details?.checkoutAvailable === false}>
              {isSubmitting ? "Opening checkout..." : "Upgrade to Pro"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
