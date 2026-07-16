import Link from "next/link";
import Image from "next/image";
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
import ClarityExitLink from "@/components/landing/ClarityExitLink";
import CookieConsentBanner from "@/components/landing/CookieConsentBanner";
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
    documentLabel: string;
    invoiceMeta: string;
    clientLabel: string;
    clientName: string;
    totalLabel: string;
    totalValue: string;
    dueLabel: string;
    dueValue: string;
    qrTitle: string;
    qrText: string;
    paymentReference: string;
    receiptTitle: string;
    paymentPartTitle: string;
    accountLabel: string;
    payableToLabel: string;
    payableByLabel: string;
    currencyLabel: string;
    subjectLabel: string;
    subjectValue: string;
    lineHeaders: [string, string, string, string, string];
    callouts: {
      logo: string;
      details: string;
      qr: string;
      reference: string;
    };
    rows: Array<{ position: string; label: string; quantity: string; unitPrice: string; value: string }>;
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

const qrPattern = new Set([
  0, 1, 2, 3, 5, 6, 7, 8, 10, 13, 17, 18, 20, 22, 24, 26, 27, 31, 35, 36, 38,
  39, 41, 44, 45, 47, 49, 50, 53, 54, 56, 58, 62, 63, 64, 66, 67, 70, 72, 73,
  74, 75, 77, 78, 79, 80,
]);

function FakeQrCode() {
  return (
    <div className="grid h-24 w-24 shrink-0 grid-cols-9 gap-1 bg-white p-1.5">
      {Array.from({ length: 81 }).map((_, index) => (
        <span
          key={index}
          className={qrPattern.has(index) ? "rounded-[2px] bg-slate-950" : "rounded-[2px] bg-slate-100"}
        />
      ))}
    </div>
  );
}

function Pin({ number, className }: { number: number; className: string }) {
  return (
    <span className={`absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[0.72rem] font-bold text-white shadow-md ${className}`}>
      {number}
    </span>
  );
}

