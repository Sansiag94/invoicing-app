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

type ExistingUserForSetup = {
  id: string;
  email: string;
  acceptedPrivacyAt: Date | null;
  acceptedTermsAt: Date | null;
  acceptedLegalVersion: string | null;
};

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    await assertRateLimit({
      request,
      route: "create-user",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, authUser.id, authUser.email ?? null),
    });
    const email = authUser.email?.trim() ?? null;

    if (!email) {
      return apiError("Authenticated email is required", 400);
    }

    const legalAcceptance = getLegalAcceptanceFromMetadata(authUser.user_metadata);

    const existingUserById: ExistingUserForSetup | null = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        acceptedPrivacyAt: true,
        acceptedTermsAt: true,
        acceptedLegalVersion: true,
      },
    });

    const existingUserByEmail: ExistingUserForSetup | null =
      existingUserById?.email === email
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

    const existingPrivacyAcceptance =
      existingUserById?.acceptedPrivacyAt ?? existingUserByEmail?.acceptedPrivacyAt ?? null;
    const existingTermsAcceptance =
      existingUserById?.acceptedTermsAt ?? existingUserByEmail?.acceptedTermsAt ?? null;
    const existingLegalVersion =
      existingUserById?.acceptedLegalVersion ?? existingUserByEmail?.acceptedLegalVersion ?? null;
    const setupData = {
      email,
      name: email,
      acceptedPrivacyAt: existingPrivacyAcceptance ?? legalAcceptance.acceptedPrivacyAt,
      acceptedTermsAt: existingTermsAcceptance ?? legalAcceptance.acceptedTermsAt,
      acceptedLegalVersion: existingLegalVersion ?? legalAcceptance.acceptedLegalVersion,
    };

    const user = existingUserById && existingUserByEmail && existingUserById.id !== existingUserByEmail.id
      ? await prisma.$transaction(async (tx) => {
          await tx.business.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: existingUserById.id },
          });
          await tx.user.delete({
            where: { id: existingUserByEmail.id },
          });
          return tx.user.update({
            where: { id: existingUserById.id },
            data: setupData,
          });
        })
      : existingUserById
      ? await prisma.user.update({
          where: { id: authUser.id },
          data: setupData,
        })
      : existingUserByEmail
        ? await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              id: authUser.id,
              ...setupData,
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
