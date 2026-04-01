type RequiredEnvKey =
  | "DATABASE_URL"
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "STRIPE_SECRET_KEY"
  | "RESEND_API_KEY";

const ENV_ALIASES: Record<RequiredEnvKey, string[]> = {
  DATABASE_URL: ["DATABASE_URL"],
  SUPABASE_URL: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  SUPABASE_ANON_KEY: ["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  STRIPE_SECRET_KEY: ["STRIPE_SECRET_KEY"],
  RESEND_API_KEY: ["RESEND_API_KEY"],
};

let validated = false;

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readEnvList(key: string): string[] {
  const value = process.env[key];
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function readRequiredEnv(key: RequiredEnvKey): string | undefined {
  for (const candidate of ENV_ALIASES[key]) {
    const value = readEnv(candidate);
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function getSupabaseUrl(): string {
  const value = readRequiredEnv("SUPABASE_URL");
  if (!value) {
    throw new Error(
      "Missing SUPABASE_URL. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL for legacy compatibility)."
    );
  }
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = readRequiredEnv("SUPABASE_ANON_KEY");
  if (!value) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY. Set SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY for legacy compatibility)."
    );
  }
  return value;
}

export function getStripeSecretKey(): string {
  const value = readRequiredEnv("STRIPE_SECRET_KEY");
  if (!value) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return value;
}

export function getStripeProMonthlyPriceId(): string | null {
  return readEnv("STRIPE_PRO_MONTHLY_PRICE_ID") ?? null;
}

export function getComplimentaryProEmails(): string[] {
  return readEnvList("COMPLIMENTARY_PRO_EMAILS");
}

export function getResendApiKey(): string {
  const value = readRequiredEnv("RESEND_API_KEY");
  if (!value) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return value;
}

export function getCronSecret(): string | null {
  return readEnv("CRON_SECRET") ?? null;
}

export function getSupabaseServiceRoleKey(): string | null {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

export function validateRequiredEnv() {
  if (validated) {
    return;
  }

  const missing = (Object.keys(ENV_ALIASES) as RequiredEnvKey[]).filter(
    (key) => !readRequiredEnv(key)
  );

  if (missing.length > 0) {
    const details = missing
      .map((key) => `${key} (aliases: ${ENV_ALIASES[key].join(", ")})`)
      .join("; ");
    throw new Error(`Missing required environment variables: ${details}`);
  }

  validated = true;
}
