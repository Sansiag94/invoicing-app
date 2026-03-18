import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  deriveClientInvoicePrefix,
  formatDraftInvoiceNumber,
  formatSequentialInvoiceNumber,
  isDraftInvoiceNumber,
  normalizeInvoicePrefix,
} from "@/lib/invoice";

describe("invoice helpers", () => {
  it("derives two-letter prefixes from client names", () => {
    expect(deriveClientInvoicePrefix("Minerals AG")).toBe("MI");
    expect(deriveClientInvoicePrefix("COPERA GmbH")).toBe("CO");
    expect(deriveClientInvoicePrefix("Élan Studio")).toBe("EL");
  });

  it("formats sequential invoice numbers with year and padding", () => {
    expect(formatSequentialInvoiceNumber("MI", new Date("2026-03-15T00:00:00Z"), 1)).toBe(
      "MI2026-001"
    );
    expect(formatSequentialInvoiceNumber("CO", new Date("2026-03-15T00:00:00Z"), 27)).toBe(
      "CO2026-027"
    );
  });

  it("normalizes invoice prefixes and falls back to business initials", () => {
    expect(normalizeInvoicePrefix(" ss ", "Sierra Services")).toBe("SS");
    expect(normalizeInvoicePrefix("INV", "Sierra Services")).toBe("SI");
    expect(normalizeInvoicePrefix("", "Sierra Services")).toBe("SI");
  });

  it("creates recognizable draft invoice numbers", () => {
    const value = formatDraftInvoiceNumber(new Date("2026-03-18T00:00:00Z"), "ab12");
    expect(value).toBe("DRAFT-20260318-AB12");
    expect(isDraftInvoiceNumber(value)).toBe(true);
    expect(isDraftInvoiceNumber("SI2026-001")).toBe(false);
  });

  it("calculates subtotal, tax, and total", () => {
    expect(
      calculateInvoiceTotals([
        { quantity: 2, unitPrice: 50, taxRate: 0 },
        { quantity: 1, unitPrice: 100, taxRate: 8.1 },
      ])
    ).toEqual({
      subtotal: 200,
      taxAmount: 8.1,
      totalAmount: 208.1,
    });
  });
});
