import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const AUTH_PERSISTENCE_KEY = "sierra-invoices-auth-persistence";
const AUTH_PERSISTENCE_LOCAL = "local";
const AUTH_PERSISTENCE_SESSION = "session";

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

function getBrowserStorage(mode: "local" | "session"): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return mode === "session" ? window.sessionStorage : window.localStorage;
}

function getAuthPersistenceMode(): "local" | "session" {
  if (typeof window === "undefined") {
    return AUTH_PERSISTENCE_LOCAL;
  }

  const stored = window.localStorage.getItem(AUTH_PERSISTENCE_KEY);
  return stored === AUTH_PERSISTENCE_SESSION ? AUTH_PERSISTENCE_SESSION : AUTH_PERSISTENCE_LOCAL;
}

const authStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      window.localStorage.getItem(key) ??
      window.sessionStorage.getItem(key) ??
      null
    );
  },
  setItem(key: string, value: string) {
    const activeStorage = getBrowserStorage(getAuthPersistenceMode());
    const fallbackStorage = getBrowserStorage(
      getAuthPersistenceMode() === AUTH_PERSISTENCE_LOCAL
        ? AUTH_PERSISTENCE_SESSION
        : AUTH_PERSISTENCE_LOCAL
    );

    activeStorage?.setItem(key, value);
    fallbackStorage?.removeItem(key);
  },
  removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUTH_PERSISTENCE_KEY,
    remember ? AUTH_PERSISTENCE_LOCAL : AUTH_PERSISTENCE_SESSION
  );
}

export function getRememberSessionPreference(): boolean {
  return getAuthPersistenceMode() === AUTH_PERSISTENCE_LOCAL;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
