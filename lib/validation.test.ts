import { describe, expect, it } from "vitest";
import {
  isValidBic,
  isValidEmail,
  isValidIban,
  normalizeBic,
  normalizeIban,
} from "@/lib/validation";

describe("validation helpers", () => {
  it("validates email addresses", () => {
    expect(isValidEmail("hello@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("normalizes and validates IBAN values", () => {
    expect(normalizeIban(" ch93 0076 2011 6238 5295 7 ")).toBe("CH9300762011623852957");
    expect(isValidIban("CH93 0076 2011 6238 5295 7")).toBe(true);
    expect(isValidIban("1234")).toBe(false);
  });

  it("normalizes and validates BIC values", () => {
    expect(normalizeBic(" raifch22xxx ")).toBe("RAIFCH22XXX");
    expect(isValidBic("RAIFCH22")).toBe(true);
    expect(isValidBic("RAIFCH22XXX")).toBe(true);
    expect(isValidBic("INVALID")).toBe(false);
  });
});