function InvoicePreview({ copy }: { copy: LandingCopy["preview"] }) {
  const callouts = [
    copy.callouts.logo,
    copy.callouts.details,
    copy.callouts.qr,
    copy.callouts.reference,
  ];

  return (
    <div className="mx-auto grid w-full max-w-[52rem] gap-4 xl:grid-cols-[minmax(0,37rem)_14rem] xl:items-center">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-100 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        <div className="relative overflow-hidden rounded-xl bg-white text-slate-950">
          <div className="relative min-h-[39rem] p-6 sm:p-8">
            <Pin number={1} className="left-5 top-5" />
            <Pin number={2} className="right-5 top-[23rem]" />

            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <Image
                  src="/apple-touch-icon.svg"
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-none"
                />
                <p className="mt-3 text-lg font-bold leading-tight">{copy.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{copy.subtitle}</p>
                <p className="text-sm leading-5 text-slate-700">Musterstrasse 10<br />8001 Zurich, Switzerland</p>
                <p className="mt-1 text-sm leading-5 text-slate-700">hello@example.ch<br />+41 44 000 00 00</p>
              </div>
              <div className="pt-12 sm:pt-20">
                <p className="text-lg font-bold leading-tight">{copy.clientName}</p>
                <p className="mt-1 text-sm leading-5 text-slate-700">Beispielweg 8<br />3000 Bern, Switzerland</p>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-2xl font-bold tracking-tight">
                {copy.documentLabel}: {copy.invoiceMeta}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">30.06.2026</p>
              <p className="text-sm leading-5 text-slate-600">{copy.dueLabel}: {copy.dueValue}</p>
              <p className="text-sm leading-5 text-slate-600">{copy.subjectLabel}: {copy.subjectValue}</p>
            </div>

            <div className="mt-4 overflow-hidden text-xs sm:text-sm">
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_4rem_4rem] border-b-2 border-slate-950 py-2 text-[0.62rem] font-bold uppercase text-slate-600 sm:grid-cols-[3rem_minmax(0,1fr)_4rem_5.5rem_5.5rem] sm:text-xs">
                {copy.lineHeaders.map((header, index) => (
                  <span key={header} className={index === 0 || index === 1 ? "" : "text-right"}>
                    {header}
                  </span>
                ))}
              </div>
              {copy.rows.map((row) => (
                <div key={row.position} className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_4rem_4rem] border-b border-slate-200 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_4rem_5.5rem_5.5rem]">
                  <span className="text-center text-slate-700">{row.position}</span>
                  <span>{row.label}</span>
                  <span className="text-right">{row.quantity}</span>
                  <span className="text-right">{row.unitPrice}</span>
                  <span className="text-right">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="relative ml-auto mt-8 w-full max-w-[18rem] border-t border-slate-300 pt-3">
              <Pin number={3} className="-left-3 top-9" />
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{copy.totalValue}</span>
              </div>
              <div className="mt-1 flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{copy.totalValue}</span>
              </div>
            </div>
          </div>

          <div className="relative border-t border-dashed border-slate-950 bg-white p-4 text-[0.68rem]">
            <Pin number={4} className="left-5 top-4" />
            <div className="grid gap-4 sm:grid-cols-[0.74fr_1px_1.26fr]">
              <div>
                <p className="text-sm font-bold">{copy.receiptTitle}</p>
                <dl className="mt-4 space-y-3 leading-4">
                  <div>
                    <dt className="font-bold">{copy.accountLabel}</dt>
                    <dd>CH00 0000 0000 0000 0000 0<br />{copy.title}<br />8001 Zurich</dd>
                  </div>
                  <div>
                    <dt className="font-bold">{copy.payableByLabel}</dt>
                    <dd>{copy.clientName}<br />3000 Bern</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-8">
                    <div>
                      <dt className="font-bold">CHF</dt>
                    </div>
                    <div>
                      <dt className="font-bold">{copy.totalValue.replace("CHF ", "")}</dt>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="hidden border-l border-dashed border-slate-950 sm:block" />

              <div>
                <p className="text-sm font-bold">{copy.paymentPartTitle}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
                  <FakeQrCode />
                  <dl className="space-y-3 leading-4">
                    <div>
                      <dt className="font-bold">{copy.accountLabel}</dt>
                      <dd>CH00 0000 0000 0000 0000 0<br />{copy.title}<br />8001 Zurich</dd>
                    </div>
                    <div>
                      <dt className="font-bold">{copy.payableByLabel}</dt>
                      <dd>{copy.clientName}<br />3000 Bern</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="font-bold">CHF</dt>
                      </div>
                      <div>
                        <dt className="font-bold">{copy.totalValue.replace("CHF ", "")}</dt>
                      </div>
                    </div>
                  </dl>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
                  <span />
                  <div>
                    <p className="font-bold">{copy.payableToLabel}</p>
                    <p className="mt-1 leading-4">{copy.paymentReference}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.documentLabel}</p>
        <p className="mt-2 text-lg font-semibold text-slate-950">{copy.invoiceMeta}</p>
        <div className="mt-4 space-y-3">
          {callouts.map((callout, index) => (
            <div key={callout} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm font-medium leading-6 text-slate-700">{callout}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductPreview({ copy }: { copy: LandingCopy["preview"] }) {
  return (
    <InvoicePreview copy={copy} />
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
          try {
            window.clarity(
              "consent",
              window.localStorage.getItem("sierra-invoices-analytics-consent") === "accepted"
            );
          } catch (error) {
            window.clarity("consent", false);
          }
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
                <ClarityExitLink href="/signup">
                  {copy.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </ClarityExitLink>
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
                <ClarityExitLink href="/signup">{copy.primaryCta}</ClarityExitLink>
              </Button>
            </div>
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-lg font-semibold">{copy.sections.proTitle}</p>
              <p className="mt-3 text-4xl font-semibold">{copy.sections.proPrice}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{copy.sections.proText}</p>
              <Button asChild className="mt-6 w-full bg-white text-slate-950 hover:bg-slate-100">
                <ClarityExitLink href="/signup">{copy.primaryCta}</ClarityExitLink>
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
              <ClarityExitLink href="/signup">
                {copy.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </ClarityExitLink>
            </Button>
          </div>
        </div>
      </section>
      </div>
      <CookieConsentBanner />
    </>
  );
}

export type { LandingCopy };
