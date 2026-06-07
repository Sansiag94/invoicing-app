import type { Metadata } from "next";
import AdsLandingPage, { type LandingCopy } from "@/components/landing/AdsLandingPage";
import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

const baseUrl = getPublicInvoiceBaseUrl();

export const metadata: Metadata = {
  title: `Invoice software Switzerland | ${APP_NAME}`,
  description:
    "Swiss invoice software with QR-bills, payment links, reminders, and 3 free issued invoices per month.",
  alternates: {
    canonical: "/invoice-software-switzerland",
    languages: {
      de: "/rechnung-software-schweiz",
      en: "/invoice-software-switzerland",
    },
  },
  openGraph: {
    title: `Invoice software Switzerland | ${APP_NAME}`,
    description:
      "Create Swiss invoices with QR-bills, payment tracking, reminders, and a focused workspace for small businesses.",
    url: `${baseUrl}/invoice-software-switzerland`,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Invoice software Switzerland | ${APP_NAME}`,
    description:
      "Swiss invoices, QR-bills, payment status, and reminders in one focused workspace.",
  },
};

const copy: LandingCopy = {
  eyebrow: "Invoice software for Switzerland",
  h1: "Send Swiss invoices without adopting a heavy accounting system.",
  lead:
    "Sierra Invoices helps freelancers and small businesses create clean invoices, track payments, and follow up on overdue work from one focused workspace.",
  primaryCta: "Start free",
  secondaryCta: "See setup guide",
  switchLabel: "Deutsche Version",
  switchHref: "/rechnung-software-schweiz",
  badges: [
    "3 issued invoices per month free",
    "QR-bill and bank transfer ready",
    "Pro for CHF 19/month",
  ],
  preview: {
    title: "Invoice overview",
    subtitle: "Status, payments, and open balances",
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
    { label: "Start free", value: "CHF 0" },
    { label: "Pro", value: "CHF 19/month" },
    { label: "Built for", value: "Switzerland" },
  ],
  sections: {
    whyTitle: "For invoices that look serious and leave quickly.",
    whyLead:
      "A good fit when you need clients, services, payment status, and reminders in one place, but do not want a complex accounting suite.",
    features: [
      {
        title: "Swiss invoices",
        text: "PDF invoices with QR-bill support, VAT overview, numbering, and a public invoice page.",
      },
      {
        title: "Payment tracking",
        text: "Bank transfer, optional card links, statuses, due dates, and reminders in one workflow.",
      },
      {
        title: "Less admin",
        text: "Clients, services, drafts, expenses, unbilled work, and monthly overview in a focused workspace.",
      },
    ],
    workflowTitle: "From draft to paid invoice.",
    workflowLead:
      "Set up your business once, save repeated services, and prepare the next invoice in minutes.",
    workflow: [
      {
        title: "Set up your business",
        text: "Add logo, payment details, VAT status, and default invoice text for future invoices.",
      },
      {
        title: "Save clients and services",
        text: "Keep recurring clients, catalog items, ongoing work, and drafts ready for monthly billing.",
      },
      {
        title: "Send and follow up",
        text: "Send a PDF and online payment link, track payment, and use reminders when needed.",
      },
    ],
    pricingTitle: "Start simple, upgrade later.",
    pricingLead:
      "Drafts stay free. You only need Pro when you want to issue more than three invoices in a calendar month.",
    freeTitle: "Free",
    freePrice: "CHF 0",
    freeText: "3 issued invoices per calendar month, clients, drafts, and the core invoicing workflow.",
    proTitle: "Pro",
    proPrice: "CHF 19",
    proText: "Unlimited issued invoices, extended workflows, and a clean workspace for day-to-day billing.",
    trustTitle: "Clear for clients, calm for you.",
    trustLead:
      "The app is built around trustworthy invoices, clear payment information, and a small workflow that stays manageable.",
    trustItems: [
      "Public help, privacy, terms, and imprint pages.",
      "Business data is separated by workspace and protected by authentication.",
      "Stripe is optional; bank transfer and QR-bill work without card payments.",
      "Optional CHF 99 onboarding if you want help setting up the app.",
    ],
    faqTitle: "Questions before starting",
    faq: [
      {
        question: "Is Sierra Invoices made for Switzerland?",
        answer:
          "Yes. The focus is Swiss invoicing, QR-bills, CHF, VAT handling, and payment information that local clients understand.",
      },
      {
        question: "Can I start for free?",
        answer:
          "Yes. You can start free and issue up to 3 invoices per calendar month. Drafts do not count as issued invoices.",
      },
      {
        question: "Do I need Stripe?",
        answer:
          "No. You can send invoices with bank transfer and QR-bill details. Stripe is only for optional online card payments.",
      },
      {
        question: "Who is this for?",
        answer:
          "Freelancers, sole proprietors, and small Swiss service businesses that want professional invoices without heavy accounting software.",
      },
    ],
    finalTitle: "Ready to send the next invoice cleanly?",
    finalLead:
      "Start free, set up your business, and test the workflow with your next Swiss invoice.",
  },
};

export default function InvoiceSoftwareSwitzerlandPage() {
  return <AdsLandingPage copy={copy} />;
}
