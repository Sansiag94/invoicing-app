"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@/lib/appBrand";

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
  "Swiss-ready invoices with QR-bill support",
  "Payment links, reminders, and status visibility",
  "Clients, invoices, and expenses in one workspace",
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
      <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="order-2 relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1d3557_45%,#264653_100%)] px-8 py-8 text-white md:px-12 md:py-14 lg:order-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="relative space-y-6">
            <div className="space-y-4">
              <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                {APP_NAME}
              </p>
              <div className="space-y-3">
                <h1 className="max-w-xl text-3xl font-semibold leading-[1.02] tracking-tight md:text-5xl">
                  Swiss-ready invoicing, kept focused
                </h1>
                <p className="max-w-lg text-sm leading-6 text-white/78 md:text-lg md:leading-7">
                  Clean invoicing, clear payment tracking, and less admin noise for freelancers and small businesses.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">{eyebrow}</p>
              <div className="mt-4 space-y-3 text-sm text-white/82">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-8 dark:bg-[linear-gradient(180deg,#0f172a_0%,#131c30_100%)] md:px-10 md:py-12 lg:order-2">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {eyebrow}
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            </div>

            {children}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/85 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">{alternateText}</p>
              <Link
                href={alternateHref}
                className="mt-2 inline-flex items-center gap-2 font-medium text-slate-900 underline underline-offset-4 dark:text-slate-100"
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
