import { describe, expect, it } from "vitest";
import { getInvoiceSenderName, normalizeInvoiceSenderType } from "@/lib/business";

describe("business sender helpers", () => {
  it("defaults unknown sender types to company", () => {
    expect(normalizeInvoiceSenderType("company")).toBe("company");
    expect(normalizeInvoiceSenderType("owner")).toBe("owner");
    expect(normalizeInvoiceSenderType("something-else")).toBe("company");
  });

  it("uses the owner name when sender type is owner", () => {
    expect(
      getInvoiceSenderName({
        name: "Sierra Services",
        ownerName: "Santiago Sierra",
        invoiceSenderType: "owner",
      })
    ).toBe("Santiago Sierra");
  });

  it("falls back to company name or owner name when fields are missing", () => {
    expect(
      getInvoiceSenderName({
        name: "Sierra Services",
        ownerName: "Santiago Sierra",
        invoiceSenderType: "company",
      })
    ).toBe("Sierra Services");

    expect(
      getInvoiceSenderName({
        name: "",
        ownerName: "Santiago Sierra",
        invoiceSenderType: "company",
      })
    ).toBe("Santiago Sierra");
  });
});
