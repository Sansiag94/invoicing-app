export type InvoiceLanguage = "en" | "de" | "es" | "fr" | "it";

export type QrBillLanguage = "DE" | "EN" | "FR" | "IT" | "RM";

type InvoiceStatusValue = "draft" | "sent" | "paid" | "overdue";

type InvoiceStrings = {
  invoice: string;
  dueDate: string;
  subject: string;
  position: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  vat: string;
  total: string;
  paymentOptions: string;
  payOnline: string;
  viewInvoiceOnline: string;
  payOnlineDescription: string;
  viewInvoiceOnlineDescription: string;
  internationalBankTransfer: string;
  accountHolder: string;
  bank: string;
  iban: string;
  bicSwift: string;
  referenceMessage: string;
  receipt: string;
  paymentPart: string;
  accountPayableTo: string;
  payableBy: string;
  currency: string;
  acceptancePoint: string;
  additionalInformation: string;
  qrCodeUnavailable: string;
  loadingInvoice: string;
  downloadPdf: string;
  payWithCard: string;
  redirectingToStripe: string;
  invoiceAlreadyPaid: string;
  paymentReceivedUpdating: string;
  paymentCompletedThankYou: string;
  paymentCancelled: string;
  onlineCardPaymentUnavailable: string;
  status: Record<InvoiceStatusValue, string>;
};

export const DEFAULT_INVOICE_LANGUAGE: InvoiceLanguage = "en";

export const SUPPORTED_INVOICE_LANGUAGES: readonly InvoiceLanguage[] = ["en", "de", "es", "fr", "it"] as const;

export const INVOICE_LANGUAGE_OPTIONS: ReadonlyArray<{ value: InvoiceLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
];

const INVOICE_LOCALES: Record<InvoiceLanguage, string> = {
  en: "en-GB",
  de: "de-CH",
  es: "es-ES",
  fr: "fr-CH",
  it: "it-CH",
};

const QR_BILL_LANGUAGES: Record<InvoiceLanguage, QrBillLanguage> = {
  en: "EN",
  de: "DE",
  es: "EN",
  fr: "FR",
  it: "IT",
};

