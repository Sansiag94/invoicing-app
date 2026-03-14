"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDollarSign, ReceiptSwissFranc, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AuthSplitShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  alternateLabel: string;
  alternateHref: string;
  alternateText: string;
  children: React.ReactNode;
};

const highlights = [
  {
    title: "Swiss-ready invoices",
    description: "Clean invoice PDFs with QR-bill support and professional client presentation.",
    icon: ReceiptSwissFranc,
  },
  {
    title: "Payment links included",
    description: "Send invoices with clear online payment options and downloadable PDF attachments.",
    icon: CircleDollarSign,
  },
  {
    title: "Clear business control",
    description: "Track paid, pending, and overdue invoices without losing sight of your cash flow.",
    icon: ShieldCheck,
  },
];

export default function AuthSplitShell({
  eyebrow,
  title,
  description,
  alternateLabel,
  alternateHref,
  alternateText,
  children,
}: AuthSplitShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center">
      <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.2fr_0.9fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1d3557_45%,#264653_100%)] px-8 py-10 text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                Sierra Invoices
              </p>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold leading-[1.02] tracking-tight md:text-5xl">
                  Professional invoicing for Swiss businesses
                </h1>
                <p className="max-w-lg text-base leading-7 text-white/78 md:text-lg">
                  Create clean invoices, send payment links, and keep full visibility over what is
                  paid, pending, or overdue.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm"
                  >
                    <div className="mb-3 inline-flex rounded-xl bg-white/12 p-2.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">{item.description}</p>
                  </div>
                );
              })}
            </div>

            <Card className="border-white/12 bg-white/8 text-white shadow-none">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                    What you get
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-white/82">
                    <li className="inline-flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      Branded invoice PDFs and client-ready online views
                    </li>
                    <li className="inline-flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      Payment links, overdue tracking, and status visibility
                    </li>
                    <li className="inline-flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      One workspace for clients, invoices, and business settings
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/12 bg-slate-950/20 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">{eyebrow}</p>
                  <p className="mt-2 max-w-[11rem] text-sm leading-6 text-white/80">
                    Everything starts with one focused billing workspace.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-8 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>

            {children}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{alternateText}</p>
              <Link
                href={alternateHref}
                className="mt-2 inline-flex items-center gap-2 font-medium text-slate-900 underline underline-offset-4"
              >
                {alternateLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
