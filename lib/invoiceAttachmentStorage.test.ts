import {
  buildStoredInvoiceAttachmentPath,
  sanitizeInvoiceAttachmentFilename,
} from "@/lib/invoiceAttachmentStorage";

describe("invoice attachment storage", () => {
  it("sanitizes attachment filenames", () => {
    expect(sanitizeInvoiceAttachmentFilename("  receipt <may>.pdf  ")).toBe("receipt may.pdf");
    expect(sanitizeInvoiceAttachmentFilename("")).toBe("attachment");
  });

  it("builds stored attachment paths under the business and invoice", () => {
    expect(
      buildStoredInvoiceAttachmentPath(
        "business-1",
        "invoice-2",
        "attachment-3",
        "receipt.pdf"
      )
    ).toBe("business-1/invoices/invoice-2/attachment-3-receipt.pdf");
  });
});
