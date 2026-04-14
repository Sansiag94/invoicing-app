import { describe, expect, it } from "vitest";
import {
  getInvoiceVatConfigurationError,
  normalizeSwissVatNumber,
  normalizeSwissVatRate,
} from "@/lib/vat";

describe("Swiss VAT helpers", () => {
  it("normalizes Swiss VAT numbers with accepted language suffixes", () => {
    expect(normalizeSwissVatNumber("CHE288447571 MWST")).toBe("CHE-288.447.571 MWST");
    expect(normalizeSwissVatNumber("che-288.447.571 tva")).toBe("CHE-288.447.571 TVA");
    expect(normalizeSwissVatNumber("CHE 288 447 571 IVA")).toBe("CHE-288.447.571 IVA");
  });

  it("rejects UID-only and English VAT suffix values", () => {
    expect(normalizeSwissVatNumber("CHE-288.447.571")).toBeNull();
    expect(normalizeSwissVatNumber("CHE-288.447.571 VAT")).toBeNull();
  });

  it("allows only current Swiss VAT rates", () => {
    expect(normalizeSwissVatRate(0)).toBe(0);
    expect(normalizeSwissVatRate(2.6)).toBe(2.6);
    expect(normalizeSwissVatRate(3.8)).toBe(3.8);
    expect(normalizeSwissVatRate(8.1)).toBe(8.1);
    expect(normalizeSwissVatRate(7.7)).toBeNull();
  });

  it("blocks VAT charges for businesses that are not VAT registered", () => {
    expect(
      getInvoiceVatConfigurationError([{ taxRate: 8.1 }], {
        vatRegistered: false,
        vatNumber: null,
      })
    ).toBe("VAT cannot be charged because this business is not marked as VAT registered.");

    expect(
      getInvoiceVatConfigurationError([{ taxRate: 0 }], {
        vatRegistered: false,
        vatNumber: null,
      })
    ).toBeNull();
  });

  it("requires a valid VAT number before charging VAT", () => {
    expect(
      getInvoiceVatConfigurationError([{ taxRate: 8.1 }], {
        vatRegistered: true,
        vatNumber: "CHE-288.447.571",
      })
    ).toBe("Add a valid Swiss VAT number before charging VAT.");

    expect(
      getInvoiceVatConfigurationError([{ taxRate: 8.1 }], {
        vatRegistered: true,
        vatNumber: "CHE-288.447.571 MWST",
      })
    ).toBeNull();
  });
});
