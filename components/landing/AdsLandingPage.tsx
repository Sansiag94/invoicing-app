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
    sectionEyebrow: string;
    sectionTitle: string;
    sectionLead: string;
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
  proofTitle: string;
  proof: Array<{ label: string; value: string; text: string }>;
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

function SvgPin({ number, x, y }: { number: number; x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill="#059669" stroke="#ffffff" strokeWidth="3" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
        {number}
      </text>
    </g>
  );
}

function InvoiceCanvas({ copy }: { copy: LandingCopy["preview"] }) {
  const rowY = [452, 497, 542];

  return (
    <svg
      viewBox="0 0 595 930"
      role="img"
      aria-label={`${copy.documentLabel} ${copy.invoiceMeta} sample with QR payment slip`}
      className="block h-auto w-full rounded-xl bg-white text-slate-950"
    >
      <rect width="595" height="930" rx="14" fill="#ffffff" />

      <SvgPin number={1} x={38} y={38} />
      <SvgPin number={2} x={560} y={430} />
      <SvgPin number={3} x={292} y={628} />
      <SvgPin number={4} x={560} y={690} />

      <image
        href="/apple-touch-icon.svg"
        x="55"
        y="45"
        width="64"
        height="64"
        preserveAspectRatio="xMidYMid meet"
      />

      <text x="55" y="142" fontSize="20" fontWeight="700" fill="#020617">{copy.title}</text>
      <text x="55" y="166" fontSize="13" fill="#334155">Your logo and business details</text>
      <text x="55" y="186" fontSize="13" fill="#334155">appear at the top.</text>
      <text x="55" y="212" fontSize="14" fill="#334155">Musterstrasse 10</text>
      <text x="55" y="233" fontSize="14" fill="#334155">8001 Zurich, Switzerland</text>
      <text x="55" y="254" fontSize="14" fill="#334155">hello@example.ch</text>
      <text x="55" y="275" fontSize="14" fill="#334155">+41 44 000 00 00</text>

      <text x="360" y="142" fontSize="20" fontWeight="700" fill="#020617">{copy.clientName}</text>
      <text x="360" y="166" fontSize="14" fill="#334155">Beispielweg 8</text>
      <text x="360" y="187" fontSize="14" fill="#334155">3000 Bern, Switzerland</text>

      <text x="55" y="325" fontSize="28" fontWeight="800" fill="#020617">
        {copy.documentLabel}: {copy.invoiceMeta}
      </text>
      <text x="55" y="350" fontSize="14" fill="#334155">30.06.2026</text>
      <text x="55" y="371" fontSize="14" fill="#334155">{copy.dueLabel}: {copy.dueValue}</text>
      <text x="55" y="392" fontSize="14" fill="#334155">{copy.subjectLabel}: {copy.subjectValue}</text>

      <line x1="55" y1="430" x2="540" y2="430" stroke="#020617" strokeWidth="2" />
      <text x="55" y="417" fontSize="12" fontWeight="700" fill="#334155">{copy.lineHeaders[0].toUpperCase()}</text>
      <text x="103" y="417" fontSize="12" fontWeight="700" fill="#334155">{copy.lineHeaders[1].toUpperCase()}</text>
      <text x="365" y="417" fontSize="12" fontWeight="700" textAnchor="end" fill="#334155">{copy.lineHeaders[2].toUpperCase()}</text>
      <text x="455" y="417" fontSize="12" fontWeight="700" textAnchor="end" fill="#334155">{copy.lineHeaders[3].toUpperCase()}</text>
      <text x="540" y="417" fontSize="12" fontWeight="700" textAnchor="end" fill="#334155">{copy.lineHeaders[4].toUpperCase()}</text>

      {copy.rows.map((row, index) => (
        <g key={row.position}>
          <text x="76" y={rowY[index]} fontSize="14" textAnchor="middle" fill="#020617">{row.position}</text>
          <text x="103" y={rowY[index]} fontSize="14" fill="#020617">{row.label}</text>
          <text x="365" y={rowY[index]} fontSize="14" textAnchor="end" fill="#020617">{row.quantity}</text>
          <text x="455" y={rowY[index]} fontSize="14" textAnchor="end" fill="#020617">{row.unitPrice}</text>
          <text x="540" y={rowY[index]} fontSize="14" textAnchor="end" fill="#020617">{row.value}</text>
          <line x1="55" y1={rowY[index] + 18} x2="540" y2={rowY[index] + 18} stroke="#e2e8f0" />
        </g>
      ))}

      <line x1="320" y1="585" x2="540" y2="585" stroke="#cbd5e1" />
      <text x="320" y="615" fontSize="15" fill="#334155">Subtotal</text>
      <text x="540" y="615" fontSize="15" textAnchor="end" fill="#334155">{copy.totalValue}</text>
      <text x="320" y="650" fontSize="28" fontWeight="800" fill="#020617">Total</text>
      <text x="540" y="650" fontSize="24" fontWeight="800" textAnchor="end" fill="#020617">{copy.totalValue}</text>

      <line x1="0" y1="665" x2="595" y2="665" stroke="#020617" strokeDasharray="3 3" />
      <line x1="200" y1="680" x2="200" y2="880" stroke="#020617" strokeDasharray="3 3" />

      <text x="35" y="695" fontSize="15" fontWeight="800" fill="#020617">{copy.receiptTitle}</text>
      <text x="35" y="730" fontSize="10" fontWeight="800" fill="#020617">{copy.accountLabel}</text>
      <text x="35" y="746" fontSize="10" fill="#020617">CH00 0000 0000 0000 0000 0</text>
      <text x="35" y="762" fontSize="10" fill="#020617">{copy.title}</text>
      <text x="35" y="778" fontSize="10" fill="#020617">8001 Zurich</text>
      <text x="35" y="812" fontSize="10" fontWeight="800" fill="#020617">{copy.payableByLabel}</text>
      <text x="35" y="828" fontSize="10" fill="#020617">{copy.clientName}</text>
      <text x="35" y="844" fontSize="10" fill="#020617">3000 Bern</text>
      <text x="35" y="875" fontSize="10" fontWeight="800" fill="#020617">CHF</text>
      <text x="145" y="875" fontSize="10" fontWeight="800" textAnchor="end" fill="#020617">{copy.totalValue.replace("CHF ", "")}</text>

      <text x="225" y="695" fontSize="15" fontWeight="800" fill="#020617">{copy.paymentPartTitle}</text>
      <image href="/qr-invoices-sierraservices.svg" x="225" y="720" width="112" height="112" />
      <text x="360" y="730" fontSize="10" fontWeight="800" fill="#020617">{copy.accountLabel}</text>
      <text x="360" y="746" fontSize="10" fill="#020617">CH00 0000 0000 0000 0000 0</text>
      <text x="360" y="762" fontSize="10" fill="#020617">{copy.title}</text>
      <text x="360" y="778" fontSize="10" fill="#020617">8001 Zurich</text>
      <text x="360" y="812" fontSize="10" fontWeight="800" fill="#020617">{copy.payableByLabel}</text>
      <text x="360" y="828" fontSize="10" fill="#020617">{copy.clientName}</text>
      <text x="360" y="844" fontSize="10" fill="#020617">3000 Bern</text>
      <text x="360" y="875" fontSize="10" fontWeight="800" fill="#020617">CHF</text>
      <text x="438" y="875" fontSize="10" fontWeight="800" fill="#020617">{copy.totalValue.replace("CHF ", "")}</text>
      <text x="360" y="898" fontSize="10" fontWeight="800" fill="#020617">{copy.payableToLabel}</text>
      <text x="360" y="914" fontSize="10" fill="#020617">{copy.paymentReference}</text>
    </svg>
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
        <InvoiceCanvas copy={copy} />
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
      <section className="overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)] lg:items-center lg:py-20">
          <div className="max-w-3xl space-y-7">
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

          <aside className="w-full max-w-xl lg:justify-self-end lg:border-l lg:border-slate-200 lg:pl-8">
            <p className="max-w-sm text-xl font-semibold leading-7 tracking-tight text-slate-950">
              {copy.proofTitle}
            </p>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 bg-white/60 lg:bg-transparent">
              {copy.proof.map((item) => (
                <div key={item.label} className="py-5">
                  <div className="grid grid-cols-[1fr_auto] items-baseline gap-5">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="text-xl font-semibold tracking-tight text-slate-950">{item.value}</span>
                  </div>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>{copy.preview.sectionEyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">{copy.preview.sectionTitle}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{copy.preview.sectionLead}</p>
          </div>
          <div className="mt-10">
            <ProductPreview copy={copy.preview} />
          </div>
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
