import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const AUTH_PERSISTENCE_KEY = "sierra-invoices-auth-persistence";
const AUTH_SESSION_BACKUP_KEY = "sierra-invoices-auth-backup";
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

function getFallbackStorage(mode: "local" | "session"): Storage | null {
  return getBrowserStorage(
    mode === AUTH_PERSISTENCE_LOCAL ? AUTH_PERSISTENCE_SESSION : AUTH_PERSISTENCE_LOCAL
  );
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

type SessionBackup = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

function readSessionBackup(): SessionBackup | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue =
    window.localStorage.getItem(AUTH_SESSION_BACKUP_KEY) ??
    window.sessionStorage.getItem(AUTH_SESSION_BACKUP_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SessionBackup>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
    };
  } catch {
    return null;
  }
}

function clearSessionBackup() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_BACKUP_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_BACKUP_KEY);
}

function clearStorageAuthKeys(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    if (
      key === AUTH_SESSION_BACKUP_KEY ||
      /^sb-[^.]+-auth-token(?:\.\d+)?$/.test(key) ||
      /^sb-[^.]+-auth-token-(?:code-verifier|user)$/.test(key)
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

function clearSupabaseBrowserStorage() {
  if (typeof window === "undefined") {
    return;
  }

  clearStorageAuthKeys(window.localStorage);
  clearStorageAuthKeys(window.sessionStorage);
}

function persistSessionBackup(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.access_token || !session.refresh_token) {
    clearSessionBackup();
    return;
  }

  const mode = getAuthPersistenceMode();
  const activeStorage = getBrowserStorage(mode);
  const fallbackStorage = getFallbackStorage(mode);

  activeStorage?.setItem(
    AUTH_SESSION_BACKUP_KEY,
    JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
    } satisfies SessionBackup)
  );
  fallbackStorage?.removeItem(AUTH_SESSION_BACKUP_KEY);
}

let restoreSessionPromise: Promise<void> | null = null;
let restoringSession = false;
let logoutInProgress = false;

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

export function syncSessionPersistence(session: Session | null) {
  persistSessionBackup(session);
}

export function clearPersistedSession() {
  clearSessionBackup();
}

export function isSupabaseSessionRestoring() {
  return restoringSession;
}

export function isClientLogoutInProgress() {
  return logoutInProgress;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function ensureSupabaseSessionRestored() {
  if (typeof window === "undefined") {
    return;
  }

  if (restoreSessionPromise) {
    await restoreSessionPromise;
    return;
  }

  restoreSessionPromise = (async () => {
    const backup = readSessionBackup();
    restoringSession = true;

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (currentSession?.access_token) {
      persistSessionBackup(currentSession);
      return;
    }

    if (!backup?.accessToken || !backup.refreshToken) {
      return;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: backup.accessToken,
      refresh_token: backup.refreshToken,
    });

    if (error || !data.session?.access_token) {
      clearSessionBackup();
      return;
    }

    persistSessionBackup(data.session);
  })();

  try {
    await restoreSessionPromise;
  } finally {
    restoringSession = false;
    restoreSessionPromise = null;
  }
}

export function startClientLogout() {
  if (typeof window === "undefined") {
    return;
  }

  if (logoutInProgress) {
    return;
  }

  logoutInProgress = true;
  clearSessionBackup();
  clearSupabaseBrowserStorage();

  void supabase.auth.signOut({ scope: "local" }).finally(() => {
    logoutInProgress = false;
  });
}
