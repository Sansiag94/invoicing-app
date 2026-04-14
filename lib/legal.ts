import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export const LEGAL_LAST_UPDATED_ISO = "2026-03-20";
export const LEGAL_LAST_UPDATED_LABEL = "March 20, 2026";

const DEFAULT_SERVICE_NAME = "Sierra Invoices";
const DEFAULT_LEGAL_ENTITY_NAME = "Santiago Sierra Aguirre";
const DEFAULT_TRADING_NAME = "Sierra Services";
const DEFAULT_CONTACT_EMAIL = "santiago@sierraservices.ch";
const DEFAULT_POSTAL_ADDRESS = "8136 Gattikon - Zurich";
const DEFAULT_GOVERNING_LAW = "Switzerland";
const DEFAULT_JURISDICTION = "Zurich, Switzerland";

function readOptionalEnv(key: string): string | null {
  const value = process.env[key];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractEmailAddress(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/<([^>]+)>/);
  const email = (match?.[1] ?? normalized).trim();
  return email.length > 0 ? email : null;
}

export type LegalProfile = {
  appName: string;
  serviceName: string;
  legalEntityName: string;
  tradingName: string | null;
  contactEmail: string;
  supportEmail: string;
  phoneNumber: string | null;
  registrationNumber: string | null;
  postalAddress: string;
  governingLaw: string;
  jurisdiction: string;
  websiteUrl: string;
  privacyUrl: string;
  termsUrl: string;
  incompleteFields: string[];
};

export function getLegalProfile(): LegalProfile {
  const websiteUrl = getPublicInvoiceBaseUrl();
  const legalEntityNameFromEnv = readOptionalEnv("LEGAL_ENTITY_NAME");
  const tradingNameFromEnv = readOptionalEnv("LEGAL_TRADING_NAME");
  const contactEmailFromEnv =
    readOptionalEnv("LEGAL_CONTACT_EMAIL") ??
    extractEmailAddress(process.env.RESEND_REPLY_TO_EMAIL) ??
    extractEmailAddress(process.env.RESEND_FROM_EMAIL);
  const postalAddressFromEnv = readOptionalEnv("LEGAL_POSTAL_ADDRESS");

  const incompleteFields: string[] = [];

  const legalEntityName = legalEntityNameFromEnv ?? DEFAULT_LEGAL_ENTITY_NAME;
  const tradingName = tradingNameFromEnv ?? DEFAULT_TRADING_NAME;
  const contactEmail = contactEmailFromEnv ?? DEFAULT_CONTACT_EMAIL;
  const postalAddress = postalAddressFromEnv ?? DEFAULT_POSTAL_ADDRESS;

  return {
    appName: APP_NAME,
    serviceName: readOptionalEnv("LEGAL_SERVICE_NAME") ?? DEFAULT_SERVICE_NAME,
    legalEntityName,
    tradingName,
    contactEmail,
    supportEmail: readOptionalEnv("LEGAL_SUPPORT_EMAIL") ?? contactEmail,
    phoneNumber: readOptionalEnv("LEGAL_PHONE_NUMBER"),
    registrationNumber: readOptionalEnv("LEGAL_REGISTRATION_NUMBER"),
    postalAddress,
    governingLaw: readOptionalEnv("LEGAL_GOVERNING_LAW") ?? DEFAULT_GOVERNING_LAW,
    jurisdiction: readOptionalEnv("LEGAL_JURISDICTION") ?? DEFAULT_JURISDICTION,
    websiteUrl,
    privacyUrl: new URL("/privacy", websiteUrl).toString(),
    termsUrl: new URL("/terms", websiteUrl).toString(),
    incompleteFields,
  };
}
