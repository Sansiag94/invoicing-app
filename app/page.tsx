import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RedirectIfAuthenticated from "@/components/RedirectIfAuthenticated";
import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

const baseUrl = getPublicInvoiceBaseUrl();

export const metadata: Metadata = {
  title: "Swiss-ready invoicing for freelancers and small businesses",
  description:
    "Create Swiss-ready invoices with QR-bill support, payment links, reminders, expenses, and a free plan with 3 issued invoices per month.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${APP_NAME} | Swiss-ready invoicing for freelancers and small businesses`,
    description:
      "Create Swiss-ready invoices with QR-bill support, payment links, reminders, expenses, and a free plan with 3 issued invoices per month.",
    url: baseUrl,
  },
  twitter: {
    title: `${APP_NAME} | Swiss-ready invoicing for freelancers and small businesses`,
    description:
      "Create Swiss-ready invoices with QR-bill support, payment links, reminders, expenses, and a free plan with 3 issued invoices per month.",
  },
};

const heroHighlights = [
  "Swiss-ready invoices with QR-bill support",
  "3 issued invoices free every month",
  "CHF 19/month Pro when you need unlimited invoicing",
];

const proofPoints = [
  "Branded invoice PDFs and public invoice views",
  "Payment links, reminders, and invoice status visibility",
  "Clients, expenses, and analytics in one focused workspace",
  "Secure business-scoped access with Supabase and Prisma",
];

const previewInvoices = [
  {
    number: "IN2026-004",
    client: "Example Studio GmbH",
    amount: "CHF 1,250.00",
    status: "paid",
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    number: "IN2026-005",
    client: "Sample Client AG",
    amount: "CHF 280.00",
    status: "sent",
    tone: "bg-amber-100 text-amber-700",
  },
  {
    number: "IN2026-006",
    client: "Demo Wellness Sarl",
    amount: "CHF 441.67",
    status: "draft",
    tone: "bg-slate-100 text-slate-700",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "CHF 0",
    detail: "3 issued invoices per month",
    points: ["Draft invoices stay free", "Client management included", "Swiss-ready invoice PDFs"],
  },
  {
    name: "Pro",
    price: "CHF 19",
    detail: "per month, unlimited invoices",
    points: ["Unlimited issued invoices", "Best fit for active freelancers", "Keeps reminders and payment flow in one place"],
  },
];

const useCases = [
  {
    icon: FileText,
    title: "Send Swiss-ready invoices",
    description:
      "Create invoice PDFs with QR-bill support, clean numbering, VAT breakdowns, and public payment pages.",
  },
  {
    icon: CreditCard,
    title: "Track payments clearly",
    description:
      "See which invoices are draft, sent, paid, overdue, viewed online, or cancelled without stitching together several tools.",
  },
  {
    icon: ReceiptText,
    title: "Keep admin in one workspace",
    description:
      "Manage clients, expenses, reminders, and monthly progress inside one focused invoicing workspace.",
  },
];

const fitSegments = [
  {
    title: "Freelancers and consultants",
    description:
      "A good fit if you invoice clients regularly and want a straightforward workflow without accounting-suite complexity.",
  },
  {
    title: "Small agencies and studios",
    description:
      "Useful when you need client records, branded invoices, reminders, and visibility into what is still unpaid.",
  },
  {
    title: "Small businesses in Switzerland",
    description:
      "Built for Swiss-ready billing with QR-bills, optional online card payments, and manual bank-transfer workflows.",
  },
];

const workflowSteps = [
  {
    title: "1. Set up your workspace",
    description:
      "Add business details, logo, IBAN, invoice numbering, and payment preferences once in Settings.",
  },
  {
    title: "2. Add clients and draft invoices",
    description:
      "Create clients manually or import them if you already keep a spreadsheet, then draft invoices before sending.",
  },
  {
    title: "3. Send, track, and follow up",
    description:
      "Share invoices, monitor payment status, send reminders, and keep monthly revenue and expense visibility in one place.",
  },
];

