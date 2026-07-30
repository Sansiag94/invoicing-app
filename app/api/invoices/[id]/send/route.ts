import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  isEmailConfigurationError,
  isEmailDeliveryError,
} from "@/lib/email";
import { isBillingLimitError } from "@/lib/billing";
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
    await assertRateLimit({
      request,
      route: "invoice-send",
      limit: 6,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, user.id, id, "send"),
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
      actor: user.email ?? "User",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isBillingLimitError(error)) {
      return apiError(error.message, error.status, {
        code: "payment_required",
        details: error.details,
      });
    }

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
      console.error("Error sending invoice: email configuration missing", error);
      return apiError("Email provider not configured. Set RESEND_API_KEY.", 500);
    }

    if (isEmailDeliveryError(error)) {
      console.error("Error sending invoice: email delivery failed", error);
      return apiError(error.message, 502);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Error sending invoice: attachment storage not configured", error);
      return apiError(
        "Invoice attachments are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
        500
      );
    }

    console.error("Error sending invoice:", error);
    return apiError("Server error", 500);
  }
}
