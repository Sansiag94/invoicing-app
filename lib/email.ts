import { Resend } from "resend";
import { getResendApiKey } from "@/lib/env";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile } from "@/lib/legal";
import {
  buildPublicInvoiceLink as buildPublicInvoiceLinkValue,
  getPublicInvoiceBaseUrl,
} from "@/lib/publicInvoiceLink";
import type { MonthlyReportMetrics } from "@/lib/types";

type SendInvoiceEmailInput = {
  to: string;
  businessName: string;
  recipientName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  amountDue?: number;
  currency: string;
  dueDate?: Date | string | null;
  viewLink: string;
  payLink?: string | null;
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  } | null;
  extraAttachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
  replyToEmail?: string | null;
  bankTransferDetails?: BankTransferDetails | null;
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
  bankTransferDetails?: BankTransferDetails | null;
  replyToEmail?: string | null;
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
  bankTransferDetails?: BankTransferDetails | null;
  replyToEmail?: string | null;
};

type BankTransferDetails = {
  accountHolder?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  reference?: string | null;
};

type SendWelcomeEmailInput = {
  to: string;
  appName?: string;
  dashboardLink?: string;
};

type SendMonthlyReportEmailInput = {
  to: string;
  businessName: string;
  monthLabel: string;
  currency: string;
  metrics: MonthlyReportMetrics;
  analyticsLink: string;
};

