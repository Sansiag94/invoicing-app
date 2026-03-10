import { Resend } from "resend";

type SendInvoiceEmailInput = {
  to: string;
  invoiceNumber: string;
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

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  invoiceLink,
}: SendInvoiceEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const result = await getResendClient().emails.send({
    from,
    to,
    subject: `Invoice ${invoiceNumber}`,
    text: `Hello,

Please view your invoice here:

${invoiceLink}`,
  });

  if (result.error) {
    console.error("[email] Resend failed", {
      to,
      invoiceNumber,
      invoiceLink,
      error: result.error,
    });
    throw new EmailDeliveryError("Failed to send invoice email");
  }

  console.log("[email] Resend email sent", {
    to,
    invoiceNumber,
    invoiceLink,
    emailId: result.data?.id,
  });

  return result;
}
