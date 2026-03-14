"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import AuthSplitShell from "@/components/AuthSplitShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

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

      alert("Signup successful! You can now log in.");
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitShell
      eyebrow="Create account"
      title="Start with Sierra Invoices"
      description="Set up your billing workspace and start sending client-ready invoices within minutes."
      alternateText="Already have an account?"
      alternateLabel="Log in"
      alternateHref="/login"
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
              autoComplete="new-password"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSignup}
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
          </div>
        </div>
      </div>
    </AuthSplitShell>
  );
}
