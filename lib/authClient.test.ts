import { describe, expect, it } from "vitest";
import { buildVerifyEmailPath, isEmailConfirmationRequiredMessage } from "@/lib/authClient";

describe("auth client helpers", () => {
  it("detects common email confirmation errors", () => {
    expect(isEmailConfirmationRequiredMessage("Email not confirmed")).toBe(true);
    expect(isEmailConfirmationRequiredMessage("Please verify your email before logging in")).toBe(true);
    expect(isEmailConfirmationRequiredMessage("Invalid login credentials")).toBe(false);
  });

  it("builds the verify email path with or without an email", () => {
    expect(buildVerifyEmailPath("santi@example.com")).toBe("/verify-email?email=santi%40example.com");
    expect(buildVerifyEmailPath("")).toBe("/verify-email");
  });
});
