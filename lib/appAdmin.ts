import { getAppAdminEmails } from "@/lib/env";

export function normalizeAdminEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isAppAdminEmail(email: string | null | undefined): boolean {
  const normalizedEmail = normalizeAdminEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  return getAppAdminEmails().includes(normalizedEmail);
}
