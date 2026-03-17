import prisma from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export class AccountDeletionError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AccountDeletionError";
    this.status = status;
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new AccountDeletionError(
      "Could not delete the authentication account. Please try again.",
      502
    );
  }

  await prisma.user.deleteMany({
    where: { id: userId },
  });
}

export function isAccountDeletionError(error: unknown): error is AccountDeletionError {
  return error instanceof AccountDeletionError;
}
