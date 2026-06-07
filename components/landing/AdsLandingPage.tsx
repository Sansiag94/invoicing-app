import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appBrand";

type LandingCopy = {
  eyebrow: string;
  h1: string;
  lead: string;
  primaryCta: string;
  secondaryCta: string;
  switchLabel: string;
  switchHref: string;
  badges: string[];
  preview: {
    title: string;
    subtitle: string;
    totalLabel: string;
    totalValue: string;
    openLabel: string;
    openValue: string;
    rows: Array<{ label: string; client: string; value: string; status: string }>;
  };
  proof: Array<{ label: string; value: string }>;
  sections: {
    whyTitle: string;
    whyLead: string;
    features: Array<{ title: string; text: string }>;
    workflowTitle: string;
    workflowLead: string;
    workflow: Array<{ title: string; text: string }>;
    pricingTitle: string;
    pricingLead: string;
    freeTitle: string;
    freePrice: string;
    freeText: string;
    proTitle: string;
    proPrice: string;
    proText: string;
    trustTitle: string;
    trustLead: string;
    trustItems: string[];
    faqTitle: string;
    faq: Array<{ question: string; answer: string }>;
    finalTitle: string;
    finalLead: string;
  };
};

const featureIcons = [FileText, ReceiptText, Clock3];
const workflowIcons = [Banknote, Languages, ShieldCheck];

function ProductPreview({ copy }: { copy: LandingCopy["preview"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-white/16 bg-white/10 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.35)] backdrop-blur">
      <div className="rounded-[1.35rem] bg-slate-950/70 p-4 text-white">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-sm font-semibold">{copy.title}</p>
            <p className="mt-1 text-xs text-white/55">{copy.subtitle}</p>
          </div>
          <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-semibold text-slate-950">
            QR-bill
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/45">{copy.totalLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{copy.totalValue}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/45">{copy.openLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{copy.openValue}</p>
          </div>
        </div>

        <div className="space-y-2">
          {copy.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl bg-white px-3 py-3 text-slate-950">
              <div>
                <p className="text-sm font-semibold">{row.label}</p>
                <p className="text-xs text-slate-500">{row.client}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{row.value}</p>
                <p className="text-xs font-medium text-emerald-700">{row.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdsLandingPage({ copy }: { copy: LandingCopy }) {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-slate-50 text-slate-950">
      <section className="min-h-[calc(100svh-2rem)] overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl gap-10 px-5 py-8 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-10">
          <div className="max-w-2xl space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                {APP_NAME}
              </span>
              <Link href={copy.switchHref} className="inline-flex items-center gap-2 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
                <Languages className="h-4 w-4" />
                {copy.switchLabel}
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">{copy.eyebrow}</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[0.96]">
                {copy.h1}
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">{copy.lead}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/signup">
                  {copy.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/help">{copy.secondaryCta}</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {copy.badges.map((badge) => (
                <div key={badge} className="flex items-start gap-2 rounded-2xl border border-white/12 bg-white/6 px-3 py-3 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          <ProductPreview copy={copy.preview} />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 md:grid-cols-3 md:px-8">
          {copy.proof.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 md:border-b-0 md:border-r md:pr-6 md:last:border-r-0">
              <span className="text-sm text-slate-500">{item.label}</span>
              <span className="text-lg font-semibold text-slate-950">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fit</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.whyTitle}</h2>
          <p className="text-base leading-8 text-slate-600">{copy.sections.whyLead}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.sections.features.map((feature, index) => {
            const Icon = featureIcons[index] ?? FileText;
            return (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Icon className="h-5 w-5 text-slate-700" />
                <p className="mt-4 font-semibold">{feature.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {copy.sections.workflow.map((step, index) => {
              const Icon = workflowIcons[index] ?? ShieldCheck;
              return (
                <div key={step.title} className="border-t border-slate-200 pt-5">
                  <Icon className="h-5 w-5 text-slate-700" />
                  <p className="mt-4 font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.workflowTitle}</h2>
            <p className="text-base leading-8 text-slate-600">{copy.sections.workflowLead}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.pricingTitle}</h2>
          <p className="text-base leading-8 text-slate-600">{copy.sections.pricingLead}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-lg font-semibold">{copy.sections.freeTitle}</p>
            <p className="mt-3 text-4xl font-semibold">{copy.sections.freePrice}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{copy.sections.freeText}</p>
          </div>
          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-lg font-semibold">{copy.sections.proTitle}</p>
            <p className="mt-3 text-4xl font-semibold">{copy.sections.proPrice}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{copy.sections.proText}</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Trust</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.trustTitle}</h2>
            <p className="text-base leading-8 text-slate-300">{copy.sections.trustLead}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {copy.sections.trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3 border-t border-white/12 pt-4 text-sm leading-6 text-slate-200">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.faqTitle}</h2>
        </div>
        <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
          {copy.sections.faq.map((item) => (
            <div key={item.question} className="p-5">
              <p className="font-semibold">{item.question}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.finalTitle}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{copy.sections.finalLead}</p>
            </div>
            <Button asChild size="lg" className="w-full md:w-auto">
              <Link href="/signup">
                {copy.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export type { LandingCopy };
