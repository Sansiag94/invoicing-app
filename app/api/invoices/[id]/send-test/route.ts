import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  isEmailConfigurationError,
  isEmailDeliveryError,
} from "@/lib/email";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";
import {
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";
import { deliverInvoiceEmail, isInvoiceDeliveryError } from "@/lib/invoiceDelivery";

export const runtime = "nodejs";

export async function GET() {
  return apiError("Method not allowed", 405);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);

    if (!user.email) {
      return apiError("Your account email is required to send a test email.", 400);
    }

    await assertRateLimit({
      request,
      route: "invoice-send-test",
      limit: 6,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, user.id, id, "send-test"),
    });

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    const result = await deliverInvoiceEmail({
      invoiceId: id,
      businessId: business.id,
      requestUrl: request.url,
      actor: user.email,
      overrideRecipientEmail: user.email,
      overrideRecipientName: user.email,
      markAsSent: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isInvoiceDeliveryError(error)) {
      return apiError(error.message, error.status);
    }

    if (isEmailConfigurationError(error)) {
      console.error("Error sending test invoice: email configuration missing", error);
      return apiError("Email provider not configured. Set RESEND_API_KEY.", 500);
    }

    if (isEmailDeliveryError(error)) {
      console.error("Error sending test invoice: email delivery failed", error);
      return apiError(error.message, 502);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Error sending test invoice: attachment storage not configured", error);
      return apiError(
        "Invoice attachments are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
        500
      );
    }

    console.error("Error sending test invoice:", error);
    return apiError("Server error", 500);
  }
}
