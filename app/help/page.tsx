import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileSpreadsheet,
  Settings,
  Users,
} from "lucide-react";
import { APP_NAME } from "@/lib/appBrand";
import CopyEmailButton from "@/components/help/CopyEmailButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LegalLinks from "@/components/LegalLinks";
import { getLegalProfile } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Help & Onboarding | ${APP_NAME}`,
  description: `Getting started help and onboarding information for ${APP_NAME}`,
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
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-8 md:py-10">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Help & onboarding
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Start faster, understand the setup steps, and see when the optional human onboarding
              service makes sense.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={returnContent.href}>{returnContent.label}</Link>
            </Button>
            <CopyEmailButton
              email={legalProfile.supportEmail}
              label="Copy support email"
              variant="default"
            />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-medium text-slate-900">{returnContent.title}</p>
          <p className="mt-1 text-sm text-slate-600">{returnContent.description}</p>
          <p className="mt-3 text-sm text-slate-500">
            If the email button does not open your mail app, send your request directly to{" "}
            <span className="font-medium text-slate-700">{legalProfile.supportEmail}</span>.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Start here
            </p>
            <CardTitle className="text-3xl text-slate-950">How to get your first invoice out</CardTitle>
            <p className="text-sm leading-7 text-slate-600">
              Most new workspaces only need a few steps before the first invoice is ready.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <Settings className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">1. Fill in your business settings</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Add your business name, address, IBAN, invoice numbering, and branding in
                    Settings before sending an official invoice.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">2. Create or import your first clients</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    You can add clients one by one or import them with the CSV template from the
                    Clients page.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">3. Decide whether you need Stripe</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Stripe is optional. You only need it if you want clients to pay invoices online
                    by card.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">4. Create and send the first invoice</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Drafts stay free. A free workspace can issue up to 3 official invoices per
                    calendar month before it needs Pro.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={source === "public" ? "/signup" : "/settings"}>Open setup</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={source === "public" ? "/login" : "/clients"}>Open clients</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={source === "public" ? "/login" : "/invoices"}>Open invoices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="onboarding" className="border-amber-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)]">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Optional onboarding
            </p>
            <CardTitle className="text-3xl text-slate-950">CHF 99 setup help</CardTitle>
            <p className="text-sm leading-7 text-slate-600">
              This is a human, manual onboarding service for customers who want help getting their
              workspace ready quickly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-900">What it includes</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Business profile, branding, and invoice numbering setup</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Stripe guidance if you want online card payments</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Help importing or creating your first client records</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-900">What to include in your message</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Your business name and best contact email</li>
                <li>Whether you need Stripe card payments or bank transfer only</li>
                <li>Whether you want help importing clients from a spreadsheet</li>
                <li>Any existing invoice numbering you need to continue from</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CopyEmailButton
                email={legalProfile.supportEmail}
                subject="Sierra Invoices Onboarding Request"
                bodyLines={[
                  "Hello,",
                  "",
                  "I would like help with the CHF 99 Sierra Invoices onboarding service.",
                  "",
                  "Business name:",
                  "Best contact email:",
                  "Do I need Stripe card payments? Yes / No",
                  "Do I need help importing clients? Yes / No",
                  "Current invoice numbering to continue from:",
                ]}
                label="Copy onboarding request"
                className="w-full sm:w-auto"
              />
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={source === "public" ? "/signup" : "/settings"}>Continue setup yourself</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free vs Pro</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Free workspaces can issue 3 official invoices per calendar month. Pro costs CHF 19 per
            month and removes that limit.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client import</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Download the CSV template from the Clients page and import your contacts with strict
            headers for a safer first migration.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need a direct answer?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Support and onboarding requests go to{" "}
            <span className="font-medium text-slate-700">{legalProfile.supportEmail}</span>.
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
              <CircleHelp className="h-4 w-4 text-slate-600" />
              Legal and contact links
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Pricing, billing, and onboarding are also described in the public legal pages.
            </p>
          </div>
          <LegalLinks source="public" />
        </div>
      </section>
    </div>
  );
}
