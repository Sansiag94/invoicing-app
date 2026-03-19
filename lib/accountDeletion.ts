export class AccountDeletionError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AccountDeletionError";
    this.status = status;
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  void userId;

  throw new AccountDeletionError(
    "Self-service account deletion is unavailable because invoice and accounting records may need to be retained. Export your records and close the workspace through an administrator-supported process instead.",
    409
  );
}

export function isAccountDeletionError(error: unknown): error is AccountDeletionError {
  return error instanceof AccountDeletionError;
}
