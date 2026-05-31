export const DEFAULT_INVOICE_ATTACHMENTS_BUCKET = "invoice-email-attachments";
export const MAX_INVOICE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const SAFE_FILENAME_FALLBACK = "attachment";

export function getInvoiceAttachmentsBucketName(): string {
  return (
    process.env.SUPABASE_INVOICE_EMAIL_ATTACHMENTS_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_INVOICE_EMAIL_ATTACHMENTS_BUCKET?.trim() ||
    DEFAULT_INVOICE_ATTACHMENTS_BUCKET
  );
}

export function sanitizeInvoiceAttachmentFilename(filename: string): string {
  const trimmed = filename.trim();
  const normalized = trimmed
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 140)
    .trim();

  return normalized || SAFE_FILENAME_FALLBACK;
}

export function buildStoredInvoiceAttachmentPath(
  businessId: string,
  invoiceId: string,
  attachmentId: string,
  filename: string
): string {
  return `${businessId}/invoices/${invoiceId}/${attachmentId}-${sanitizeInvoiceAttachmentFilename(filename)}`;
}

export function isAllowedInvoiceAttachmentType(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const lowerName = file.name.toLowerCase();
  if (
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx")
  ) {
    return true;
  }

  return [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(file.type);
}
