function sanitizeInvoiceNumber(value: string): string {
  return ((value || "invoice").trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")) || "invoice";
}

export function buildInvoicePdfFilename(invoiceNumber: string): string {
  return `invoice_${sanitizeInvoiceNumber(invoiceNumber)}.pdf`;
}
