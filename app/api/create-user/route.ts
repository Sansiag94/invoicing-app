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
import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

function parseAcceptedAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLegalAcceptance(authUser: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  const metadata =
    authUser.user_metadata && typeof authUser.user_metadata === "object"
      ? authUser.user_metadata
      : {};

  const acceptedTermsAt = parseAcceptedAt(
    (metadata as Record<string, unknown>).accepted_terms_at
  );
  const acceptedPrivacyAt = parseAcceptedAt(
    (metadata as Record<string, unknown>).accepted_privacy_at
  );
  const acceptedLegalVersionRaw = (metadata as Record<string, unknown>).accepted_legal_version;
  const acceptedLegalVersion =
    typeof acceptedLegalVersionRaw === "string" && acceptedLegalVersionRaw.trim()
      ? acceptedLegalVersionRaw.trim()
      : null;

  const hasRecordedAcceptance = Boolean(acceptedTermsAt && acceptedPrivacyAt);

  return {
    acceptedTermsAt,
    acceptedPrivacyAt,
    acceptedLegalVersion:
      acceptedLegalVersion ?? (hasRecordedAcceptance ? LEGAL_LAST_UPDATED_ISO : null),
  };
}

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

    const legalAcceptance = getLegalAcceptance(authUser);

    const existingUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        acceptedPrivacyAt: true,
        acceptedTermsAt: true,
        acceptedLegalVersion: true,
      },
    });

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
