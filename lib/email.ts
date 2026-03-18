import { Resend } from "resend";
import { getResendApiKey } from "@/lib/env";
import { APP_NAME } from "@/lib/appBrand";
import {
  buildPublicInvoiceLink as buildPublicInvoiceLinkValue,
  getPublicInvoiceBaseUrl,
} from "@/lib/publicInvoiceLink";

type SendInvoiceEmailInput = {
  to: string;
  businessName: string;
  recipientName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate?: Date | string | null;
  viewLink: string;
  payLink?: string | null;
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  } | null;
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

type SendManualInvoiceReminderEmailInput = {
  to: string;
  businessName: string;
  recipientName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  invoiceLink: string;
  dueDate: Date;
};

type SendWelcomeEmailInput = {
  to: string;
  appName?: string;
  dashboardLink?: string;
};

let resendClient: Resend | null = null;
const DEFAULT_RESEND_FROM_EMAIL = "Sierra Services <invoices@sierraservices.ch>";
const DEFAULT_RESEND_REPLY_TO_EMAIL = "santiago@sierraservices.ch";
const DEFAULT_WELCOME_FROM_NAME = APP_NAME;

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
  if (!publicToken.trim()) {
    throw new EmailConfigurationError("Missing public invoice token");
  }
  return buildPublicInvoiceLinkValue(publicToken, requestUrl);
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

function getConfiguredFromEmailAddress(): string {
  const configuredFrom = process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;
  const match = configuredFrom.match(/<([^>]+)>/);
  return match?.[1]?.trim() || configuredFrom.trim();
}

function buildSenderIdentity(displayName: string): string {
  const normalizedDisplayName = displayName.trim() || DEFAULT_WELCOME_FROM_NAME;
  return `${normalizedDisplayName} <${getConfiguredFromEmailAddress()}>`;
}

