"use client";

import { useEffect } from "react";
import {
  clearPersistedSession,
  ensureSupabaseSessionRestored,
  isSupabaseSessionRestoring,
  supabase,
  syncSessionPersistence,
} from "@/utils/supabase";

export default function AuthBootstrap() {
  useEffect(() => {
    void ensureSupabaseSessionRestored();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        syncSessionPersistence(session);
        return;
      }

      if (isSupabaseSessionRestoring()) {
        return;
      }

      clearPersistedSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