const INVOICE_STRINGS: Record<InvoiceLanguage, InvoiceStrings> = {
  en: {
    invoice: "Invoice",
    dueDate: "Due date",
    subject: "Subject",
    position: "Pos.",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "Total",
    paymentOptions: "Payment options",
    payOnline: "Pay online",
    viewInvoiceOnline: "View invoice online",
    payOnlineDescription: "Review this invoice and pay online through the secure payment page.",
    viewInvoiceOnlineDescription: "Review this invoice on the secure invoice page.",
    internationalBankTransfer: "International bank transfer",
    accountHolder: "Account holder",
    bank: "Bank",
    iban: "IBAN",
    bicSwift: "BIC / SWIFT",
    referenceMessage: "Reference / message",
    receipt: "Receipt",
    paymentPart: "Payment part",
    accountPayableTo: "Account / Payable to",
    payableBy: "Payable by",
    currency: "Currency",
    acceptancePoint: "Acceptance point",
    additionalInformation: "Additional information",
    qrCodeUnavailable: "QR code unavailable",
    loadingInvoice: "Loading invoice...",
    downloadPdf: "Download PDF",
    payWithCard: "Pay with card",
    redirectingToStripe: "Redirecting to Stripe...",
    invoiceAlreadyPaid: "Invoice already paid",
    paymentReceivedUpdating: "Payment received. Updating invoice status...",
    paymentCompletedThankYou: "Payment completed. Thank you.",
    paymentCancelled: "Payment was cancelled.",
    onlineCardPaymentUnavailable:
      "Online card payment is not enabled for this business. Please use the payment details shown on the invoice.",
    status: {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
    },
  },
  de: {
    invoice: "Rechnung",
    dueDate: "Fällig am",
    subject: "Betreff",
    position: "Pos.",
    description: "Beschreibung",
    quantity: "Menge",
    unitPrice: "Einzelpreis",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    vat: "MWST",
    total: "Total",
    paymentOptions: "Zahlungsoptionen",
    payOnline: "Online bezahlen",
    viewInvoiceOnline: "Rechnung online ansehen",
    payOnlineDescription: "Prüfen Sie diese Rechnung und bezahlen Sie sicher online.",
    viewInvoiceOnlineDescription: "Prüfen Sie diese Rechnung auf der sicheren Rechnungsseite.",
    internationalBankTransfer: "Internationale Banküberweisung",
    accountHolder: "Kontoinhaber",
    bank: "Bank",
    iban: "IBAN",
    bicSwift: "BIC / SWIFT",
    referenceMessage: "Referenz / Mitteilung",
    receipt: "Empfangsschein",
    paymentPart: "Zahlteil",
    accountPayableTo: "Konto / Zahlbar an",
    payableBy: "Zahlbar durch",
    currency: "Währung",
    acceptancePoint: "Annahmestelle",
    additionalInformation: "Zusätzliche Informationen",
    qrCodeUnavailable: "QR-Code nicht verfügbar",
    loadingInvoice: "Rechnung wird geladen...",
    downloadPdf: "PDF herunterladen",
    payWithCard: "Mit Karte bezahlen",
    redirectingToStripe: "Weiterleitung zu Stripe...",
    invoiceAlreadyPaid: "Rechnung bereits bezahlt",
    paymentReceivedUpdating: "Zahlung erhalten. Rechnungsstatus wird aktualisiert...",
    paymentCompletedThankYou: "Zahlung abgeschlossen. Vielen Dank.",
    paymentCancelled: "Die Zahlung wurde abgebrochen.",
    onlineCardPaymentUnavailable:
      "Online-Kartenzahlung ist für dieses Unternehmen nicht aktiviert. Bitte verwenden Sie die Zahlungsangaben auf der Rechnung.",
    status: {
      draft: "Entwurf",
      sent: "Gesendet",
      paid: "Bezahlt",
      overdue: "Überfällig",
    },
  },
  es: {
    invoice: "Factura",
    dueDate: "Fecha de vencimiento",
    subject: "Asunto",
    position: "Pos.",
    description: "Descripcion",
    quantity: "Cant.",
    unitPrice: "Precio unitario",
    amount: "Importe",
    subtotal: "Subtotal",
    vat: "IVA",
    total: "Total",
    paymentOptions: "Opciones de pago",
    payOnline: "Pagar en linea",
    viewInvoiceOnline: "Ver factura en linea",
    payOnlineDescription: "Revise esta factura y paguela en linea desde la pagina de pago segura.",
    viewInvoiceOnlineDescription: "Revise esta factura en la pagina segura de facturas.",
    internationalBankTransfer: "Transferencia bancaria internacional",
    accountHolder: "Titular de la cuenta",
    bank: "Banco",
    iban: "IBAN",
    bicSwift: "BIC / SWIFT",
    referenceMessage: "Referencia / mensaje",
    receipt: "Recibo",
    paymentPart: "Seccion de pago",
    accountPayableTo: "Cuenta / Pagadero a",
    payableBy: "Pagadero por",
    currency: "Moneda",
    acceptancePoint: "Punto de aceptacion",
    additionalInformation: "Informacion adicional",
    qrCodeUnavailable: "Codigo QR no disponible",
    loadingInvoice: "Cargando factura...",
    downloadPdf: "Descargar PDF",
    payWithCard: "Pagar con tarjeta",
    redirectingToStripe: "Redirigiendo a Stripe...",
    invoiceAlreadyPaid: "Factura ya pagada",
    paymentReceivedUpdating: "Pago recibido. Actualizando el estado de la factura...",
    paymentCompletedThankYou: "Pago completado. Gracias.",
    paymentCancelled: "El pago fue cancelado.",
    onlineCardPaymentUnavailable:
      "El pago con tarjeta en linea no esta habilitado para esta empresa. Utilice los datos de pago que aparecen en la factura.",
    status: {
      draft: "Borrador",
      sent: "Enviada",
      paid: "Pagada",
      overdue: "Vencida",
    },
  },
  fr: {
    invoice: "Facture",
    dueDate: "Date d'echeance",
    subject: "Objet",
    position: "Pos.",
    description: "Description",
    quantity: "Qte",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    subtotal: "Sous-total",
    vat: "TVA",
    total: "Total",
    paymentOptions: "Options de paiement",
    payOnline: "Payer en ligne",
    viewInvoiceOnline: "Voir la facture en ligne",
    payOnlineDescription: "Consultez cette facture et payez-la en ligne via la page de paiement securisee.",
    viewInvoiceOnlineDescription: "Consultez cette facture sur la page securisee de la facture.",
    internationalBankTransfer: "Virement bancaire international",
    accountHolder: "Titulaire du compte",
    bank: "Banque",
    iban: "IBAN",
    bicSwift: "BIC / SWIFT",
    referenceMessage: "Reference / message",
    receipt: "Recepisse",
    paymentPart: "Section paiement",
    accountPayableTo: "Compte / Payable a",
    payableBy: "Payable par",
    currency: "Monnaie",
    acceptancePoint: "Point de depot",
    additionalInformation: "Informations complementaires",
    qrCodeUnavailable: "Code QR indisponible",
    loadingInvoice: "Chargement de la facture...",
    downloadPdf: "Telecharger le PDF",
    payWithCard: "Payer par carte",
    redirectingToStripe: "Redirection vers Stripe...",
    invoiceAlreadyPaid: "Facture deja payee",
    paymentReceivedUpdating: "Paiement recu. Mise a jour du statut de la facture...",
    paymentCompletedThankYou: "Paiement effectue. Merci.",
    paymentCancelled: "Le paiement a ete annule.",
    onlineCardPaymentUnavailable:
      "Le paiement par carte en ligne n'est pas active pour cette entreprise. Veuillez utiliser les informations de paiement indiquees sur la facture.",
    status: {
      draft: "Brouillon",
      sent: "Envoyee",
      paid: "Payee",
      overdue: "En retard",
    },
  },
  it: {
    invoice: "Fattura",
    dueDate: "Scadenza",
    subject: "Oggetto",
    position: "Pos.",
    description: "Descrizione",
    quantity: "Qta",
    unitPrice: "Prezzo unitario",
    amount: "Importo",
    subtotal: "Subtotale",
    vat: "IVA",
    total: "Totale",
    paymentOptions: "Opzioni di pagamento",
    payOnline: "Paga online",
    viewInvoiceOnline: "Visualizza la fattura online",
    payOnlineDescription: "Controlla questa fattura e paga online tramite la pagina di pagamento sicura.",
    viewInvoiceOnlineDescription: "Controlla questa fattura nella pagina sicura della fattura.",
    internationalBankTransfer: "Bonifico bancario internazionale",
    accountHolder: "Intestatario del conto",
    bank: "Banca",
    iban: "IBAN",
    bicSwift: "BIC / SWIFT",
    referenceMessage: "Riferimento / messaggio",
    receipt: "Ricevuta",
    paymentPart: "Sezione pagamento",
    accountPayableTo: "Conto / Pagabile a",
    payableBy: "Pagabile da",
    currency: "Valuta",
    acceptancePoint: "Punto di accettazione",
    additionalInformation: "Informazioni aggiuntive",
    qrCodeUnavailable: "Codice QR non disponibile",
    loadingInvoice: "Caricamento fattura...",
    downloadPdf: "Scarica PDF",
    payWithCard: "Paga con carta",
    redirectingToStripe: "Reindirizzamento a Stripe...",
    invoiceAlreadyPaid: "Fattura gia pagata",
    paymentReceivedUpdating: "Pagamento ricevuto. Aggiornamento dello stato della fattura...",
    paymentCompletedThankYou: "Pagamento completato. Grazie.",
    paymentCancelled: "Il pagamento e stato annullato.",
    onlineCardPaymentUnavailable:
      "Il pagamento con carta online non e abilitato per questa azienda. Usa i dati di pagamento indicati sulla fattura.",
    status: {
      draft: "Bozza",
      sent: "Inviata",
      paid: "Pagata",
      overdue: "Scaduta",
    },
  },
};

