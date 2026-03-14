import { Resend } from "resend";
import { getResendApiKey } from "@/lib/env";

type SendInvoiceEmailInput = {
  to: string;
  businessName: string;
  recipientName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate?: Date | string | null;
  invoiceLink: string;
};

export type InvoiceReminderKind = "before_due_3_days" | "after_due_7_days";

type SendInvoiceReminderEmailInput = {
  to: string;
  businessName: string;
  recipientName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  invoiceLink: string;
  dueDate: Date;
  reminderKind: InvoiceReminderKind;
};

let resendClient: Resend | null = null;
const DEFAULT_RESEND_FROM_EMAIL = "Sierra Services <invoices@sierraservices.ch>";
const DEFAULT_RESEND_REPLY_TO_EMAIL = "santiago@sierraservices.ch";

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export function isEmailConfigurationError(error: unknown): error is EmailConfigurationError {
  return error instanceof EmailConfigurationError;
}

export function isEmailDeliveryError(error: unknown): error is EmailDeliveryError {
  return error instanceof EmailDeliveryError;
}

export function buildPublicInvoiceLink(publicToken: string, requestUrl?: string): string {
  const normalizedToken = publicToken.trim();
  if (!normalizedToken) {
    throw new EmailConfigurationError("Missing public invoice token");
  }
  const encodedToken = encodeURIComponent(normalizedToken);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    return new URL(`/invoice/pay/${encodedToken}`, appUrl).toString();
  }

  if (requestUrl) {
    const origin = new URL(requestUrl).origin;
    return new URL(`/invoice/pay/${encodedToken}`, origin).toString();
  }

  throw new EmailConfigurationError("Missing NEXT_PUBLIC_APP_URL for public invoice links");
}

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  try {
    resendClient = new Resend(getResendApiKey());
  } catch (error) {
    if (error instanceof Error) {
      throw new EmailConfigurationError(error.message);
    }
    throw new EmailConfigurationError("Missing RESEND_API_KEY");
  }
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDueDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

export async function sendInvoiceEmail({
  to,
  businessName,
  recipientName,
  invoiceNumber,
  totalAmount,
  currency,
  dueDate,
  invoiceLink,
}: SendInvoiceEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const parsedDueDate =
    dueDate instanceof Date ? dueDate : dueDate ? new Date(dueDate) : null;
  const dueDateLabel =
    parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? formatDueDate(parsedDueDate) : null;
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeDueDateLabel = dueDateLabel ? escapeHtml(dueDateLabel) : null;
  const safeInvoiceLink = escapeHtml(invoiceLink);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${businessName} - Invoice ${invoiceNumber}`,
    text: `${greetingLine}

${businessName} sent you invoice ${invoiceNumber}.
Total amount: ${formattedTotal}
${dueDateLabel ? `Due date: ${dueDateLabel}\n` : ""}

Please view your invoice here:

${invoiceLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px;">
          <p style="margin: 0 0 12px; color: #333333;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 12px; color: #111111;">${safeBusinessName}</h2>
          <p style="margin: 0 0 8px; color: #333333;">Invoice <strong>${safeInvoiceNumber}</strong></p>
          <p style="margin: 0 0 20px; color: #333333;">Total amount: <strong>${safeFormattedTotal}</strong></p>
          ${
            safeDueDateLabel
              ? `<p style="margin: 0 0 20px; color: #333333;">Due date: <strong>${safeDueDateLabel}</strong></p>`
              : ""
          }
          <a href="${safeInvoiceLink}" style="display: inline-block; padding: 12px 16px; background: #111111; color: #ffffff; text-decoration: none; border-radius: 6px;">
            View Invoice
          </a>
          <p style="margin: 20px 0 0; color: #666666; font-size: 13px;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeInvoiceLink}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Resend failed", {
      to,
      businessName,
      invoiceNumber,
      totalAmount,
      currency,
      invoiceLink,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send invoice email");
  }

  console.log("[email] Resend email sent", {
    to,
    businessName,
    invoiceNumber,
    totalAmount,
    currency,
    invoiceLink,
    emailId: result.data?.id,
  });

  return result;
}

export async function sendInvoiceReminderEmail({
  to,
  businessName,
  recipientName,
  invoiceNumber,
  totalAmount,
  currency,
  invoiceLink,
  dueDate,
  reminderKind,
}: SendInvoiceReminderEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const dueDateLabel = formatDueDate(dueDate);
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const isBeforeDue = reminderKind === "before_due_3_days";
  const timingLine = isBeforeDue
    ? `This invoice is due on ${dueDateLabel} (in 3 days).`
    : `This invoice was due on ${dueDateLabel} (7 days ago).`;
  const subject = isBeforeDue
    ? `${businessName} - Reminder: Invoice ${invoiceNumber} due soon`
    : `${businessName} - Reminder: Invoice ${invoiceNumber} is overdue`;

  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeTimingLine = escapeHtml(timingLine);
  const safeInvoiceLink = escapeHtml(invoiceLink);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject,
    text: `${greetingLine}

Reminder for invoice ${invoiceNumber}.
Amount: ${formattedTotal}
${timingLine}

View invoice:
${invoiceLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px;">
          <p style="margin: 0 0 12px; color: #333333;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 12px; color: #111111;">${safeBusinessName}</h2>
          <p style="margin: 0 0 8px; color: #333333;">Reminder for invoice <strong>${safeInvoiceNumber}</strong></p>
          <p style="margin: 0 0 8px; color: #333333;">Amount: <strong>${safeFormattedTotal}</strong></p>
          <p style="margin: 0 0 20px; color: #333333;">${safeTimingLine}</p>
          <a href="${safeInvoiceLink}" style="display: inline-block; padding: 12px 16px; background: #111111; color: #ffffff; text-decoration: none; border-radius: 6px;">
            View Invoice
          </a>
          <p style="margin: 20px 0 0; color: #666666; font-size: 13px;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeInvoiceLink}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Resend reminder failed", {
      to,
      businessName,
      invoiceNumber,
      totalAmount,
      currency,
      invoiceLink,
      reminderKind,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send invoice reminder email");
  }

  console.log("[email] Resend reminder email sent", {
    to,
    businessName,
    invoiceNumber,
    totalAmount,
    currency,
    invoiceLink,
    reminderKind,
    emailId: result.data?.id,
  });

  return result;
}
