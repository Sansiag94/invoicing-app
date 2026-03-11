import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Set NEXT_PUBLIC_SUPABASE_URL for client-side Supabase."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side Supabase."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
