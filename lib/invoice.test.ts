import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  compareInvoicesByRecency,
  deriveClientInvoicePrefix,
  deriveOfficialInvoicePrefix,
  formatDraftInvoiceNumber,
  formatSequentialInvoiceNumber,
  isDraftInvoiceNumber,
  normalizeInvoicePrefix,
  parseSequentialInvoiceNumber,
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

  it("parses sequential invoice numbers for sorting", () => {
    expect(parseSequentialInvoiceNumber("MA2026-031")).toEqual({
      prefix: "MA",
      year: 2026,
      sequence: 31,
    });
    expect(parseSequentialInvoiceNumber("DRAFT-20260318-AB12")).toBeNull();
    expect(parseSequentialInvoiceNumber("invoice-1")).toBeNull();
  });

  it("derives official invoice prefixes from the client company or first name", () => {
    expect(deriveOfficialInvoicePrefix("Maggie Widmer GmbH", "Maggie Widmer")).toBe("MA");
    expect(deriveOfficialInvoicePrefix("", "Maggie Widmer")).toBe("MA");
    expect(deriveOfficialInvoicePrefix(null, "Al")).toBe("AL");
    expect(deriveOfficialInvoicePrefix(null, null, "billing@example.com")).toBe("BI");
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

  it("sorts official invoice numbers ahead of drafts and by year then sequence", () => {
    const invoices = [
      {
        invoiceNumber: "DRAFT-20260401-AB12",
        issuedAt: null,
        createdAt: "2026-04-01T10:00:00.000Z",
      },
      {
        invoiceNumber: "MA2026-030",
        issuedAt: "2026-03-31T08:00:00.000Z",
        createdAt: "2026-03-31T08:00:00.000Z",
      },
      {
        invoiceNumber: "MI2026-032",
        issuedAt: "2026-04-01T08:00:00.000Z",
        createdAt: "2026-04-01T08:00:00.000Z",
      },
      {
        invoiceNumber: "AA2027-002",
        issuedAt: "2027-01-02T08:00:00.000Z",
        createdAt: "2027-01-02T08:00:00.000Z",
      },
    ];

    invoices.sort(compareInvoicesByRecency);

    expect(invoices.map((invoice) => invoice.invoiceNumber)).toEqual([
      "AA2027-002",
      "MI2026-032",
      "MA2026-030",
      "DRAFT-20260401-AB12",
    ]);
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
