import type { Metadata } from "next";
import AdsLandingPage, { type LandingCopy } from "@/components/landing/AdsLandingPage";
import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

const baseUrl = getPublicInvoiceBaseUrl();

export const metadata: Metadata = {
  title: `Rechnungssoftware Schweiz | ${APP_NAME}`,
  description:
    "Schweizer Rechnungen mit QR-Rechnung, Zahlungslinks, Mahnungen und 3 kostenlosen ausgestellten Rechnungen pro Monat.",
  alternates: {
    canonical: "/rechnung-software-schweiz",
    languages: {
      de: "/rechnung-software-schweiz",
      en: "/invoice-software-switzerland",
    },
  },
  openGraph: {
    title: `Rechnungssoftware Schweiz | ${APP_NAME}`,
    description:
      "Erstellen Sie Schweizer Rechnungen mit QR-Rechnung, Zahlungsstatus, Mahnungen und einem klaren Workspace fuer kleine Unternehmen.",
    url: `${baseUrl}/rechnung-software-schweiz`,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Rechnungssoftware Schweiz | ${APP_NAME}`,
    description:
      "Schweizer Rechnungen, QR-Rechnung, Zahlungsstatus und Erinnerungen in einem fokussierten Workspace.",
  },
};

const copy: LandingCopy = {
  eyebrow: "Rechnungssoftware fuer die Schweiz",
  h1: "Schweizer Rechnungen senden, ohne ein grosses Buchhaltungssystem.",
  lead:
    "Sierra Invoices hilft Freelancern und kleinen Unternehmen, Rechnungen sauber zu erstellen, Zahlungen zu verfolgen und offene Rechnungen freundlich nachzufassen.",
  primaryCta: "Kostenlos starten",
  secondaryCta: "Setup ansehen",
  switchLabel: "English version",
  switchHref: "/invoice-software-switzerland",
  badges: [
    "3 ausgestellte Rechnungen pro Monat kostenlos",
    "QR-Rechnung und Bankzahlung",
    "Pro fuer CHF 19/Monat",
  ],
  preview: {
    title: "Rechnungsuebersicht",
    subtitle: "Status, Zahlungen und offene Betraege",
    totalLabel: "Ausgestellt",
    totalValue: "CHF 1'971",
    openLabel: "Offen",
    openValue: "CHF 441",
    rows: [
      { label: "RE2026-004", client: "Atelier Beispiel GmbH", value: "CHF 690", status: "bezahlt" },
      { label: "RE2026-005", client: "Praxis Muster", value: "CHF 441", status: "gesendet" },
      { label: "RE2026-006", client: "Studio Nord", value: "CHF 310", status: "Entwurf" },
    ],
  },
  proof: [
    { label: "Kostenlos testen", value: "CHF 0" },
    { label: "Pro", value: "CHF 19/Monat" },
    { label: "Fokus", value: "Schweiz" },
  ],
  sections: {
    whyTitle: "Fuer Rechnungen, die ernst wirken und schnell rausgehen.",
    whyLead:
      "Ideal, wenn Sie Kunden, Leistungen, Zahlungsstatus und Erinnerungen an einem Ort brauchen, aber keine schwere Buchhaltung einfuehren wollen.",
    features: [
      {
        title: "Schweizer Rechnungen",
        text: "PDFs mit QR-Rechnung, MWST-Uebersicht, Nummerierung und oeffentlicher Rechnungsseite.",
      },
      {
        title: "Zahlungen im Blick",
        text: "Bankzahlung, optionale Kartenlinks, Status, Faelligkeiten und Erinnerungen an einem Ort.",
      },
      {
        title: "Weniger Admin",
        text: "Kunden, Leistungen, Entwuerfe, Ausgaben und Monatsuebersicht in einem fokussierten Workspace.",
      },
    ],
    workflowTitle: "Vom Entwurf zur bezahlten Rechnung.",
    workflowLead:
      "Richten Sie Ihr Unternehmen einmal ein, speichern Sie wiederkehrende Leistungen und erstellen Sie die naechste Rechnung in wenigen Minuten.",
    workflow: [
      {
        title: "Unternehmen einrichten",
        text: "Logo, Zahlungsangaben, MWST-Status und Standardtexte werden fuer neue Rechnungen vorbereitet.",
      },
      {
        title: "Kunden und Leistungen speichern",
        text: "Wiederkehrende Kunden, Services, laufende Arbeiten und Entwuerfe bleiben griffbereit.",
      },
      {
        title: "Senden und nachfassen",
        text: "Rechnung als PDF und Online-Link senden, Zahlung verfolgen und bei Bedarf Erinnerungen nutzen.",
      },
    ],
    pricingTitle: "Einfach starten, spaeter upgraden.",
    pricingLead:
      "Entwuerfe bleiben kostenlos. Sie zahlen erst, wenn Sie mehr als drei Rechnungen pro Kalendermonat ausstellen wollen.",
    freeTitle: "Free",
    freePrice: "CHF 0",
    freeText: "3 ausgestellte Rechnungen pro Kalendermonat, Kunden, Entwuerfe und grundlegende Rechnungsfunktionen.",
    proTitle: "Pro",
    proPrice: "CHF 19",
    proText: "Unlimitierte ausgestellte Rechnungen, erweiterte Workflows und ein sauberer Workspace fuer Ihr Tagesgeschaeft.",
    trustTitle: "Klar genug fuer Kunden, ruhig genug fuer Sie.",
    trustLead:
      "Die App ist auf vertrauenswuerdige Rechnungen, nachvollziehbare Zahlungsinformationen und einen kleinen, stabilen Workflow ausgelegt.",
    trustItems: [
      "Oeffentliche Hilfe-, Datenschutz-, AGB- und Impressum-Seiten.",
      "Geschaeftsdaten sind workspace-getrennt und durch Authentifizierung geschuetzt.",
      "Stripe ist optional; Bankzahlung und QR-Rechnung funktionieren ohne Kartenbindung.",
      "Optionales CHF 99 Onboarding, wenn Sie Hilfe beim Setup moechten.",
    ],
    faqTitle: "Fragen vor dem Start",
    faq: [
      {
        question: "Ist Sierra Invoices fuer die Schweiz gemacht?",
        answer:
          "Ja. Der Fokus liegt auf Schweizer Rechnungen, QR-Rechnung, CHF, MWST-Logik und Zahlungsinformationen, die lokale Kunden verstehen.",
      },
      {
        question: "Kann ich kostenlos starten?",
        answer:
          "Ja. Sie koennen kostenlos starten und bis zu 3 Rechnungen pro Kalendermonat ausstellen. Entwuerfe zaehlen nicht als ausgestellte Rechnungen.",
      },
      {
        question: "Brauche ich Stripe?",
        answer:
          "Nein. Sie koennen Rechnungen mit Bankzahlung und QR-Rechnung senden. Stripe ist nur fuer optionale Online-Kartenzahlungen gedacht.",
      },
      {
        question: "Fuer wen eignet sich die App?",
        answer:
          "Fuer Freelancer, Einzelunternehmen und kleine Schweizer Dienstleister, die professionelle Rechnungen ohne komplexe Buchhaltungssoftware senden wollen.",
      },
    ],
    finalTitle: "Bereit, die erste Rechnung sauber zu senden?",
    finalLead:
      "Starten Sie kostenlos, richten Sie Ihr Unternehmen ein und testen Sie den Ablauf mit Ihrer naechsten Rechnung.",
  },
};

export default function RechnungSoftwareSchweizPage() {
  return <AdsLandingPage copy={copy} />;
}
