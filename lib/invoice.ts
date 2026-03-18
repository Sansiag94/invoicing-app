import type { InvoiceCurrency } from "@/lib/types";

export const SUPPORTED_INVOICE_CURRENCIES: readonly InvoiceCurrency[] = ["CHF", "EUR"];
const DRAFT_INVOICE_PREFIX = "DRAFT-";

export type ParsedPostalAddress = {
  street: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  displayLines: string[];
};

type LineItemAmounts = {
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitAddressLines(value: string | null | undefined): string[] {
  if (!value) return [];

  return value
    .split(/\r?\n|,/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);
}

export function parsePostalAddress(
  address: string | null | undefined,
  country: string | null | undefined
): ParsedPostalAddress {
  const lines = splitAddressLines(address);
  const normalizedCountry = normalizeLine(country || "") || "CH";

  const street = lines[0] || "-";
  const postalCityLine = lines.find((line) => /^\d{4,6}\s+.+/.test(line));
  const postalCityMatch = postalCityLine?.match(/^(\d{4,6})\s+(.+)$/);

  const postalCode = postalCityMatch?.[1] || "";
  const city = postalCityMatch?.[2] || (lines[1] && lines[1] !== postalCityLine ? lines[1] : "");

  const line2Candidates = lines.filter(
    (line, index) => index > 0 && line !== postalCityLine && line !== city
  );
  const line2 = line2Candidates[0] || "";

  const displayLines = [street, line2, [postalCode, city].filter(Boolean).join(" "), normalizedCountry].filter(
    (line) => line.length > 0
  );

  return {
    street,
    line2,
    postalCode,
    city,
    country: normalizedCountry,
    displayLines,
  };
}

export function isSupportedInvoiceCurrency(value: string | null | undefined): value is InvoiceCurrency {
  return SUPPORTED_INVOICE_CURRENCIES.includes((value || "").toUpperCase() as InvoiceCurrency);
}

export function normalizeInvoiceCurrency(
  value: string | null | undefined,
  fallback: InvoiceCurrency = "CHF"
): InvoiceCurrency {
  const normalized = (value || "").trim().toUpperCase();
  return isSupportedInvoiceCurrency(normalized) ? normalized : fallback;
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function calculateInvoiceTotals(lineItems: LineItemAmounts[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice), 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (calculateLineTotal(item.quantity, item.unitPrice) * item.taxRate) / 100,
    0
  );

  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}

export function deriveClientInvoicePrefix(value: string | null | undefined): string {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  if (normalized.length >= 2) {
    return normalized.slice(0, 2);
  }

  if (normalized.length === 1) {
    return `${normalized}X`;
  }

  return "IN";
}

export function normalizeInvoicePrefix(
  prefix: string | null | undefined,
  businessName?: string | null
): string {
  const normalized = (prefix || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  if (normalized && normalized !== "INV") {
    return normalized.slice(0, 6);
  }

  if (businessName?.trim()) {
    return deriveClientInvoicePrefix(businessName);
  }

  return normalized || "INV";
}

export function formatSequentialInvoiceNumber(prefix: string, issueDate: Date, sequence: number): string {
  const year = issueDate.getUTCFullYear();
  const normalizedSequence = Number.isFinite(sequence) ? Math.max(1, Math.floor(sequence)) : 1;
  return `${prefix}${year}-${String(normalizedSequence).padStart(3, "0")}`;
}

export function formatDraftInvoiceNumber(issueDate: Date, suffix: string): string {
  const year = issueDate.getUTCFullYear();
  const month = String(issueDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(issueDate.getUTCDate()).padStart(2, "0");
  const normalizedSuffix = (suffix || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "DRAFT";

  return `${DRAFT_INVOICE_PREFIX}${year}${month}${day}-${normalizedSuffix}`;
}

export function isDraftInvoiceNumber(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(DRAFT_INVOICE_PREFIX);
}
