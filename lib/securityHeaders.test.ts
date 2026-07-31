import { getSecurityHeaders } from "@/lib/securityHeaders";

describe("security headers", () => {
  it("keeps the app workspace protected from framing", () => {
    const headers = getSecurityHeaders("/dashboard");

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
  });

  it("lets public invoice pages open from email preview contexts", () => {
    const headers = getSecurityHeaders("/invoice/pay/token-123");

    expect(headers["X-Frame-Options"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(headers["Content-Security-Policy"]).toContain("https://mail.google.com");
    expect(headers["Content-Security-Policy"]).toContain("https://outlook.office.com");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("cross-origin");
  });
});
