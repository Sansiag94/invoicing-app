import { APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export const LEGAL_LAST_UPDATED_ISO = "2026-03-19";
export const LEGAL_LAST_UPDATED_LABEL = "March 19, 2026";

const PLACEHOLDER_CONTACT_EMAIL = "legal@example.com";
const PLACEHOLDER_POSTAL_ADDRESS = "Add your registered business address";

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

  if (!legalEntityNameFromEnv) {
    incompleteFields.push("Set LEGAL_ENTITY_NAME to your registered company or sole-trader name.");
  }

  if (!contactEmailFromEnv) {
    incompleteFields.push("Set LEGAL_CONTACT_EMAIL to the inbox you want listed in your legal pages.");
  }

  if (!postalAddressFromEnv) {
    incompleteFields.push(
      "Set LEGAL_POSTAL_ADDRESS to a public correspondence address you are comfortable publishing, such as a PO box, c/o address, registered office, or coworking/virtual office."
    );
  }

  return {
    appName: APP_NAME,
    serviceName: readOptionalEnv("LEGAL_SERVICE_NAME") ?? APP_NAME,
    legalEntityName: legalEntityNameFromEnv ?? APP_NAME,
    tradingName: tradingNameFromEnv,
    contactEmail: contactEmailFromEnv ?? PLACEHOLDER_CONTACT_EMAIL,
    supportEmail: readOptionalEnv("LEGAL_SUPPORT_EMAIL") ?? contactEmailFromEnv ?? PLACEHOLDER_CONTACT_EMAIL,
    postalAddress: postalAddressFromEnv ?? PLACEHOLDER_POSTAL_ADDRESS,
    governingLaw: readOptionalEnv("LEGAL_GOVERNING_LAW") ?? "Switzerland",
    jurisdiction: readOptionalEnv("LEGAL_JURISDICTION") ?? "Zurich, Switzerland",
    websiteUrl,
    privacyUrl: new URL("/privacy", websiteUrl).toString(),
    termsUrl: new URL("/terms", websiteUrl).toString(),
    incompleteFields,
  };
}
