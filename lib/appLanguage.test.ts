import { describe, expect, it } from "vitest";
import {
  APP_LANGUAGE_OPTIONS,
  normalizeAppLanguage,
  SUPPORTED_APP_LANGUAGES,
} from "@/lib/appLanguage";

describe("app language helpers", () => {
  it("normalizes supported app languages", () => {
    expect(normalizeAppLanguage("ES")).toBe("es");
    expect(normalizeAppLanguage("de")).toBe("de");
    expect(normalizeAppLanguage("unknown")).toBe("en");
  });

  it("keeps German labels free of eszett", () => {
    const joinedLabels = APP_LANGUAGE_OPTIONS.map((option) => option.label).join(" ");
    expect(joinedLabels).not.toContain("ß");
    expect(SUPPORTED_APP_LANGUAGES).toEqual(["en", "de", "es", "fr", "it"]);
  });
});
