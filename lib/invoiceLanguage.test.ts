import { describe, expect, it } from "vitest";
import {
  buildDefaultInvoiceMessage,
  buildDefaultInvoicePaymentNote,
  buildWorkItemInvoiceSubject,
  formatInvoiceDate,
  getInvoiceLanguageLabel,
  getInvoiceStrings,
  getQrBillLanguage,
  normalizeInvoiceLanguage,
  translateInvoiceStatus,
} from "@/lib/invoiceLanguage";

describe("invoice language helpers", () => {
  it("normalizes supported languages and falls back to english", () => {
    expect(normalizeInvoiceLanguage("DE")).toBe("de");
    expect(normalizeInvoiceLanguage("it")).toBe("it");
    expect(normalizeInvoiceLanguage("pt")).toBe("en");
    expect(normalizeInvoiceLanguage(null)).toBe("en");
  });

  it("returns readable labels and translated status values", () => {
    expect(getInvoiceLanguageLabel("fr")).toBe("French");
    expect(translateInvoiceStatus("overdue", "de")).toBe("\u00DCberf\u00E4llig");
    expect(translateInvoiceStatus("paid", "es")).toBe("Pagada");
    expect(translateInvoiceStatus("cancelled", "en")).toBe("Cancelled");
  });

  it("formats dates with the selected locale", () => {
    expect(formatInvoiceDate("2026-03-24T00:00:00.000Z", "en")).toBe("24/03/2026");
    expect(formatInvoiceDate("2026-03-24T00:00:00.000Z", "de")).toBe("24.03.2026");
  });

  it("builds translated default messages and qr-bill languages", () => {
    expect(buildDefaultInvoiceMessage("it", "Mario Rossi", "Luca Bianchi")).toContain(
      "Buongiorno Mario"
    );
    expect(buildDefaultInvoicePaymentNote("de", "+41 76 231 02 35")).toBe(
      "Zahlung via TWINT m\u00F6glich unter +41 76 231 02 35."
    );
    expect(buildDefaultInvoicePaymentNote("fr", "+41 76 231 02 35")).toBe(
      "Paiement par TWINT possible au +41 76 231 02 35."
    );
    expect(getQrBillLanguage("es")).toBe("EN");
    expect(getQrBillLanguage("fr")).toBe("FR");
    expect(getInvoiceStrings("de").paymentOptions).toBe("Zahlungsoptionen");
  });

  it("uses the client invoice language for monthly work subjects", () => {
    const mayDate = new Date("2026-05-28T00:00:00.000Z");

    expect(buildWorkItemInvoiceSubject([mayDate], "de")).toBe("Leistungen Mai 2026");
    expect(buildWorkItemInvoiceSubject([mayDate], "en")).toBe("Services May 2026");
    expect(buildWorkItemInvoiceSubject([mayDate], "es")).toBe("Servicios de mayo de 2026");
    expect(buildWorkItemInvoiceSubject([mayDate], "fr")).toBe("Services de mai 2026");
    expect(buildWorkItemInvoiceSubject([mayDate], "it")).toBe("Servizi di maggio 2026");
  });

  it("uses localized generic work subjects for services spanning multiple months", () => {
    expect(
      buildWorkItemInvoiceSubject(
        [new Date("2026-05-28T00:00:00.000Z"), new Date("2026-06-01T00:00:00.000Z")],
        "de"
      )
    ).toBe("Offene Leistungen");
  });
});
