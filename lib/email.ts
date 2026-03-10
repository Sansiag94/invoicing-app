import { Resend } from "resend";

type SendInvoiceEmailInput = {
  to: string;
  businessName: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  invoiceLink: string;
};

let resendClient: Resend | null = null;

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
  const token = publicToken.trim();
  if (!token) {
    throw new EmailConfigurationError("Missing invoice public token");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    return new URL(`/invoice/pay/${token}`, appUrl).toString();
  }

  if (requestUrl) {
    const origin = new URL(requestUrl).origin;
    return new URL(`/invoice/pay/${token}`, origin).toString();
  }

  throw new EmailConfigurationError("Missing NEXT_PUBLIC_APP_URL for public invoice links");
}

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailConfigurationError("Missing RESEND_API_KEY");
  }

  resendClient = new Resend(apiKey);
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

export async function sendInvoiceEmail({
  to,
  businessName,
  invoiceNumber,
  totalAmount,
  currency,
  invoiceLink,
}: SendInvoiceEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const formattedTotal = `${currency} ${totalAmount.toFixed(2)}`;
  const safeBusinessName = escapeHtml(businessName);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeFormattedTotal = escapeHtml(formattedTotal);
  const safeInvoiceLink = escapeHtml(invoiceLink);

  const result = await getResendClient().emails.send({
    from,
    to,
    subject: `${businessName} - Invoice ${invoiceNumber}`,
    text: `Hello,

${businessName} sent you invoice ${invoiceNumber}.
Total amount: ${formattedTotal}

Please view your invoice here:

${invoiceLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px;">
          <h2 style="margin: 0 0 12px; color: #111111;">${safeBusinessName}</h2>
          <p style="margin: 0 0 8px; color: #333333;">Invoice <strong>${safeInvoiceNumber}</strong></p>
          <p style="margin: 0 0 20px; color: #333333;">Total amount: <strong>${safeFormattedTotal}</strong></p>
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
