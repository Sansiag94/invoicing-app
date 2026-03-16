import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    await prisma.$transaction(async (tx) => {
      const businesses = await tx.business.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      for (const business of businesses) {
        await tx.business.delete({
          where: { id: business.id },
        });
      }

      await tx.user.deleteMany({
        where: { id: user.id },
      });
    });

    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Error deleting Supabase auth user:", error);
      return apiError("Account data deleted, but auth cleanup failed", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      return apiError(error.message, 500);
    }

    console.error("Error deleting account:", error);
    return apiError("Could not delete account", 500);
  }
}
