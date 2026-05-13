import { describe, expect, it } from "vitest";
import {
  APP_LANGUAGE_OPTIONS,
  normalizeAppLanguage,
  SUPPORTED_APP_LANGUAGES,
} from "@/lib/appLanguage";

describe("app language helpers", () => {
  it("normalizes app language to English only", () => {
    expect(normalizeAppLanguage("en")).toBe("en");
    expect(normalizeAppLanguage("ES")).toBe("en");
    expect(normalizeAppLanguage("de")).toBe("en");
    expect(normalizeAppLanguage("unknown")).toBe("en");
  });

  it("exposes only the English app language option", () => {
    const joinedLabels = APP_LANGUAGE_OPTIONS.map((option) => option.label).join(" ");
    expect(joinedLabels).toBe("English");
    expect(SUPPORTED_APP_LANGUAGES).toEqual(["en"]);
  });
});
