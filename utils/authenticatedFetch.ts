import { supabase } from "@/utils/supabase";

export const AUTH_REQUIRED_EVENT = "sierra-invoices-auth-required";

function notifyAuthenticationRequired() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    notifyAuthenticationRequired();
    throw new Error("Authentication required");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    notifyAuthenticationRequired();
  }

  return response;
}
