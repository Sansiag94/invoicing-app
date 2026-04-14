import { describe, expect, it } from "vitest";
import {
  COLLECTIBLE_INVOICE_STATUSES,
  OPEN_INVOICE_STATUSES,
  getInvoiceAmountDue,
  getOpenInvoiceStatus,
  isCollectibleInvoiceStatus,
  isOpenInvoiceStatus,
} from "@/lib/invoiceStatus";

describe("invoice status helpers", () => {
  it("keeps the open and collectible invoice status groups explicit", () => {
    expect(OPEN_INVOICE_STATUSES).toEqual(["draft", "sent", "overdue"]);
    expect(COLLECTIBLE_INVOICE_STATUSES).toEqual(["sent", "overdue"]);
  });

  it("treats paid and cancelled invoices as having no amount due", () => {
    expect(getInvoiceAmountDue("draft", 120)).toBe(120);
    expect(getInvoiceAmountDue("sent", 120)).toBe(120);
    expect(getInvoiceAmountDue("overdue", 120)).toBe(120);
    expect(getInvoiceAmountDue("paid", 120)).toBe(0);
    expect(getInvoiceAmountDue("cancelled", 120)).toBe(0);
  });

  it("detects open and collectible statuses safely", () => {
    expect(isOpenInvoiceStatus("draft")).toBe(true);
    expect(isOpenInvoiceStatus("cancelled")).toBe(false);
    expect(isCollectibleInvoiceStatus("sent")).toBe(true);
    expect(isCollectibleInvoiceStatus("cancelled")).toBe(false);
  });

  it("keeps invoices due today open until the next local day", () => {
    const today = new Date("2026-04-14T12:00:00");

    expect(getOpenInvoiceStatus(new Date("2026-04-13T00:00:00"), today)).toBe("overdue");
    expect(getOpenInvoiceStatus(new Date("2026-04-14T00:00:00"), today)).toBe("sent");
    expect(getOpenInvoiceStatus(new Date("2026-04-15T00:00:00"), today)).toBe("sent");
  });
});