type SendSupportEscalationEmailInput = {
  to: string;
  userEmail: string;
  businessName: string;
  question: string;
  transcript: string;
  pagePath?: string | null;
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

function formatIban(value: string | null | undefined): string {
  const compact = value?.replace(/\s+/g, "").toUpperCase();
  return compact?.match(/.{1,4}/g)?.join(" ") ?? compact ?? "";
}

function buildBankTransferRows(details: BankTransferDetails | null | undefined, amountLabel: string) {
  if (!details || (!details.iban && !details.bankName)) {
    return [];
  }

  return [
    details.accountHolder ? ["Account holder", details.accountHolder] : null,
    details.bankName ? ["Bank", details.bankName] : null,
    details.iban ? ["IBAN", formatIban(details.iban)] : null,
    ["Amount", amountLabel],
    details.reference ? ["Reference", details.reference] : null,
  ].filter((row): row is [string, string] => Boolean(row?.[1]));
}

function renderBankTransferText(rows: Array<[string, string]>): string {
  if (rows.length === 0) {
    return "";
  }

  return `\nBank transfer details:\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n`;
}

function renderBankTransferHtml(rows: Array<[string, string]>): string {
  if (rows.length === 0) {
    return "";
  }

  return `
    <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; padding: 18px;">
      <p style="margin: 0 0 12px; color: #0f172a; font-size: 14px; font-weight: 700;">Bank transfer details</p>
      ${rows
        .map(
          ([label, value]) => `
            <div style="display: flex; justify-content: space-between; gap: 16px; margin: 0 0 8px; color: #475569; font-size: 13px;">
              <span style="font-weight: 600; color: #64748b;">${escapeHtml(label)}</span>
              <strong style="color:#0f172a; text-align: right;">${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
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

function getLegalEmailLinks() {
  const profile = getLegalProfile();
  return {
    privacyUrl: profile.privacyUrl,
    termsUrl: profile.termsUrl,
  };
}

export async function sendInvoiceEmail({
  to,
  businessName,
  recipientName,
  invoiceNumber,
  totalAmount,
  amountDue,
  currency,
  dueDate,
  viewLink,
  payLink,
  pdfAttachment,
  extraAttachments = [],
  replyToEmail,
  bankTransferDetails,
}: SendInvoiceEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = replyToEmail?.trim() || process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const payableAmount = amountDue ?? totalAmount;
  const formattedAmountDue = `${currency} ${payableAmount.toFixed(2)}`;
  const isAlreadyPaid = payableAmount <= 0;
  const parsedDueDate =
    dueDate instanceof Date ? dueDate : dueDate ? new Date(dueDate) : null;
  const dueDateLabel =
    parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? formatDueDate(parsedDueDate) : null;
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const effectivePayLink = payLink?.trim() || viewLink;
  const bankTransferRows = isAlreadyPaid ? [] : buildBankTransferRows(bankTransferDetails, formattedTotal);
  const bankTransferText = renderBankTransferText(bankTransferRows);
  const bankTransferHtml = renderBankTransferHtml(bankTransferRows);
  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeFormattedAmountDue = escapeHtml(formattedAmountDue);
  const safeDueDateLabel = dueDateLabel ? escapeHtml(dueDateLabel) : null;
  const safePayLink = escapeHtml(effectivePayLink);
  const { privacyUrl } = getLegalEmailLinks();
  const safePrivacyUrl = escapeHtml(privacyUrl);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${businessName} - Invoice ${invoiceNumber}`,
    text: `${greetingLine}

Please find attached invoice ${invoiceNumber} from ${businessName}.

Invoice number: ${invoiceNumber}
Total amount: ${formattedTotal}
Amount due: ${formattedAmountDue}
${isAlreadyPaid ? "This invoice has already been paid. No further payment is due.\n" : ""}
${dueDateLabel && !isAlreadyPaid ? `Due date: ${dueDateLabel}\n` : ""}A PDF copy is attached for your records.

${isAlreadyPaid ? "View invoice online:" : "View or pay online:"}
${effectivePayLink}
${bankTransferText}

Privacy notice:
${privacyUrl}
`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 14px; color: #334155;">${safeGreetingLine}</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">Your invoice from ${safeBusinessName}</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            ${
              isAlreadyPaid
                ? `Please find attached invoice <strong>${safeInvoiceNumber}</strong>. This invoice has already been paid and no further payment is due.`
                : `Please find attached invoice <strong>${safeInvoiceNumber}</strong>. You can review it online or pay it directly using the button below.`
            }
          </p>
          <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 18px;">
            <div style="margin: 0 0 10px; color: #475569;">Invoice number: <strong style="color:#0f172a;">${safeInvoiceNumber}</strong></div>
            <div style="margin: 0 0 10px; color: #475569;">Total amount: <strong style="color:#0f172a;">${safeFormattedTotal}</strong></div>
            <div style="margin: 0 0 10px; color: #475569;">Amount due: <strong style="color:#0f172a;">${safeFormattedAmountDue}</strong></div>
            ${
              safeDueDateLabel && !isAlreadyPaid
                ? `<div style="margin: 0; color: #475569;">Due date: <strong style="color:#0f172a;">${safeDueDateLabel}</strong></div>`
                : ""
            }
          </div>
          <div style="margin: 0 0 18px;">
            <a href="${safePayLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              ${isAlreadyPaid ? "View Invoice Online" : "View / Pay Invoice Online"}
            </a>
          </div>
          <p style="margin: 0 0 18px; color: #64748b; font-size: 13px;">
            A PDF copy of the invoice is attached for your records.
          </p>
          ${bankTransferHtml}
          ${
            safeDueDateLabel && !isAlreadyPaid
              ? `<p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">If payment has already been arranged, you can ignore this email.</p>`
              : ""
          }
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safePayLink}</span>
          </p>
          <p style="margin: 14px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            Privacy notice: <a href="${safePrivacyUrl}" style="color: #475569;">${safePrivacyUrl}</a>
          </p>
        </div>
      </div>
    `,
    attachments: [
      ...(pdfAttachment
        ? [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.content,
            },
          ]
        : []),
      ...extraAttachments,
    ],
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
  bankTransferDetails,
  replyToEmail,
}: SendInvoiceReminderEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = replyToEmail?.trim() || process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const dueDateLabel = formatDueDate(dueDate);
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const isBeforeDue = reminderKind === "before_due_3_days";
  const timingLine = isBeforeDue
    ? `This invoice is due on ${dueDateLabel} (in 3 days).`
    : `This invoice was due on ${dueDateLabel} (7 days ago).`;
  const bankTransferRows = buildBankTransferRows(bankTransferDetails, formattedTotal);
  const bankTransferText = renderBankTransferText(bankTransferRows);
  const bankTransferHtml = renderBankTransferHtml(bankTransferRows);
  const subject = isBeforeDue
    ? `${businessName} - Reminder: Invoice ${invoiceNumber} due soon`
    : `${businessName} - Reminder: Invoice ${invoiceNumber} is overdue`;

  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeTimingLine = escapeHtml(timingLine);
  const safeInvoiceLink = escapeHtml(invoiceLink);
  const { privacyUrl } = getLegalEmailLinks();
  const safePrivacyUrl = escapeHtml(privacyUrl);

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
${invoiceLink}
${bankTransferText}

Privacy notice:
${privacyUrl}`,
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
          ${bankTransferHtml}
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeInvoiceLink}</span>
          </p>
          <p style="margin: 14px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            Privacy notice: <a href="${safePrivacyUrl}" style="color: #475569;">${safePrivacyUrl}</a>
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
  bankTransferDetails,
  replyToEmail,
}: SendManualInvoiceReminderEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = replyToEmail?.trim() || process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const dueDateLabel = formatDueDate(dueDate);
  const normalizedRecipientName = recipientName?.trim();
  const greetingLine = normalizedRecipientName ? `Hello ${normalizedRecipientName},` : "Hello,";
  const bankTransferRows = buildBankTransferRows(bankTransferDetails, formattedTotal);
  const bankTransferText = renderBankTransferText(bankTransferRows);
  const bankTransferHtml = renderBankTransferHtml(bankTransferRows);
  const safeBusinessName = escapeHtml(businessName);
  const safeGreetingLine = escapeHtml(greetingLine);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeDueDateLabel = escapeHtml(dueDateLabel);
  const safeInvoiceLink = escapeHtml(invoiceLink);
  const { privacyUrl } = getLegalEmailLinks();
  const safePrivacyUrl = escapeHtml(privacyUrl);

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
${invoiceLink}
${bankTransferText}

