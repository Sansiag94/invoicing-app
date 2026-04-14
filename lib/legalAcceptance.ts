import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal";

export type LegalAcceptance = {
  acceptedTermsAt: Date | null;
  acceptedPrivacyAt: Date | null;
  acceptedLegalVersion: string | null;
};

export type StoredLegalAcceptance = LegalAcceptance;

export function parseAcceptedAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getLegalAcceptanceFromMetadata(metadataInput: unknown): LegalAcceptance {
  const metadata =
    metadataInput && typeof metadataInput === "object"
      ? (metadataInput as Record<string, unknown>)
      : {};

  const acceptedTermsAt = parseAcceptedAt(metadata.accepted_terms_at);
  const acceptedPrivacyAt = parseAcceptedAt(metadata.accepted_privacy_at);
  const acceptedLegalVersionRaw = metadata.accepted_legal_version;
  const acceptedLegalVersion =
    typeof acceptedLegalVersionRaw === "string" && acceptedLegalVersionRaw.trim()
      ? acceptedLegalVersionRaw.trim()
      : null;

  return {
    acceptedTermsAt,
    acceptedPrivacyAt,
    acceptedLegalVersion,
  };
}

export function hasCurrentLegalAcceptance(acceptance: LegalAcceptance): boolean {
  return Boolean(
    acceptance.acceptedTermsAt &&
      acceptance.acceptedPrivacyAt &&
      acceptance.acceptedLegalVersion === LEGAL_LAST_UPDATED_ISO
  );
}

export function hasStoredLegalAcceptance(acceptance: StoredLegalAcceptance): boolean {
  return Boolean(
    acceptance.acceptedTermsAt &&
      acceptance.acceptedPrivacyAt &&
      acceptance.acceptedLegalVersion
  );
}
