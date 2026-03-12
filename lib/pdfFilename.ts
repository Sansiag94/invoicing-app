function sanitizeInvoiceNumber(value: string): string {
  return ((value || "invoice").trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")) || "invoice";
}

function sanitizeClientName(value: string): string {
  return ((value || "client")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")) || "client";
}

export function buildInvoicePdfFilename(invoiceNumber: string, clientName: string): string {
  return `invoice_${sanitizeInvoiceNumber(invoiceNumber)}_${sanitizeClientName(clientName)}.pdf`;
}
