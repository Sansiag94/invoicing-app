import type { Metadata } from "next";
import AdsLandingPage, { type LandingCopy } from "@/components/landing/AdsLandingPage";
import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

const baseUrl = getPublicInvoiceBaseUrl();
const pageUrl = `${baseUrl}/invoice-software-switzerland`;

export const metadata: Metadata = {
  title: "Swiss Invoice Software | QR-Bill Invoicing for Freelancers & Small Businesses",
  description:
    "Create Swiss-compliant invoices with QR-bills, payment tracking and reminders. Designed for freelancers and small businesses. Start free today.",
  alternates: {
    canonical: "/invoice-software-switzerland",
    languages: {
      de: "/rechnung-software-schweiz",
      en: "/invoice-software-switzerland",
    },
  },
  openGraph: {
    title: "Swiss Invoice Software | QR-Bill Invoicing for Freelancers & Small Businesses",
    description:
      "Create Swiss-compliant invoices with QR-bills, payment tracking and reminders. Designed for freelancers and small businesses.",
    url: pageUrl,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swiss Invoice Software | QR-Bill Invoicing for Freelancers & Small Businesses",
    description:
      "Create Swiss-compliant invoices with QR-bills, payment tracking and reminders. Start free today.",
  },
};

const copy: LandingCopy = {
  eyebrow: "Simple invoicing software for Switzerland",
  h1: "Swiss QR-Bill invoicing without accounting software.",
  lead:
    "Create professional invoices, generate QR-bills, track payments, and send reminders from one simple platform.",
  installText:
    "Works in your browser and installs like an app on Windows, Mac, Android, and iPhone.",
  primaryCta: "Start free",
  secondaryCta: "See pricing",
  secondaryHref: "#pricing",
  switchLabel: "Deutsche Version",
  switchHref: "/rechnung-software-schweiz",
  badges: [
    "Swiss QR-bill ready",
    "Made for freelancers and small businesses",
    "3 issued invoices per month free",
  ],
  preview: {
    title: "Invoice dashboard",
    subtitle: "Invoices, payment status, and open balances",
    totalLabel: "Issued",
    totalValue: "CHF 1'971",
    openLabel: "Open",
    openValue: "CHF 441",
    rows: [
      { label: "SI2026-004", client: "Atelier Example GmbH", value: "CHF 690", status: "paid" },
      { label: "SI2026-005", client: "Practice Sample", value: "CHF 441", status: "sent" },
      { label: "SI2026-006", client: "Studio North", value: "CHF 310", status: "draft" },
    ],
  },
  proof: [
    { label: "Free plan", value: "CHF 0" },
    { label: "Pro plan", value: "CHF 19/month" },
    { label: "Built for", value: "Switzerland" },
  ],
  sections: {
    painTitle: "Still creating invoices in Word or Excel?",
    painLead:
      "Manual invoices work at the beginning, then the admin starts leaking time: payment status, reminders, customer details, and old files all live in different places.",
    painPoints: [
      "Manual invoice templates are easy to break and slow to reuse.",
      "Tracking paid and unpaid invoices in spreadsheets becomes messy.",
      "Following up on overdue invoices takes attention you need elsewhere.",
      "Full accounting platforms can feel too heavy when you only need invoicing.",
    ],
    solutionTitle: "Sierra Invoices keeps the invoicing part simple.",
    solutionText:
      "Create the customer, add services, send a Swiss invoice with QR-bill details, and track whether it has been paid. No accounting knowledge required.",
    benefitsTitle: "Everything needed to invoice professionally.",
    benefitsLead:
      "The app focuses on the practical work around invoices: creating them, sending them, tracking payment, and keeping client information organized.",
    benefits: [
      {
        title: "Swiss QR-Bill ready",
        text: "Generate Swiss invoices with QR-bill payment details that local customers recognize.",
      },
      {
        title: "Professional invoices in minutes",
        text: "Reuse customers, services, invoice text, due dates, and payment notes without rebuilding every invoice.",
      },
      {
        title: "Track paid and unpaid invoices",
        text: "See what is open, paid, overdue, or still in draft before cash flow becomes guesswork.",
      },
      {
        title: "Payment reminders",
        text: "Follow up on unpaid invoices with reminders instead of writing every message from scratch.",
      },
      {
        title: "Customer management",
        text: "Keep addresses, language preferences, invoice messages, and ongoing work connected to each client.",
      },
      {
        title: "Simple reporting",
        text: "Review monthly totals, open balances, paid invoices, and business activity without a complex dashboard.",
      },
    ],
    workflowTitle: "How it works",
    workflowLead:
      "A focused invoice workflow for the jobs you actually repeat every month.",
    workflow: [
      {
        title: "Create your customer",
        text: "Save client details once so future invoices start with the right address and message.",
      },
      {
        title: "Generate invoice",
        text: "Add services, supplies, discounts, notes, due date, and attachments before sending.",
      },
      {
        title: "Send invoice",
        text: "Send a PDF and online invoice link with payment details ready for your client.",
      },
      {
        title: "Get paid",
        text: "Track status, record payment, and send reminders when needed.",
      },
    ],
    socialTitle: "Built for the way small Swiss businesses invoice.",
    socialLead:
      "Public proof will grow as users adopt the product. The landing page already has space for testimonials, logos, and usage numbers without pretending they exist today.",
    socialItems: [
      { label: "Customer testimonials", value: "Soon" },
      { label: "Swiss small-business focus", value: "100%" },
      { label: "Invoices included on Free", value: "3/month" },
    ],
    comparisonTitle: "Why not use full accounting software?",
    comparisonLead:
      "Traditional accounting platforms are powerful. Sierra Invoices is intentionally narrower: it helps you send invoices and get paid with less setup.",
    comparisonHeaders: ["Sierra Invoices", "Traditional accounting platforms"],
    comparisonRows: [
      { label: "Setup", sierra: "Quick invoice setup", traditional: "More accounting setup" },
      { label: "Main focus", sierra: "Invoices and payments", traditional: "Full bookkeeping and ERP" },
      { label: "Learning curve", sierra: "Designed for non-accountants", traditional: "More concepts to learn" },
      { label: "Best for", sierra: "Freelancers and small service businesses", traditional: "Teams needing full accounting" },
      { label: "Monthly price", sierra: "Free plan, then CHF 19", traditional: "Often higher or modular" },
    ],
    pricingTitle: "Simple pricing for simple invoicing.",
    pricingLead:
      "Drafts stay free. You only need Pro when you want to issue more than three invoices in a calendar month.",
    freeTitle: "Free",
    freePrice: "CHF 0",
    freeText: "3 issued invoices per calendar month, customer management, drafts, and the core Swiss invoicing workflow.",
    proTitle: "Pro",
    proPrice: "CHF 19",
    proText: "Unlimited issued invoices, extended workflows, payment tracking, reminders, and a clean workspace for daily billing.",
    trustTitle: "Trustworthy enough for your clients.",
    trustLead:
      "Sierra Invoices is built around clear invoice PDFs, public invoice links, transparent payment details, and protected business data.",
    trustItems: [
      "Public help, privacy, terms, and imprint pages.",
      "Business data is separated by workspace and protected by authentication.",
      "Stripe is optional; bank transfer and QR-bill work without card payments.",
      "Optional CHF 99 onboarding if you want help setting up the app.",
    ],
    faqTitle: "Questions before starting",
    faq: [
      {
        question: "Is this Swiss compliant?",
        answer:
          "Sierra Invoices is built for Swiss invoice workflows, including CHF, Swiss QR-bill payment details, VAT-aware invoice totals, and local payment expectations.",
      },
      {
        question: "Does it support QR-bills?",
        answer:
          "Yes. The invoice workflow supports Swiss QR-bill payment details so your clients can pay by bank transfer more easily.",
      },
      {
        question: "Can freelancers use it?",
        answer:
          "Yes. It is designed for freelancers, consultants, self-employed professionals, tradespeople, agencies, and small service businesses.",
      },
      {
        question: "Do I need accounting knowledge?",
        answer:
          "No. Sierra Invoices is not full accounting software. It focuses on creating invoices, sending them, and tracking payment.",
      },
      {
        question: "Can I track payments?",
        answer:
          "Yes. You can see invoice status, open balances, paid invoices, due dates, and reminders from the app.",
      },
      {
        question: "Is there a free plan?",
        answer:
          "Yes. You can issue up to 3 invoices per calendar month on the Free plan. Drafts do not count as issued invoices.",
      },
    ],
    finalTitle: "Start sending professional Swiss invoices today.",
    finalLead:
      "Create your account, set up your business, and send your first Swiss invoice without wrestling with accounting software.",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Windows, macOS, Android, iOS",
  url: pageUrl,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "CHF",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19",
      priceCurrency: "CHF",
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: copy.sections.faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function InvoiceSoftwareSwitzerlandPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <AdsLandingPage copy={copy} />
    </>
  );
}
