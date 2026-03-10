import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration for auth verification.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

export class AuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

function isJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function decodeCookieValue(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  if (!decoded.startsWith("base64-")) {
    return decoded;
  }

  const base64Value = decoded.slice("base64-".length);

  try {
    return Buffer.from(base64Value, "base64url").toString("utf8");
  } catch {
    try {
      return Buffer.from(base64Value, "base64").toString("utf8");
    } catch {
      return decoded;
    }
  }
}

function extractTokenFromValue(rawValue: string): string | null {
  const decoded = decodeCookieValue(rawValue).trim();
  if (!decoded) return null;

  if (isJwt(decoded)) {
    return decoded;
  }

  try {
    const parsed = JSON.parse(decoded) as unknown;

    if (Array.isArray(parsed) && typeof parsed[0] === "string" && isJwt(parsed[0])) {
      return parsed[0];
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "access_token" in parsed &&
      typeof (parsed as { access_token: unknown }).access_token === "string" &&
      isJwt((parsed as { access_token: string }).access_token)
    ) {
      return (parsed as { access_token: string }).access_token;
    }
  } catch {
    return null;
  }

  return null;
}

function parseCookies(cookieHeader: string): Map<string, string> {
  const parsed = new Map<string, string>();
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!key) continue;
    parsed.set(key, value);
  }

  return parsed;
}

function withMergedAuthCookieChunks(cookies: Map<string, string>): Map<string, string> {
  const merged = new Map(cookies);
  const chunks = new Map<string, Array<{ index: number; value: string }>>();

  for (const [key, value] of cookies.entries()) {
    const match = key.match(/^(sb-[^.]+-auth-token)\.(\d+)$/);
    if (!match) continue;

    const [, baseKey, indexString] = match;
    const index = Number(indexString);
    if (!Number.isInteger(index)) continue;

    const existing = chunks.get(baseKey) ?? [];
    existing.push({ index, value });
    chunks.set(baseKey, existing);
  }

  for (const [baseKey, partValues] of chunks.entries()) {
    partValues.sort((a, b) => a.index - b.index);
    merged.set(
      baseKey,
      partValues.map((part) => part.value).join("")
    );
  }

  return merged;
}

function getCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = withMergedAuthCookieChunks(parseCookies(cookieHeader));
  const keys = [...cookies.keys()];
  const prioritizedKeys = [
    ...keys.filter((key) => key === "sb-access-token"),
    ...keys.filter((key) => key.endsWith("-access-token")),
    ...keys.filter((key) => key.includes("-auth-token")),
  ];

  for (const key of prioritizedKeys) {
    const value = cookies.get(key);
    if (!value) continue;

    const token = extractTokenFromValue(value);
    if (token) return token;
  }

  for (const value of cookies.values()) {
    const token = extractTokenFromValue(value);
    if (token) return token;
  }

  return null;
}

function getAuthorizationToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export async function getAuthenticatedUser(request: Request): Promise<User> {
  const token = getAuthorizationToken(request) ?? getCookieToken(request.headers.get("cookie"));

  if (!token) {
    throw new AuthenticationError("Authentication required");
  }

  const { data, error } = await getSupabaseClient().auth.getUser(token);

  if (error || !data.user) {
    throw new AuthenticationError("Invalid or expired authentication token");
  }

  return data.user;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
