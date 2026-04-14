import { describe, expect, it } from "vitest";
import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal";
import {
  getLegalAcceptanceFromMetadata,
  hasCurrentLegalAcceptance,
  hasStoredLegalAcceptance,
  parseAcceptedAt,
} from "@/lib/legalAcceptance";

describe("legal acceptance helpers", () => {
  it("parses valid acceptance dates and rejects invalid values", () => {
    expect(parseAcceptedAt("2026-03-20T12:00:00.000Z")?.toISOString()).toBe(
      "2026-03-20T12:00:00.000Z"
    );
    expect(parseAcceptedAt("not-a-date")).toBeNull();
    expect(parseAcceptedAt(null)).toBeNull();
  });

  it("extracts legal acceptance metadata without assuming missing version consent", () => {
    const acceptedAt = "2026-03-20T12:00:00.000Z";

    expect(
      getLegalAcceptanceFromMetadata({
        accepted_terms_at: acceptedAt,
        accepted_privacy_at: acceptedAt,
        accepted_legal_version: LEGAL_LAST_UPDATED_ISO,
      })
    ).toEqual({
      acceptedTermsAt: new Date(acceptedAt),
      acceptedPrivacyAt: new Date(acceptedAt),
      acceptedLegalVersion: LEGAL_LAST_UPDATED_ISO,
    });

    expect(
      getLegalAcceptanceFromMetadata({
        accepted_terms_at: acceptedAt,
        accepted_privacy_at: acceptedAt,
      })
    ).toEqual({
      acceptedTermsAt: new Date(acceptedAt),
      acceptedPrivacyAt: new Date(acceptedAt),
      acceptedLegalVersion: null,
    });
  });

  it("requires current legal version for new account acceptance", () => {
    const acceptedAt = new Date("2026-03-20T12:00:00.000Z");

    expect(
      hasCurrentLegalAcceptance({
        acceptedTermsAt: acceptedAt,
        acceptedPrivacyAt: acceptedAt,
        acceptedLegalVersion: LEGAL_LAST_UPDATED_ISO,
      })
    ).toBe(true);

    expect(
      hasCurrentLegalAcceptance({
        acceptedTermsAt: acceptedAt,
        acceptedPrivacyAt: acceptedAt,
        acceptedLegalVersion: "2026-01-01",
      })
    ).toBe(false);
  });

  it("recognizes stored acceptance for existing accounts", () => {
    const acceptedAt = new Date("2026-03-20T12:00:00.000Z");

    expect(
      hasStoredLegalAcceptance({
        acceptedTermsAt: acceptedAt,
        acceptedPrivacyAt: acceptedAt,
        acceptedLegalVersion: "2026-01-01",
      })
    ).toBe(true);

    expect(
      hasStoredLegalAcceptance({
        acceptedTermsAt: acceptedAt,
        acceptedPrivacyAt: null,
        acceptedLegalVersion: "2026-01-01",
      })
    ).toBe(false);
  });
});
