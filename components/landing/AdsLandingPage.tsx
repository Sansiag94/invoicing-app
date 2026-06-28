import Link from "next/link";
import Script from "next/script";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  LockKeyhole,
  MonitorSmartphone,
  ReceiptText,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appBrand";

type LandingCopy = {
  eyebrow: string;
  h1: string;
  lead: string;
  installText: string;
  primaryCta: string;
  secondaryCta: string;
  secondaryHref: string;
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
    painTitle: string;
    painLead: string;
    painPoints: string[];
    solutionTitle: string;
    solutionText: string;
    benefitsTitle: string;
    benefitsLead: string;
    benefits: Array<{ title: string; text: string }>;
    workflowTitle: string;
    workflowLead: string;
    workflow: Array<{ title: string; text: string }>;
    socialTitle: string;
    socialLead: string;
    socialItems: Array<{ label: string; value: string }>;
    comparisonTitle: string;
    comparisonLead: string;
    comparisonHeaders: [string, string];
    comparisonRows: Array<{ label: string; sierra: string; traditional: string }>;
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

const benefitIcons = [ReceiptText, Clock3, Banknote, BellRing, Users, BarChart3];
const workflowIcons = [UserPlus, FileText, Send, CheckCircle2];

function ProductPreview({ copy }: { copy: LandingCopy["preview"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[35rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 text-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold">{copy.title}</p>
            <p className="mt-1 text-xs text-slate-500">{copy.subtitle}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            QR-bill
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">{copy.totalLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{copy.totalValue}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">{copy.openLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{copy.openValue}</p>
          </div>
        </div>

        <div className="space-y-2">
          {copy.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950">
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

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {children}
    </p>
  );
}

export default function AdsLandingPage({ copy }: { copy: LandingCopy }) {
  return (
    <>
      <Script id="microsoft-clarity-ads" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "xe5kuqauwg");
        `}
      </Script>
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-slate-50 text-slate-950">
      <section className="min-h-[calc(100svh-2rem)] overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950">
        <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl gap-10 px-5 py-8 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-10">
          <div className="max-w-2xl space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-sm">
                {APP_NAME}
              </span>
              <Link href={copy.switchHref} className="inline-flex items-center gap-2 text-sm text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">
                <Languages className="h-4 w-4" />
                {copy.switchLabel}
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">{copy.eyebrow}</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[0.96]">
                {copy.h1}
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600">{copy.lead}</p>
              <div className="inline-flex max-w-xl items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950">
                <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <span>{copy.installText}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  {copy.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white">
                <Link href={copy.secondaryHref}>{copy.secondaryCta}</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {copy.badges.map((badge) => (
                <div key={badge} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
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
          <SectionEyebrow>Problem</SectionEyebrow>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.painTitle}</h2>
          <p className="text-base leading-8 text-slate-600">{copy.sections.painLead}</p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-2">
              {copy.sections.painPoints.map((point) => (
                <div key={point} className="flex gap-3 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <p className="text-xl font-semibold">{copy.sections.solutionTitle}</p>
            <p className="mt-3 text-sm leading-7 text-emerald-900/80">{copy.sections.solutionText}</p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="max-w-3xl space-y-4">
            <SectionEyebrow>Benefits</SectionEyebrow>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.benefitsTitle}</h2>
            <p className="text-base leading-8 text-slate-600">{copy.sections.benefitsLead}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {copy.sections.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index] ?? FileText;
              return (
                <div key={benefit.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <Icon className="h-5 w-5 text-slate-700" />
                  <p className="mt-4 font-semibold">{benefit.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.workflowTitle}</h2>
          <p className="text-base leading-8 text-slate-600">{copy.sections.workflowLead}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {copy.sections.workflow.map((step, index) => {
            const Icon = workflowIcons[index] ?? CheckCircle2;
            return (
              <div key={step.title} className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-400">0{index + 1}</span>
                </div>
                <p className="mt-4 font-semibold">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.socialTitle}</h2>
            <p className="text-base leading-8 text-slate-600">{copy.sections.socialLead}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {copy.sections.socialItems.map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-3xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <SectionEyebrow>Comparison</SectionEyebrow>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.comparisonTitle}</h2>
          <p className="text-base leading-8 text-slate-600">{copy.sections.comparisonLead}</p>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-[1.15fr_1fr_1fr] bg-slate-100 text-sm font-semibold text-slate-700">
              <div className="p-4" />
              <div className="p-4">{copy.sections.comparisonHeaders[0]}</div>
              <div className="p-4">{copy.sections.comparisonHeaders[1]}</div>
            </div>
            {copy.sections.comparisonRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1.15fr_1fr_1fr] border-t border-slate-200 text-sm">
                <div className="p-4 font-semibold">{row.label}</div>
                <div className="p-4 text-slate-700">{row.sierra}</div>
                <div className="p-4 text-slate-500">{row.traditional}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <SectionEyebrow>Pricing</SectionEyebrow>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.pricingTitle}</h2>
            <p className="text-base leading-8 text-slate-600">{copy.sections.pricingLead}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-lg font-semibold">{copy.sections.freeTitle}</p>
              <p className="mt-3 text-4xl font-semibold">{copy.sections.freePrice}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy.sections.freeText}</p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/signup">{copy.primaryCta}</Link>
              </Button>
            </div>
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-lg font-semibold">{copy.sections.proTitle}</p>
              <p className="mt-3 text-4xl font-semibold">{copy.sections.proPrice}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{copy.sections.proText}</p>
              <Button asChild className="mt-6 w-full bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/signup">{copy.primaryCta}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trust</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{copy.sections.trustTitle}</h2>
            <p className="text-base leading-8 text-slate-600">{copy.sections.trustLead}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {copy.sections.trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-700">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionEyebrow>FAQ</SectionEyebrow>
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
    </>
  );
}

export type { LandingCopy };
