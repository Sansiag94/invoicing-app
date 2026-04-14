type VatRateLineItem = {
  taxRate: number;
};

type BusinessVatProfile = {
  vatRegistered?: boolean | null;
  vatNumber?: string | null;
};

export const SWISS_VAT_RATES = [0, 2.6, 3.8, 8.1] as const;
export const NON_VAT_REGISTERED_INVOICE_NOTE = "Not VAT registered; no Swiss VAT charged.";
export const SWISS_VAT_THRESHOLD_WARNING =
  "Swiss businesses above CHF 100,000 annual taxable turnover may need to register for VAT.";
export const VAT_COMPLIANCE_DISCLAIMER =
  "This software does not provide tax advice. You are responsible for VAT compliance.";

const SWISS_VAT_NUMBER_PATTERN = /^CHE[-\s]?(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})\s+(MWST|TVA|IVA)$/i;

export function normalizeSwissVatNumber(value: string | null | undefined): string | null {
  const match = (value ?? "").trim().match(SWISS_VAT_NUMBER_PATTERN);
  if (!match) {
    return null;
  }

  const [, first, second, third, suffix] = match;
  return `CHE-${first}.${second}.${third} ${suffix.toUpperCase()}`;
}

export function isValidSwissVatNumber(value: string | null | undefined): boolean {
  return normalizeSwissVatNumber(value) !== null;
}

export function normalizeSwissVatRate(value: number): (typeof SWISS_VAT_RATES)[number] | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  const matchesRoundedValue = Math.abs(value - rounded) < 0.000001;
  if (!matchesRoundedValue) {
    return null;
  }

  return SWISS_VAT_RATES.find((rate) => rate === rounded) ?? null;
}

export function isSupportedSwissVatRate(value: number): boolean {
  return normalizeSwissVatRate(value) !== null;
}

export function hasPositiveVatRate(lineItems: VatRateLineItem[]): boolean {
  return lineItems.some((item) => Number.isFinite(item.taxRate) && item.taxRate > 0);
}

export function getInvoiceVatConfigurationError(
  lineItems: VatRateLineItem[],
  business: BusinessVatProfile
): string | null {
  const usesVat = hasPositiveVatRate(lineItems);

  if (!business.vatRegistered) {
    return usesVat
      ? "VAT cannot be charged because this business is not marked as VAT registered."
      : null;
  }

  if (usesVat && !isValidSwissVatNumber(business.vatNumber)) {
    return "Add a valid Swiss VAT number before charging VAT.";
  }

  const unsupportedRate = lineItems.find((item) => !isSupportedSwissVatRate(item.taxRate));
  if (unsupportedRate) {
    return "Use a supported Swiss VAT rate: 0%, 2.6%, 3.8%, or 8.1%.";
  }

  return null;
}

export function getNonVatRegisteredInvoiceNote(business: BusinessVatProfile): string | null {
  return business.vatRegistered ? null : NON_VAT_REGISTERED_INVOICE_NOTE;
}
