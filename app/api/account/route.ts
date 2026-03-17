import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/accountDeletion";
import {
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

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
