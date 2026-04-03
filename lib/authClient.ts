export function isEmailConfirmationRequiredMessage(message: string | null | undefined): boolean {
  const normalized = (message ?? "").trim().toLowerCase();
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not verified") ||
    normalized.includes("verify your email")
  );
}

export function buildVerifyEmailPath(email?: string | null): string {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail) {
    return "/verify-email";
  }

  return `/verify-email?email=${encodeURIComponent(normalizedEmail)}`;
}
