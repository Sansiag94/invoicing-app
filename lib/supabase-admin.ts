import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export class SupabaseAdminConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAdminConfigurationError";
  }
}

export function isSupabaseAdminConfigurationError(
  error: unknown
): error is SupabaseAdminConfigurationError {
  return error instanceof SupabaseAdminConfigurationError;
}

export function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new SupabaseAdminConfigurationError(
      "Missing SUPABASE_SERVICE_ROLE_KEY for server-side logo uploads"
    );
  }

  supabaseAdminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}