Privacy notice:
${privacyUrl}`,
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
          ${bankTransferHtml}
          <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span>${safeInvoiceLink}</span>
          </p>
          <p style="margin: 14px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            Privacy notice: <a href="${safePrivacyUrl}" style="color: #475569;">${safePrivacyUrl}</a>
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
  const { privacyUrl, termsUrl } = getLegalEmailLinks();
  const safePrivacyUrl = escapeHtml(privacyUrl);
  const safeTermsUrl = escapeHtml(termsUrl);

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `Welcome to ${appName}`,
    text: `Welcome to ${appName}.

Your account has been created successfully.

Open your workspace:
${appLink}

Privacy Policy:
${privacyUrl}

Terms of Service:
${termsUrl}
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
          <p style="margin: 14px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            Privacy Policy: <a href="${safePrivacyUrl}" style="color: #475569;">${safePrivacyUrl}</a><br />
            Terms of Service: <a href="${safeTermsUrl}" style="color: #475569;">${safeTermsUrl}</a>
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

export async function sendMonthlyReportEmail({
  to,
  businessName,
  monthLabel,
  currency,
  metrics,
  analyticsLink,
}: SendMonthlyReportEmailInput) {
  const from = buildSenderIdentity(businessName);
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const formatMoney = (value: number) => `${currency} ${value.toFixed(2)}`;
  const safeBusinessName = escapeHtml(businessName);
  const safeMonthLabel = escapeHtml(monthLabel);
  const safeAnalyticsLink = escapeHtml(analyticsLink);
  const { privacyUrl } = getLegalEmailLinks();
  const safePrivacyUrl = escapeHtml(privacyUrl);

  const text = `${monthLabel} monthly report

Revenue collected: ${formatMoney(metrics.revenue)}
Expenses booked: ${formatMoney(metrics.expenses)}
Net result: ${formatMoney(metrics.profit)}
Issued invoices: ${metrics.issuedCount} for ${formatMoney(metrics.issuedAmount)}
Open pipeline: ${formatMoney(metrics.openAmount)}
Overdue exposure: ${formatMoney(metrics.overdueAmount)}
Average days to pay: ${metrics.averageDaysToPay === null ? "Not enough data" : metrics.averageDaysToPay.toFixed(1)}

Open analytics:
${analyticsLink}

Privacy notice:
${privacyUrl}`;

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${businessName} - ${monthLabel} monthly report`,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">${safeBusinessName}</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 24px;">${safeMonthLabel} monthly report</h2>
          <p style="margin: 0 0 22px; color: #475569; line-height: 1.6;">
            Here is the closed-month summary for revenue, expenses, collections, and invoice activity.
          </p>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0 0 24px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 16px;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px;">Revenue collected</p>
              <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${escapeHtml(formatMoney(metrics.revenue))}</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 16px;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px;">Expenses booked</p>
              <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${escapeHtml(formatMoney(metrics.expenses))}</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 16px;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px;">Net result</p>
              <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${escapeHtml(formatMoney(metrics.profit))}</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 16px;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px;">Invoices issued</p>
              <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${metrics.issuedCount}</p>
            </div>
          </div>
          <div style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <p style="margin: 0 0 8px; color: #475569;">Issued value: <strong style="color:#0f172a;">${escapeHtml(formatMoney(metrics.issuedAmount))}</strong></p>
            <p style="margin: 0 0 8px; color: #475569;">Open pipeline: <strong style="color:#0f172a;">${escapeHtml(formatMoney(metrics.openAmount))}</strong></p>
            <p style="margin: 0 0 8px; color: #475569;">Overdue exposure: <strong style="color:#0f172a;">${escapeHtml(formatMoney(metrics.overdueAmount))}</strong></p>
            <p style="margin: 0; color: #475569;">Average days to pay: <strong style="color:#0f172a;">${metrics.averageDaysToPay === null ? "Not enough data" : metrics.averageDaysToPay.toFixed(1)}</strong></p>
          </div>
          <div style="margin: 0 0 18px;">
            <a href="${safeAnalyticsLink}" style="display: inline-block; padding: 13px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
              Open Analytics
            </a>
          </div>
          <p style="margin: 14px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
            Privacy notice: <a href="${safePrivacyUrl}" style="color: #475569;">${safePrivacyUrl}</a>
          </p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Monthly report failed", {
      to,
      businessName,
      monthLabel,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send monthly report email");
  }

  return result;
}

export async function sendSupportEscalationEmail({
  to,
  userEmail,
  businessName,
  question,
  transcript,
  pagePath,
}: SendSupportEscalationEmailInput) {
  const from = buildSenderIdentity(APP_NAME);
  const replyTo = userEmail || process.env.RESEND_REPLY_TO_EMAIL || DEFAULT_RESEND_REPLY_TO_EMAIL;
  const safeBusinessName = escapeHtml(businessName);
  const safeUserEmail = escapeHtml(userEmail);
  const safeQuestion = escapeHtml(question);
  const safeTranscript = escapeHtml(transcript);
  const safePagePath = pagePath ? escapeHtml(pagePath) : null;

  const result = await getResendClient().emails.send({
    from,
    replyTo,
    to,
    subject: `${APP_NAME} support request - ${businessName}`,
    text: `New support request from ${userEmail}

Business: ${businessName}
Page: ${pagePath || "Not provided"}

Question:
${question}

Conversation:
${transcript}
`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f3f5f7; padding: 28px;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 16px; padding: 28px;">
          <p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">${APP_NAME} support request</p>
          <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 22px;">${safeBusinessName}</h2>
          <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">
            User: <strong style="color:#0f172a;">${safeUserEmail}</strong><br />
            ${safePagePath ? `Page: <strong style="color:#0f172a;">${safePagePath}</strong>` : "Page: Not provided"}
          </p>
          <div style="margin: 0 0 18px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 16px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Question</p>
            <p style="margin: 0; color: #0f172a; line-height: 1.6;">${safeQuestion}</p>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; padding: 16px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Conversation</p>
            <pre style="margin: 0; white-space: pre-wrap; color: #0f172a; font-family: Arial, sans-serif; line-height: 1.55;">${safeTranscript}</pre>
          </div>
        </div>
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] Support escalation failed", {
      to,
      userEmail,
      businessName,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send support request email");
  }

  return result;
}
