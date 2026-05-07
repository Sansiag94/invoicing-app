import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { normalizeAppLanguage, isSupportedAppLanguage } from "@/lib/appLanguage";
import prisma from "@/lib/prisma";
import {
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/accountDeletion";
import {
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

type UpdateAccountBody = {
  appLanguage?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        appLanguage: true,
      },
    });

    if (!account) {
      return apiError("Account not found", 404);
    }

    return NextResponse.json({
      ...account,
      appLanguage: normalizeAppLanguage(account.appLanguage),
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading account:", error);
    return apiError("Could not load account", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as UpdateAccountBody;
    const appLanguage = asString(body.appLanguage);

    if (appLanguage && !isSupportedAppLanguage(appLanguage)) {
      return apiError("Invalid app language", 400);
    }

    const account = await prisma.user.update({
      where: { id: user.id },
      data: {
        appLanguage: normalizeAppLanguage(appLanguage),
      },
      select: {
        id: true,
        email: true,
        name: true,
        appLanguage: true,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating account:", error);
    return apiError("Could not update account", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    await deleteUserAccount(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      return apiError(error.message, 500);
    }

    if (isAccountDeletionError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error deleting account:", error);
    return apiError("Could not delete account", 500);
  }
}
