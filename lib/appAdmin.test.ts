import { afterEach, describe, expect, it, vi } from "vitest";
import { isAppAdminEmail, normalizeAdminEmail } from "@/lib/appAdmin";

describe("app admin helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes admin emails", () => {
    expect(normalizeAdminEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
    expect(normalizeAdminEmail("   ")).toBeNull();
    expect(normalizeAdminEmail(null)).toBeNull();
  });

  it("matches emails from APP_ADMIN_EMAILS", () => {
    vi.stubEnv("APP_ADMIN_EMAILS", "owner@example.com, second@example.com");

    expect(isAppAdminEmail("OWNER@example.com")).toBe(true);
    expect(isAppAdminEmail("other@example.com")).toBe(false);
  });
});