export function isSupportedInvoiceLanguage(value: string | null | undefined): value is InvoiceLanguage {
  return SUPPORTED_INVOICE_LANGUAGES.includes((value || "").toLowerCase() as InvoiceLanguage);
}

export function normalizeInvoiceLanguage(
  value: string | null | undefined,
  fallback: InvoiceLanguage = DEFAULT_INVOICE_LANGUAGE
): InvoiceLanguage {
  const normalized = (value || "").trim().toLowerCase();
  return isSupportedInvoiceLanguage(normalized) ? normalized : fallback;
}

export function getInvoiceLanguageLabel(language: InvoiceLanguage): string {
  return INVOICE_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? INVOICE_LANGUAGE_OPTIONS[0].label;
}

export function getInvoiceLocale(language: InvoiceLanguage): string {
  return INVOICE_LOCALES[language];
}

export function formatInvoiceDate(value: string | Date, language: InvoiceLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(getInvoiceLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatInvoiceMoney(value: number, language: InvoiceLanguage): string {
  return new Intl.NumberFormat(getInvoiceLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getInvoiceStrings(language: InvoiceLanguage): InvoiceStrings {
  return INVOICE_STRINGS[language];
}

export function translateInvoiceStatus(status: string, language: InvoiceLanguage): string {
  const strings = getInvoiceStrings(language);
  return strings.status[status as InvoiceStatusValue] ?? status;
}

export function getQrBillLanguage(language: InvoiceLanguage): QrBillLanguage {
  return QR_BILL_LANGUAGES[language];
}

export function buildInvoiceAdditionalInformation(invoiceNumber: string, language: InvoiceLanguage): string {
  return `${getInvoiceStrings(language).invoice} ${invoiceNumber}`.trim();
}

export function buildDefaultInvoiceMessage(
  language: InvoiceLanguage,
  clientName: string,
  senderName: string
): string {
  const firstName =
    clientName
      .split(" ")
      .find((part) => part.trim().length > 0) || "there";
  const senderFirstName =
    senderName
      .split(" ")
      .find((part) => part.trim().length > 0) || senderName;

  if (language === "de") {
    return `Hallo ${firstName},\nVielen Dank für Ihr Vertrauen.\nHier finden Sie die Aufstellung der erbrachten Leistungen.\n\nFreundliche Grüsse,\n${senderFirstName}`;
  }

  if (language === "es") {
    return `Hola ${firstName},\nGracias por su confianza.\nAqui encontrara el detalle de los servicios prestados.\n\nSaludos cordiales,\n${senderFirstName}`;
  }

  if (language === "fr") {
    return `Bonjour ${firstName},\nMerci pour votre confiance.\nVous trouverez ci-dessous le detail des services fournis.\n\nMeilleures salutations,\n${senderFirstName}`;
  }

  if (language === "it") {
    return `Buongiorno ${firstName},\nGrazie per la fiducia.\nDi seguito trova il dettaglio dei servizi forniti.\n\nCordiali saluti,\n${senderFirstName}`;
  }

  return `Hello ${firstName},\nThank you for your trust.\nPlease find here the breakdown of the services.\n\nBest regards,\n${senderFirstName}`;
}

export function buildDefaultInvoicePaymentNote(language: InvoiceLanguage, phoneNumber: string): string {
  if (language === "de") {
    return `Zahlung via TWINT möglich unter ${phoneNumber}.`;
  }

  if (language === "es") {
    return `Pago por TWINT posible en ${phoneNumber}.`;
  }

  if (language === "fr") {
    return `Paiement par TWINT possible au ${phoneNumber}.`;
  }

  if (language === "it") {
    return `Pagamento tramite TWINT possibile al numero ${phoneNumber}.`;
  }

  return `Payment via TWINT possible at ${phoneNumber}.`;
}
