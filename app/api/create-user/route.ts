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

    const existingUserById = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        acceptedPrivacyAt: true,
        acceptedTermsAt: true,
        acceptedLegalVersion: true,
      },
    });

    const existingUserByEmail = existingUserById
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            acceptedPrivacyAt: true,
            acceptedTermsAt: true,
            acceptedLegalVersion: true,
          },
        });

    const existingUser = existingUserById ?? existingUserByEmail;

    if (!existingUser && !hasCurrentLegalAcceptance(legalAcceptance)) {
      return apiError(
        "Terms of Service and Privacy Policy acceptance is required before account setup can continue.",
        422
      );
    }

    const user = existingUserById
      ? await prisma.user.update({
          where: { id: authUser.id },
          data: {
            email,
            name: email,
            acceptedPrivacyAt: existingUserById.acceptedPrivacyAt ?? legalAcceptance.acceptedPrivacyAt,
            acceptedTermsAt: existingUserById.acceptedTermsAt ?? legalAcceptance.acceptedTermsAt,
            acceptedLegalVersion: existingUserById.acceptedLegalVersion ?? legalAcceptance.acceptedLegalVersion,
          },
        })
      : existingUserByEmail
        ? await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              id: authUser.id,
              email,
              name: email,
              acceptedPrivacyAt: existingUserByEmail.acceptedPrivacyAt ?? legalAcceptance.acceptedPrivacyAt,
              acceptedTermsAt: existingUserByEmail.acceptedTermsAt ?? legalAcceptance.acceptedTermsAt,
              acceptedLegalVersion:
                existingUserByEmail.acceptedLegalVersion ?? legalAcceptance.acceptedLegalVersion,
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
