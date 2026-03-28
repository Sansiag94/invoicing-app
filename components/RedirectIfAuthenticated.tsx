"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
        router.replace(href);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled && session?.access_token) {
          router.replace(href);
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
