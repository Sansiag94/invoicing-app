import {
  assertAuthorizedCronRequest,
  CronAuthorizationError,
  getCronAuthorizationToken,
  isCronAuthorizationError,
} from "@/lib/cronAuth";

describe("cron auth helpers", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("reads the cron secret from x-cron-secret first", () => {
    const request = new Request("https://example.com/api/cron/reminders", {
      headers: {
        "x-cron-secret": "header-secret",
        Authorization: "Bearer ignored",
      },
    });

    expect(getCronAuthorizationToken(request)).toBe("header-secret");
  });

  it("reads a bearer token from authorization", () => {
    const request = new Request("https://example.com/api/cron/reminders", {
      headers: {
        Authorization: "Bearer token-123",
      },
    });

    expect(getCronAuthorizationToken(request)).toBe("token-123");
  });

  it("rejects missing configuration", () => {
    delete process.env.CRON_SECRET;
    const request = new Request("https://example.com/api/cron/reminders");

    try {
      assertAuthorizedCronRequest(request);
      throw new Error("Expected cron auth to fail");
    } catch (error) {
      expect(isCronAuthorizationError(error)).toBe(true);
      expect(error).toBeInstanceOf(CronAuthorizationError);
      expect((error as CronAuthorizationError).status).toBe(500);
      expect((error as CronAuthorizationError).message).toBe("CRON_SECRET is not configured");
    }
  });

  it("rejects an invalid token", () => {
    process.env.CRON_SECRET = "expected-secret";
    const request = new Request("https://example.com/api/cron/reminders", {
      headers: {
        Authorization: "Bearer wrong-secret",
      },
    });

    try {
      assertAuthorizedCronRequest(request);
      throw new Error("Expected cron auth to fail");
    } catch (error) {
      expect(isCronAuthorizationError(error)).toBe(true);
      expect((error as CronAuthorizationError).status).toBe(401);
      expect((error as CronAuthorizationError).message).toBe("Unauthorized cron request");
    }
  });

  it("accepts a matching token", () => {
    process.env.CRON_SECRET = "expected-secret";
    const request = new Request("https://example.com/api/cron/reminders", {
      headers: {
        "x-cron-secret": "expected-secret",
      },
    });

    expect(() => assertAuthorizedCronRequest(request)).not.toThrow();
  });
});
