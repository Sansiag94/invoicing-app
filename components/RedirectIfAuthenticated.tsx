"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildVerifyEmailPath } from "@/lib/authClient";
import { ensureSupabaseSessionRestored, supabase } from "@/utils/supabase";

type RedirectIfAuthenticatedProps = {
  href?: string;
};

export default function RedirectIfAuthenticated({
  href = "/dashboard",
}: RedirectIfAuthenticatedProps) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function redirectIfSessionExists() {
      await ensureSupabaseSessionRestored();
      if (cancelled) {
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!cancelled && data.session?.access_token) {
        const { data: userData } = await supabase.auth.getUser();
        if (cancelled) {
          return;
        }

        if (userData.user && !userData.user.email_confirmed_at) {
          router.replace(buildVerifyEmailPath(userData.user.email));
          return;
        }

        router.replace(href);
      }
    }

    void redirectIfSessionExists();

    return () => {
      cancelled = true;
    };
  }, [href, router]);

  return null;
}
