import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  ReceiptSwissFranc,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RedirectIfAuthenticated from "@/components/RedirectIfAuthenticated";
import { APP_NAME } from "@/lib/appBrand";

const benefitCards = [
  {
    title: "Swiss-ready invoicing",
    description: "Create polished invoices with clear business details, payment information, and QR-bill support.",
    icon: ReceiptSwissFranc,
  },
  {
    title: "See cash flow clearly",
    description: "Track paid, unpaid, and overdue invoices without losing sight of what is still expected.",
    icon: FileClock,
  },
  {
    title: "Payment links built in",
    description: "Send client-friendly invoice emails with downloadable PDFs and online payment options.",
    icon: CircleDollarSign,
  },
];

const proofPoints = [
  "Branded invoice PDFs and public invoice views",
  "Client management and business settings in one place",
  "Payment links, reminders, and invoice status visibility",
  "Secure business-scoped access with Supabase and Prisma",
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

export default function LandingPage() {
  return (
    <>
      <RedirectIfAuthenticated />
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col justify-center gap-8 py-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_52%,#e2e8f0_100%)] px-8 py-10 md:px-12 md:py-14">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(38,70,83,0.12),transparent_26%)]" />
              <div className="relative space-y-7">
                <div className="space-y-4">
                  <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {APP_NAME}
                  </p>
                  <div className="space-y-4">
                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl md:leading-[0.96]">
                      Swiss invoicing for freelancers and small businesses
                    </h1>
                    <p className="max-w-2xl text-lg leading-8 text-slate-600">
                      Create Swiss-ready invoices, send payment links, and stay in control of paid,
                      pending, and overdue revenue without accounting-suite overhead.
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

                <div className="grid gap-3 sm:grid-cols-3">
                  {benefitCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm"
                      >
                        <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,#0f172a_0%,#1d3557_100%)] px-8 py-10 text-white md:px-10 md:py-14">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    Built for daily billing work
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight">One place to run your invoice flow</h2>
                  <p className="text-sm leading-7 text-white/78">
                    Less generic SaaS overhead, more clarity around invoices, clients, reminders, and
                    incoming payments.
                  </p>
                </div>

                <Card className="border-white/12 bg-white/8 text-white shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">What you can do here</CardTitle>
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
          <Card className="rounded-[28px] border-slate-200">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
              <CardTitle className="text-3xl text-slate-950">Simple plans for getting started, then growing</CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Start free with 3 issued invoices per calendar month, then switch to Pro when you need unlimited invoicing.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {pricingTiers.map((tier) => (
                <div key={tier.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{tier.name}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{tier.price}</p>
                      <p className="mt-1 text-sm text-slate-500">{tier.detail}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
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

          <Card className="rounded-[28px] border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)]">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Optional onboarding</p>
              <CardTitle className="text-3xl text-slate-950">Need help setting up your first workspace?</CardTitle>
              <p className="text-sm leading-7 text-slate-600">
                Book the CHF 99 onboarding service if you want help with business details, invoice numbering,
                Stripe setup, and your first clients or invoices.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-900">What the setup includes</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
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
      </div>
    </>
  );
}
