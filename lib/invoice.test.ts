import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  deriveClientInvoicePrefix,
  formatSequentialInvoiceNumber,
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
