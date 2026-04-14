import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";
import { sendWelcomeEmail } from "@/lib/email";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";
import {
  getLegalAcceptanceFromMetadata,
  hasCurrentLegalAcceptance,
  hasStoredLegalAcceptance,
} from "@/lib/legalAcceptance";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    await assertRateLimit({
      request,
      route: "create-user",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, authUser.id, authUser.email ?? null),
    });
    const email = authUser.email?.trim() ?? null;

    if (!email) {
      return apiError("Authenticated email is required", 400);
    }

    const legalAcceptance = getLegalAcceptanceFromMetadata(authUser.user_metadata);

    const existingUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        acceptedPrivacyAt: true,
        acceptedTermsAt: true,
        acceptedLegalVersion: true,
      },
    });

    if (
      !hasCurrentLegalAcceptance(legalAcceptance) &&
      (!existingUser || !hasStoredLegalAcceptance(existingUser))
    ) {
      return apiError(
        "Terms of Service and Privacy Policy acceptance is required before account setup can continue.",
        422
      );
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { id: authUser.id },
          data: {
            email,
            name: email,
            acceptedPrivacyAt:
              existingUser.acceptedPrivacyAt ?? legalAcceptance.acceptedPrivacyAt,
            acceptedTermsAt: existingUser.acceptedTermsAt ?? legalAcceptance.acceptedTermsAt,
            acceptedLegalVersion:
              existingUser.acceptedLegalVersion ?? legalAcceptance.acceptedLegalVersion,
          },
        })
      : await prisma.user.create({
          data: {
            id: authUser.id,
            email,
            name: email,
            acceptedPrivacyAt: legalAcceptance.acceptedPrivacyAt,
            acceptedTermsAt: legalAcceptance.acceptedTermsAt,
            acceptedLegalVersion: legalAcceptance.acceptedLegalVersion,
          },
        });

    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);

    if (!existingUser) {
      try {
        await sendWelcomeEmail({
          to: email,
          dashboardLink: `${getPublicInvoiceBaseUrl()}/dashboard`,
        });
      } catch (error) {
        console.error("Error sending welcome email:", error);
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error creating user:", error);
    return apiError("Server Error", 500);
  }
}
