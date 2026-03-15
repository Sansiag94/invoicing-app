"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRememberSessionPreference, setRememberSession, supabase } from "@/utils/supabase";
import AuthSplitShell from "@/components/AuthSplitShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => getRememberSessionPreference());
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      setRememberSession(rememberMe);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Unable to log in",
          description: error.message,
          variant: "error",
        });
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        toast({
          title: "Login incomplete",
          description: "Login succeeded, but no session token is available.",
          variant: "error",
        });
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
        toast({
          title: "Account setup failed",
          description: result?.error ?? "Failed to initialize account",
          variant: "error",
        });
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
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleLogin();
        }}
      >
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>
                <span className="block font-medium text-slate-900">Keep me logged in</span>
                <span className="block text-xs text-slate-500">
                  Stay signed in on this device after you close the browser.
                </span>
              </span>
            </label>
            <Button className="w-full" type="submit" disabled={isLoading || !email.trim() || !password.trim()}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </div>
        </div>
      </form>
    </AuthSplitShell>
  );
}
