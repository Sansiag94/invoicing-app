import { afterEach, describe, expect, it } from "vitest";
import {
  buildPublicInvoiceLink,
  buildPublicInvoiceLinkFromToken,
  getPublicInvoiceBaseUrl,
} from "@/lib/publicInvoiceLink";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("public invoice link helpers", () => {
  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("uses the configured app URL when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.sierraservices.ch";

    expect(getPublicInvoiceBaseUrl()).toBe("https://demo.sierraservices.ch");
    expect(buildPublicInvoiceLink("abc123")).toBe("https://demo.sierraservices.ch/invoice/pay/abc123");
  });

  it("falls back to the request origin when no configured URL is available", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(buildPublicInvoiceLink("abc123", "https://preview.example.com/invoices/1")).toBe(
      "https://preview.example.com/invoice/pay/abc123"
    );
  });

  it("trims tokens and rejects empty values", () => {
    expect(buildPublicInvoiceLinkFromToken(" abc123 ", "https://demo.example.com")).toBe(
      "https://demo.example.com/invoice/pay/abc123"
    );
    expect(() => buildPublicInvoiceLinkFromToken("   ", "https://demo.example.com")).toThrow(
      "Missing public invoice token"
    );
  });
});
