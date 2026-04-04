import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileSpreadsheet,
  ReceiptText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { APP_NAME } from "@/lib/appBrand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LegalLinks from "@/components/LegalLinks";
import { getLegalProfile } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Help & Onboarding",
  description: `Getting started help and onboarding information for ${APP_NAME}`,
  alternates: {
    canonical: "/help",
  },
};

type HelpSource = "public" | "app" | "settings";

function getReturnContent(source: HelpSource) {
  if (source === "settings") {
    return {
      title: "Back to settings",
      description: "Return to your workspace settings when you are ready.",
      href: "/settings",
      label: "Back to settings",
    };
  }

  if (source === "app") {
    return {
      title: "Back to your workspace",
      description: "Return to the app and keep working when you are ready.",
      href: "/dashboard",
      label: "Back to dashboard",
    };
  }

  return {
    title: "Back to home",
    description: "Return to the public homepage.",
    href: "/",
    label: "Back to home",
  };
}

function getActionLinks(source: HelpSource) {
  if (source === "public") {
    return {
      primaryHref: "/signup",
      primaryLabel: "Create account",
      secondaryHref: "/login",
      secondaryLabel: "Log in",
    };
  }

  return {
    primaryHref: "/settings",
    primaryLabel: "Open settings",
    secondaryHref: "/invoices",
    secondaryLabel: "Open invoices",
  };
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const legalProfile = getLegalProfile();
  const params = await searchParams;
  const source: HelpSource =
    params.from === "settings" ? "settings" : params.from === "app" ? "app" : "public";
  const returnContent = getReturnContent(source);
  const actionLinks = getActionLinks(source);
  const supportMailtoHref = `mailto:${legalProfile.supportEmail}`;
  const onboardingMailtoHref = `mailto:${legalProfile.supportEmail}?subject=Sierra%20Invoices%20Onboarding%20Request`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-8 md:py-10">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">
              Help & onboarding
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
              This guide is written for first-time users who want clear, practical setup steps.
              Follow the checklist in order and you will be ready to send your first invoice.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={returnContent.href}>{returnContent.label}</Link>
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{returnContent.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{returnContent.description}</p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Need a direct answer? Contact support at{" "}
            <a
              href={supportMailtoHref}
              className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200"
            >
              {legalProfile.supportEmail}
            </a>
            .
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card id="setup-checklist">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Setup checklist
            </p>
            <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">How to send your first invoice</CardTitle>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              Work through these steps in order. Most new workspaces can be ready in 10 to 20
              minutes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <Settings className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">1. Fill in your workspace profile</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Add your business name, address, country, invoice sender, IBAN, and contact
                    details in Settings. If you want your invoices to look branded, upload your logo
                    there as well.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">2. Set your next invoice number</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    If you already invoiced elsewhere, continue from your current numbering so your
                    records stay clean. If this is your first system, you can leave the default next
                    number and the app will format it for you automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">3. Add clients manually or import them</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Most users add their first few clients manually. Use CSV import only if you are
                    migrating from a spreadsheet or another tool and already have a client list that
                    you want to clean up into the template.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">4. Decide whether you need Stripe</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Stripe is optional. You only need it if you want clients to pay invoices online
                    by card. If bank transfer or Swiss QR payment is enough, you can skip Stripe for
                    now and finish setup later.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">5. Create the first invoice as a draft</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Drafts do not count against the free plan limit. Create the invoice, review the
                    PDF, and only send it once the business details, numbering, taxes, and payment
                    notes look correct.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3">
                <ReceiptText className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">6. Add expenses and keep receipts attached</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Expenses help you understand whether the month is actually profitable. You can
                    add an expense manually and attach a receipt image or PDF right away, including
                    a phone photo when you are on a mobile device.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={actionLinks.primaryHref}>{actionLinks.primaryLabel}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={actionLinks.secondaryHref}>{actionLinks.secondaryLabel}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="onboarding-service" className="border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Paid setup help
            </p>
            <CardTitle className="text-2xl text-slate-950 dark:text-slate-50">Need hands-on support?</CardTitle>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              If you would rather have a human help you configure the workspace, Sierra Invoices
              offers a CHF 99 onboarding service.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">This support can help with</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Business profile, branding, and invoice numbering setup</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Guidance for Stripe if you want online card payments</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Help importing or creating your first client records</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Help checking the first invoice before it is sent</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
              Contact{" "}
              <a
                href={onboardingMailtoHref}
                className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200"
              >
                {legalProfile.supportEmail}
              </a>{" "}
              and mention your business name, whether you want card payments, and whether you
              already keep clients in a spreadsheet.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual clients vs CSV import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>
              Manual creation is the normal path for small businesses and freelancers. It is faster
              when you only have a few clients.
            </p>
            <p>
              CSV import is mainly for migration. If you use it, download the template first and
              adapt your spreadsheet to the exact columns the app expects.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free vs Pro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>
              Free workspaces can issue 3 official invoices per calendar month. Drafts stay free
              until you turn them into official invoices.
            </p>
            <p>Pro costs CHF 19 per month and removes the invoice limit.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receipts and expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>
              Add expenses from the Expenses page and attach the receipt immediately or later from
              the edit screen.
            </p>
            <p>
              On phones, the file picker can open the camera so you can take a receipt photo on the
              spot.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">An invoice does not look right yet</p>
              <p>
                Keep it as a draft. Check your business profile, sender name, tax lines, invoice
                numbering, payment notes, and client language before sending.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">A client import fails</p>
              <p>
                Download the official template again, make sure the headers match exactly, and check
                whether duplicate client emails are being skipped.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Stripe is not connected yet</p>
              <p>
                You can still invoice without it. Stripe only matters if you want card payments
                online. Bank transfer and Swiss QR billing can work without Stripe.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">You reached the free invoice limit</p>
              <p>
                Existing invoices stay available. Only the next official invoice is blocked until
                the new month starts or the workspace upgrades to Pro.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>After the first invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Send reminders from the invoice workspace</p>
              <p>
                Sent and overdue invoices can be followed up directly from the Invoices page. That
                keeps collections work in one place.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Use Analytics to understand the month</p>
              <p>
                Analytics shows cash collected, expenses, overdue exposure, and how much of this
                month&apos;s issued work is still open.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Keep receipts attached as you go</p>
              <p>
                Attaching receipt files when you create or edit expenses makes later bookkeeping and
                review much easier.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <CircleHelp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              Legal and contact links
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Pricing, billing, onboarding, and contact details are also described in the public
              legal pages.
            </p>
          </div>
          <LegalLinks source="public" />
        </div>
      </section>
    </div>
  );
}