const faqItems = [
  {
    question: "Is Sierra Invoices built for Switzerland?",
    answer:
      "Yes. The app is positioned around Swiss-ready invoicing, including QR-bill support, VAT visibility, bank-transfer workflows, and optional online card payments.",
  },
  {
    question: "Can I start for free?",
    answer:
      "Yes. The free plan includes 3 issued invoices per calendar month. Draft invoices stay free, so you can prepare and review them before sending.",
  },
  {
    question: "Do I need Stripe to use the app?",
    answer:
      "No. Stripe is optional and only needed if you want clients to pay invoices online by card. You can still use bank transfer and Swiss QR payment without Stripe.",
  },
  {
    question: "Who is the app best for?",
    answer:
      "It is best for freelancers, consultants, agencies, and small businesses that want simpler billing, payment tracking, reminders, and client visibility in one focused workspace.",
  },
  {
    question: "Can I get help setting up my workspace?",
    answer:
      "Yes. Sierra Invoices offers an optional CHF 99 onboarding service if you want help with business details, invoice numbering, Stripe setup, or your first clients and invoices.",
  },
];

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    url: baseUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Swiss-ready invoicing for freelancers and small businesses with QR-bill support, payment links, reminders, expenses, and analytics.",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CHF",
        description: "Free plan with 3 issued invoices per calendar month",
      },
      {
        "@type": "Offer",
        price: "19",
        priceCurrency: "CHF",
        description: "Pro plan with unlimited invoices",
      },
    ],
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Script
        id="sierra-invoices-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="sierra-invoices-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <RedirectIfAuthenticated />
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col justify-center gap-8 py-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_52%,#e2e8f0_100%)] px-8 py-10 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#1e293b_100%)] md:px-12 md:py-14">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(38,70,83,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_26%)]" />
              <div className="relative space-y-7">
                <div className="space-y-4">
                  <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-300">
                    {APP_NAME}
                  </p>
                  <div className="space-y-4">
                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-6xl md:leading-[0.96]">
                      Swiss invoicing for freelancers and small businesses
                    </h1>
                    <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                      Create Swiss-ready invoices with QR-bill support, send payment links, and start
                      free with 3 official invoices per month before switching to Pro at CHF 19/month.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button asChild size="lg" className="w-full sm:min-w-[12rem] sm:w-auto">
                    <Link href="/signup">
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full sm:min-w-[12rem] sm:w-auto"
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {heroHighlights.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,#0f172a_0%,#1d3557_100%)] px-8 py-10 text-white md:px-10 md:py-14">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    Workspace preview
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight">One place to run your invoice flow</h2>
                  <p className="text-sm leading-7 text-white/78">
                    A focused workspace for invoices, clients, payments, and the month in progress.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/12 bg-white/8 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)] backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Dashboard</p>
                      <p className="text-xs text-white/60">Monthly invoicing overview</p>
                    </div>
                    <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                      Free plan
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Issued</p>
                      <p className="mt-2 text-lg font-semibold text-white">CHF 1,971</p>
                      <p className="text-xs text-white/65">this month</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Collected</p>
                      <p className="mt-2 text-lg font-semibold text-white">CHF 1,530</p>
                      <p className="text-xs text-white/65">cash received</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Open</p>
                      <p className="mt-2 text-lg font-semibold text-white">CHF 441</p>
                      <p className="text-xs text-white/65">still unpaid</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">Recent invoices</p>
                      <p className="text-xs text-white/55">Status at a glance</p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {previewInvoices.map((invoice) => (
                        <div key={invoice.number} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{invoice.number}</p>
                            <p className="text-xs text-white/60">{invoice.client}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-white/82">{invoice.amount}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${invoice.tone}`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Card className="border-white/12 bg-white/8 text-white shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Why teams pick it</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-white/80">
                    {proofPoints.map((item) => (
                      <div key={item} className="inline-flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="rounded-2xl border border-white/12 bg-slate-950/20 p-5">
                  <div className="inline-flex items-center gap-2 text-white/70">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Secure by design</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/78">
                    Business-scoped access, reliable authentication, and a workflow centered on sending
                    professional invoices rather than juggling multiple disconnected tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">Simple plans for getting started, then growing</CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Start free with 3 issued invoices per calendar month, then switch to Pro when you need unlimited invoicing.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {pricingTiers.map((tier) => (
                <div key={tier.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{tier.name}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{tier.price}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tier.detail}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {tier.points.map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0f172a_100%)]">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Optional onboarding</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">Need help setting up your first workspace?</CardTitle>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Book the CHF 99 onboarding service if you want help with business details, invoice numbering,
                Stripe setup, and your first clients or invoices.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-900/60 dark:bg-slate-950/70">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">What the setup includes</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>Business profile, branding, and invoice numbering</span>
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
              <Button asChild size="lg" className="w-full">
                <Link href="/help#onboarding">
                  Ask About CHF 99 Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What it helps with</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">
                Built for the real invoicing workflow, not just invoice creation
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Sierra Invoices is designed for the full billing loop: creating Swiss-ready invoices,
                tracking what has been paid, following up on unpaid invoices, and keeping expenses visible.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {useCases.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="inline-flex rounded-2xl bg-slate-900 p-2 text-white dark:bg-slate-100 dark:text-slate-950">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-50">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Best fit</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">
                A focused invoicing app for freelancers and small businesses
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                If you need a simpler way to invoice clients in Switzerland without taking on a full accounting platform, this is the use case the app is built around.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {fitSegments.map((segment, index) => {
                const icons = [Users, Building2, Landmark];
                const Icon = icons[index] ?? Users;

                return (
                  <div
                    key={segment.title}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="mt-0.5 inline-flex rounded-xl bg-white p-2 text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-950 dark:text-slate-50">{segment.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{segment.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">
                Get started without a heavy setup project
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Most users can start by filling in business details, adding a few clients, and sending the first invoice as a draft before going live.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="font-medium text-slate-950 dark:text-slate-50">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{step.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trust and support</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">
                Clear public pages, simple pricing, and optional human help
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                The public app pages explain the pricing, legal terms, and first-setup process so new users can understand the product before creating an account.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-950 dark:text-slate-50">Public legal and support pages</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      Review the app homepage, help guide, imprint, privacy policy, and terms before signing up.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <Link href="/help" className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200">
                        Help guide
                      </Link>
                      <Link href="/terms" className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200">
                        Terms
                      </Link>
                      <Link href="/privacy" className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200">
                        Privacy
                      </Link>
                      <Link href="/imprint" className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200">
                        Imprint
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 h-5 w-5 text-sky-600" />
                  <div>
                    <p className="font-medium text-slate-950 dark:text-slate-50">Transparent plan logic</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      Drafts stay free, the free plan includes 3 issued invoices per month, and Pro removes the issuing limit when the business needs it.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="rounded-[28px] border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
              <CardTitle className="text-3xl text-slate-950 dark:text-slate-50">
                Common questions about Sierra Invoices
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                These are the questions new users usually ask before trying the app.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start gap-3">
                    <CircleHelp className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-950 dark:text-slate-50">{item.question}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
