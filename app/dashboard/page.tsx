"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    };

    getUser();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

      {email ? (
        <p>Logged in as: {email}</p>
      ) : (
        <p>No user logged in</p>
      )}
    </div>
  );
}