export async function sendInvoiceEmail({
  to,
  businessName,
  recipientName,
  invoiceNumber,
  totalAmount,
  currency,
  dueDate,
  viewLink,
  payLink,
  pdfAttachment,
}: SendInvoiceEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const parsedDueDate =
    dueDate instanceof Date ? dueDate : dueDate ? new Date(dueDate) : null;
  const dueDateLabel =
    parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? formatDueDate(parsedDueDate) : null;
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const effectivePayLink = payLink?.trim() || viewLink;
  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeDueDateLabel = dueDateLabel ? escapeHtml(dueDateLabel) : null;
  const safePayLink = escapeHtml(effectivePayLink);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${businessName} - Invoice ${invoiceNumber}`,
    text: `${greetingLine}

Please find attached invoice ${invoiceNumber} from ${businessName}.

Invoice number: ${invoiceNumber}
Total amount: ${formattedTotal}
${dueDateLabel ? `Due date: ${dueDateLabel}\n` : ""}A PDF copy is attached for your records.

View or pay online:
${effectivePayLink}
`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 14px; color: #334155;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">Your invoice from ${safeBusinessName}</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            Please find attached invoice <strong>${safeInvoiceNumber}</strong>. You can review it online or pay it directly using the button below.
          </p>
          <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 18px;">
            <div style="margin: 0 0 10px; color: #475569;">Invoice number: <strong style="color:#0f172a;">${safeInvoiceNumber}</strong></div>
            <div style="margin: 0 0 10px; color: #475569;">Total amount: <strong style="color:#0f172a;">${safeFormattedTotal}</strong></div>
            ${
              safeDueDateLabel
                ? `<div style="margin: 0; color: #475569;">Due date: <strong style="color:#0f172a;">${safeDueDateLabel}</strong></div>`
                : ""
            }
          </div>
          <div style="margin: 0 0 18px;">
            <a href="${safePayLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              View / Pay Invoice Online
            </a>
          </div>
          <p style="margin: 0 0 18px; color: #64748b; font-size: 13px;">
            A PDF copy of the invoice is attached for your records.
          </p>
          ${
            safeDueDateLabel
              ? `<p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">If payment has already been arranged, you can ignore this email.</p>`
              : ""
          }
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safePayLink}</span>
          </p>
        </div>
      </div>
    `,
    attachments: pdfAttachment
      ? [
          {
            filename: pdfAttachment.filename,
            content: pdfAttachment.content,
          },
        ]
      : undefined,
  });

  if (result.error) {
    console.error("[email] Resend failed", {
      to,
      businessName,
      invoiceNumber,
      totalAmount,
      currency,
      viewLink,
      payLink: effectivePayLink,
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
    viewLink,
    payLink: effectivePayLink,
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
  const from = buildSenderIdentity(businessName);
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
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 14px; color: #334155;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">Reminder from ${safeBusinessName}</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            Reminder for invoice <strong>${safeInvoiceNumber}</strong>.
          </p>
          <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 18px;">
            <div style="margin: 0 0 10px; color: #475569;">Invoice number: <strong style="color:#0f172a;">${safeInvoiceNumber}</strong></div>
            <div style="margin: 0 0 10px; color: #475569;">Amount: <strong style="color:#0f172a;">${safeFormattedTotal}</strong></div>
            <div style="margin: 0; color: #475569;">${safeTimingLine}</div>
          </div>
          <div style="margin: 0 0 18px;">
            <a href="${safeInvoiceLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              View / Pay Invoice Online
            </a>
          </div>
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
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

export async function sendManualInvoiceReminderEmail({
  to,
  businessName,
  recipientName,
  invoiceNumber,
  totalAmount,
  currency,
  invoiceLink,
  dueDate,
}: SendManualInvoiceReminderEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const dueDateLabel = formatDueDate(dueDate);
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeDueDateLabel = escapeHtml(dueDateLabel);
  const safeInvoiceLink = escapeHtml(invoiceLink);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${businessName} - Reminder for invoice ${invoiceNumber}`,
    text: `${greetingLine}

This is a reminder for invoice ${invoiceNumber}.
Amount: ${formattedTotal}
Due date: ${dueDateLabel}

View or pay online:
${invoiceLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 14px; color: #334155;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">Reminder from ${safeBusinessName}</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            This is a reminder for invoice <strong>${safeInvoiceNumber}</strong>.
          </p>
          <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 18px;">
            <div style="margin: 0 0 10px; color: #475569;">Invoice number: <strong style="color:#0f172a;">${safeInvoiceNumber}</strong></div>
            <div style="margin: 0 0 10px; color: #475569;">Total amount: <strong style="color:#0f172a;">${safeFormattedTotal}</strong></div>
            <div style="margin: 0; color: #475569;">Due date: <strong style="color:#0f172a;">${safeDueDateLabel}</strong></div>
          </div>
          <div style="margin: 0 0 18px;">
            <a href="${safeInvoiceLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              View / Pay Invoice Online
            </a>
          </div>
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeInvoiceLink}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    throw new EmailDeliveryError("Failed to send invoice reminder email");
  }

  return result;
}

export async function sendWelcomeEmail({
  to,
  appName = APP_NAME,
  dashboardLink,
}: SendWelcomeEmailInput) {
  const from = buildSenderIdentity(DEFAULT_WELCOME_FROM_NAME);
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const appLink = dashboardLink?.trim() || getPublicInvoiceBaseUrl();
  const safeAppName = escapeHtml(appName);
  const safeAppLink = escapeHtml(appLink);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `Welcome to ${appName}`,
    text: `Welcome to ${appName}.

Your account has been created successfully.

Open your workspace:
${appLink}
`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 14px; color: #334155;">Welcome,</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">Your ${safeAppName} account is ready</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            Your account has been created successfully. You can now open your workspace and start managing clients, invoices, and payments.
          </p>
          <div style="margin: 0 0 18px;">
            <a href="${safeAppLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              Open ${safeAppName}
            </a>
          </div>
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeAppLink}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Resend welcome email failed", {
      to,
      appName,
      dashboardLink: appLink,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send welcome email");
  }

  console.log("[email] Resend welcome email sent", {
    to,
    appName,
    dashboardLink: appLink,
    emailId: result.data?.id,
  });

  return result;
}
