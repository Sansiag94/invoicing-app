import type { Metadata } from "next";
import AdsLandingPage, { type LandingCopy } from "@/components/landing/AdsLandingPage";
import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

const baseUrl = getPublicInvoiceBaseUrl();
const pageUrl = `${baseUrl}/rechnung-software-schweiz`;

export const metadata: Metadata = {
  title: `Rechnungssoftware Schweiz | QR-Rechnung fuer Freelancer & KMU`,
  description:
    "Erstellen Sie Schweizer Rechnungen mit QR-Rechnung, Zahlungsstatus und Erinnerungen. Entwickelt fuer Freelancer und kleine Unternehmen. Kostenlos starten.",
  alternates: {
    canonical: "/rechnung-software-schweiz",
    languages: {
      de: "/rechnung-software-schweiz",
      en: "/invoice-software-switzerland",
    },
  },
  openGraph: {
    title: `Rechnungssoftware Schweiz | QR-Rechnung fuer Freelancer & KMU`,
    description:
      "Erstellen Sie Schweizer Rechnungen mit QR-Rechnung, Zahlungsstatus und Erinnerungen. Entwickelt fuer Freelancer und kleine Unternehmen.",
    url: pageUrl,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Rechnungssoftware Schweiz | QR-Rechnung fuer Freelancer & KMU`,
    description:
      "Schweizer Rechnungen mit QR-Rechnung, Zahlungsstatus und Erinnerungen. Kostenlos starten.",
  },
};

const copy: LandingCopy = {
  eyebrow: "Einfache Rechnungssoftware fuer die Schweiz",
  h1: "Schweizer QR-Rechnungen ohne Buchhaltungssoftware.",
  lead:
    "Erstellen Sie professionelle Rechnungen, generieren Sie QR-Rechnungen, verfolgen Sie Zahlungen und senden Sie Erinnerungen von einer einfachen Plattform.",
  installText:
    "Funktioniert im Browser und laesst sich wie eine App auf Windows, Mac, Android und iPhone installieren.",
  primaryCta: "Kostenlos starten",
  secondaryCta: "Preise ansehen",
  secondaryHref: "#pricing",
  switchLabel: "English version",
  switchHref: "/invoice-software-switzerland",
  badges: [
    "Bereit fuer Schweizer QR-Rechnungen",
    "Fuer Freelancer und kleine Unternehmen",
    "3 ausgestellte Rechnungen pro Monat kostenlos",
  ],
  preview: {
    sectionEyebrow: "Rechnungsausgabe",
    sectionTitle: "Versenden Sie Rechnungen, die professionell aussehen und direkt zahlbar sind.",
    sectionLead:
      "Sierra Invoices erstellt eine klare Rechnungsseite und fuegt bei aktivierten QR-Angaben einen separaten Schweizer QR-Zahlteil hinzu.",
    title: "Beispiel Studio GmbH",
    subtitle: "Ihr Logo und Ihre Firmendaten stehen oben auf der Rechnung.",
    documentLabel: "Rechnung",
    invoiceMeta: "RE2026-024",
    clientLabel: "Rechnung an",
    clientName: "Musterkunde AG",
    totalLabel: "Faelliger Betrag",
    totalValue: "CHF 690.00",
    dueLabel: "Faellig am",
    dueValue: "30.06.2026",
    qrTitle: "Schweizer QR-Rechnung",
    qrText: "Der abtrennbare Zahlungsteil enthaelt Konto, Betrag, Zahlerdaten und QR-Referenz.",
    paymentReference: "Referenz: 00 00000 00000 00000 00000 00000",
    receiptTitle: "Empfangsschein",
    paymentPartTitle: "Zahlteil",
    accountLabel: "Konto / Zahlbar an",
    payableToLabel: "Zahlbar an",
    payableByLabel: "Zahlbar durch",
    currencyLabel: "Waehrung / Betrag",
    subjectLabel: "Betreff",
    subjectValue: "Dienstleistungen Juni 2026",
    lineHeaders: ["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Betrag"],
    callouts: {
      logo: "Ihr Logo und Ihre Absenderdaten",
      details: "Professionelle Leistungstabelle mit Mengen und Preisen",
      qr: "Klare Rechnungstotale vor dem Versand",
      reference: "Separater Schweizer QR-Zahlteil inklusive",
    },
    rows: [
      { position: "1", label: "Beratungstermin", quantity: "3.00", unitPrice: "120.00", value: "360.00" },
      { position: "2", label: "Monatliches Servicepaket", quantity: "1.00", unitPrice: "280.00", value: "280.00" },
      { position: "3", label: "Rabatt fuer Neukunden", quantity: "1.00", unitPrice: "-50.00", value: "-50.00" },
    ],
  },
  proof: [
    { label: "Free Plan", value: "CHF 0" },
    { label: "Pro Plan", value: "CHF 19/Monat" },
    { label: "Fokus", value: "Schweiz" },
  ],
  sections: {
    painTitle: "Erstellen Sie Rechnungen noch in Word oder Excel?",
    painLead:
      "Manuelle Rechnungen funktionieren am Anfang. Spaeter kostet die Verwaltung Zeit: Zahlungsstatus, Erinnerungen, Kundendaten und alte Dateien liegen ueberall verteilt.",
    painPoints: [
      "Manuelle Vorlagen sind langsam, fehleranfaellig und schwer sauber wiederzuverwenden.",
      "Bezahlte und unbezahlte Rechnungen in Tabellen zu verfolgen wird schnell unuebersichtlich.",
      "Mahnen und Nachfassen kostet Aufmerksamkeit, die Sie fuer Kundenarbeit brauchen.",
      "Komplette Buchhaltungsplattformen sind oft zu umfangreich, wenn Sie nur Rechnungen brauchen.",
    ],
    solutionTitle: "Sierra Invoices macht nur den Rechnungsteil einfach.",
    solutionText:
      "Kunden erfassen, Leistungen hinzufuegen, Schweizer Rechnung mit QR-Zahlungsangaben senden und den Zahlungsstatus verfolgen. Ohne Buchhaltungswissen.",
    benefitsTitle: "Alles, was Sie fuer professionelle Rechnungen brauchen.",
    benefitsLead:
      "Die App konzentriert sich auf die praktische Arbeit rund um Rechnungen: erstellen, senden, Zahlung verfolgen und Kundendaten organisiert halten.",
    benefits: [
      {
        title: "Bereit fuer QR-Rechnungen",
        text: "Erstellen Sie Schweizer Rechnungen mit QR-Zahlungsangaben, die lokale Kunden kennen.",
      },
      {
        title: "Rechnungen in Minuten",
        text: "Kunden, Leistungen, Rechnungstexte, Faelligkeiten und Zahlungsnotizen koennen wiederverwendet werden.",
      },
      {
        title: "Bezahlt und offen verfolgen",
        text: "Sehen Sie, was offen, bezahlt, ueberfaellig oder noch im Entwurf ist.",
      },
      {
        title: "Zahlungserinnerungen",
        text: "Fassen Sie unbezahlte Rechnungen nach, ohne jede Nachricht neu zu schreiben.",
      },
      {
        title: "Kundenverwaltung",
        text: "Adressen, Sprache, Rechnungstexte und laufende Arbeiten bleiben beim richtigen Kunden.",
      },
      {
        title: "Einfache Auswertung",
        text: "Pruefen Sie monatliche Betraege, offene Salden, bezahlte Rechnungen und Aktivitaet ohne komplexes Dashboard.",
      },
    ],
    workflowTitle: "So funktioniert es",
    workflowLead:
      "Ein fokussierter Rechnungsablauf fuer Aufgaben, die Sie jeden Monat wiederholen.",
    workflow: [
      {
        title: "Kunde erstellen",
        text: "Speichern Sie Kundendaten einmal, damit neue Rechnungen mit Adresse und Nachricht bereit sind.",
      },
      {
        title: "Rechnung erstellen",
        text: "Fuegen Sie Leistungen, Material, Rabatte, Notizen, Faelligkeit und Anhaenge hinzu.",
      },
      {
        title: "Rechnung senden",
        text: "Senden Sie PDF und Online-Rechnungslink mit Zahlungsangaben an Ihren Kunden.",
      },
      {
        title: "Bezahlt werden",
        text: "Status verfolgen, Zahlung erfassen und bei Bedarf Erinnerungen senden.",
      },
    ],
    socialTitle: "Gebaut fuer kleine Schweizer Unternehmen.",
    socialLead:
      "Oeffentliche Referenzen wachsen mit den ersten aktiven Nutzern. Die Seite hat bereits Platz fuer Testimonials, Logos und Nutzungszahlen, ohne falsche Behauptungen zu machen.",
    socialItems: [
      { label: "Kundenstimmen", value: "Bald" },
      { label: "Fokus auf Schweizer KMU", value: "100%" },
      { label: "Rechnungen im Free Plan", value: "3/Monat" },
    ],
    comparisonTitle: "Warum keine komplette Buchhaltungssoftware?",
    comparisonLead:
      "Komplette Buchhaltungsplattformen sind stark. Sierra Invoices ist bewusst kleiner: Rechnungen senden und bezahlt werden, mit weniger Setup.",
    comparisonHeaders: ["Sierra Invoices", "Klassische Buchhaltungsplattformen"],
    comparisonRows: [
      { label: "Setup", sierra: "Schnelle Rechnungseinrichtung", traditional: "Mehr Buchhaltungssetup" },
      { label: "Fokus", sierra: "Rechnungen und Zahlungen", traditional: "Buchhaltung, ERP und viele Module" },
      { label: "Lernkurve", sierra: "Fuer Nicht-Buchhalter gemacht", traditional: "Mehr Fachbegriffe und Prozesse" },
      { label: "Geeignet fuer", sierra: "Freelancer und kleine Dienstleister", traditional: "Teams mit kompletter Buchhaltung" },
      { label: "Preis", sierra: "Free Plan, danach CHF 19", traditional: "Oft hoeher oder modular" },
    ],
    pricingTitle: "Einfache Preise fuer einfache Rechnungen.",
    pricingLead:
      "Entwuerfe bleiben kostenlos. Pro brauchen Sie erst, wenn Sie mehr als drei Rechnungen pro Kalendermonat ausstellen wollen.",
    freeTitle: "Free",
    freePrice: "CHF 0",
    freeText: "3 ausgestellte Rechnungen pro Kalendermonat, Kundenverwaltung, Entwuerfe und der Kernablauf fuer Schweizer Rechnungen.",
    proTitle: "Pro",
    proPrice: "CHF 19",
    proText: "Unlimitierte ausgestellte Rechnungen, erweiterte Workflows, Zahlungsstatus, Erinnerungen und ein sauberer Workspace.",
    trustTitle: "Vertrauenswuerdig genug fuer Ihre Kunden.",
    trustLead:
      "Sierra Invoices ist auf klare Rechnungs-PDFs, oeffentliche Rechnungslinks, transparente Zahlungsangaben und geschuetzte Geschaeftsdaten ausgelegt.",
    trustItems: [
      "Oeffentliche Hilfe-, Datenschutz-, AGB- und Impressum-Seiten.",
      "Geschaeftsdaten sind workspace-getrennt und durch Authentifizierung geschuetzt.",
      "Stripe ist optional; Bankzahlung und QR-Rechnung funktionieren ohne Kartenbindung.",
      "Optionales CHF 99 Onboarding, wenn Sie Hilfe beim Setup moechten.",
    ],
    faqTitle: "Fragen vor dem Start",
    faq: [
      {
        question: "Ist das fuer Schweizer Rechnungen geeignet?",
        answer:
          "Ja. Sierra Invoices ist fuer Schweizer Rechnungsablaeufe gebaut, inklusive CHF, QR-Zahlungsangaben, MWST-bewussten Totals und lokalen Zahlungsinformationen.",
      },
      {
        question: "Unterstuetzt es QR-Rechnungen?",
        answer:
          "Ja. Der Rechnungsablauf unterstuetzt Schweizer QR-Zahlungsangaben, damit Kunden einfacher per Bankueberweisung zahlen koennen.",
      },
      {
        question: "Koennen Freelancer die App nutzen?",
        answer:
          "Ja. Sie ist fuer Freelancer, Berater, Selbststaendige, Handwerker, Agenturen und kleine Dienstleistungsunternehmen gedacht.",
      },
      {
        question: "Brauche ich Buchhaltungswissen?",
        answer:
          "Nein. Sierra Invoices ist keine komplette Buchhaltungssoftware. Der Fokus liegt auf Rechnungen erstellen, senden und Zahlung verfolgen.",
      },
      {
        question: "Kann ich Zahlungen verfolgen?",
        answer:
          "Ja. Sie sehen Rechnungsstatus, offene Betraege, bezahlte Rechnungen, Faelligkeiten und Erinnerungen in der App.",
      },
      {
        question: "Gibt es einen kostenlosen Plan?",
        answer:
          "Ja. Im Free Plan koennen Sie bis zu 3 Rechnungen pro Kalendermonat ausstellen. Entwuerfe zaehlen nicht als ausgestellte Rechnungen.",
      },
    ],
    finalTitle: "Starten Sie heute mit professionellen Schweizer Rechnungen.",
    finalLead:
      "Erstellen Sie ein Konto, richten Sie Ihr Unternehmen ein und senden Sie Ihre erste Schweizer Rechnung ohne komplizierte Buchhaltungssoftware.",
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

export default function RechnungSoftwareSchweizPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <AdsLandingPage copy={copy} />
    </>
  );
}
