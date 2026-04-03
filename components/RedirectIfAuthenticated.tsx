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
    let unsubscribe = () => {};

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

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled && session?.access_token) {
          void supabase.auth.getUser().then(({ data: userData }) => {
            if (cancelled) {
              return;
            }

            if (userData.user && !userData.user.email_confirmed_at) {
              router.replace(buildVerifyEmailPath(userData.user.email));
              return;
            }

            router.replace(href);
          });
        }
      });

      unsubscribe = () => {
        subscription.unsubscribe();
      };
    }

    void redirectIfSessionExists();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [href, router]);

  return null;
}
