"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      const accessToken = data.session?.access_token;

      if (accessToken) {
        const syncResponse = await fetch("/api/create-user", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!syncResponse.ok) {
          const result = (await syncResponse.json()) as { error?: string };
          alert(result?.error ?? "Signup succeeded, but account initialization failed.");
          return;
        }
      }

      alert("Signup successful!");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Sign Up</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleSignup}>
        Create Account
      </button>
    </div>
  );
}
