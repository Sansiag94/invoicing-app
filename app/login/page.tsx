"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import AuthSplitShell from "@/components/AuthSplitShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        alert("Login succeeded, but no session token is available.");
        return;
      }

      const syncResponse = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!syncResponse.ok) {
        const result = (await syncResponse.json()) as { error?: string };
        alert(result?.error ?? "Failed to initialize account");
        return;
      }

      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitShell
      eyebrow="Log in"
      title="Welcome back"
      description="Access your billing workspace, review revenue, and keep every invoice under control."
      alternateText="Need a new account instead?"
      alternateLabel="Create account"
      alternateHref="/signup"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
          </div>
        </div>
      </div>
    </AuthSplitShell>
  );
}
