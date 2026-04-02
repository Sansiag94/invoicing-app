import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

export const AUTH_REQUIRED_EVENT = "sierra-invoices-auth-required";
const AUTH_TOKEN_REFRESH_BUFFER_MS = 30_000;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt: number | null = null;
let pendingTokenRequest: Promise<string | null> | null = null;

function notifyAuthenticationRequired() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
}

function clearTokenCache() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = null;
}

function cacheSessionToken(session: Session | null | undefined) {
  if (!session?.access_token) {
    clearTokenCache();
    return;
  }

  cachedAccessToken = session.access_token;
  cachedAccessTokenExpiresAt = typeof session.expires_at === "number"
    ? session.expires_at * 1000
    : null;
}

function hasUsableCachedToken() {
  if (!cachedAccessToken) {
    return false;
  }

  if (cachedAccessTokenExpiresAt === null) {
    return true;
  }

  return Date.now() + AUTH_TOKEN_REFRESH_BUFFER_MS < cachedAccessTokenExpiresAt;
}

async function loadAccessToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && hasUsableCachedToken()) {
    return cachedAccessToken;
  }

  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      clearTokenCache();
      return null;
    }

    cacheSessionToken(data.session);
    return data.session.access_token;
  })();

  try {
    return await pendingTokenRequest;
  } finally {
    pendingTokenRequest = null;
  }
}

async function performAuthenticatedRequest(
  input: RequestInfo | URL,
  init: RequestInit,
  token: string
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export function resetAuthenticatedFetchCache() {
  clearTokenCache();
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = await loadAccessToken();
  if (!token) {
    notifyAuthenticationRequired();
    throw new Error("Authentication required");
  }

  let response = await performAuthenticatedRequest(input, init, token);

  if (response.status === 401) {
    clearTokenCache();
    const refreshedToken = await loadAccessToken(true);

    if (refreshedToken && refreshedToken !== token) {
      response = await performAuthenticatedRequest(input, init, refreshedToken);
    }
  }

  if (response.status === 401) {
    notifyAuthenticationRequired();
  }

  return response;
}
