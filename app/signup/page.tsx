"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRememberSession, supabase } from "@/utils/supabase";
import AuthSplitShell from "@/components/AuthSplitShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async () => {
    if (password !== repeatPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please repeat the same password to continue.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      setRememberSession(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Unable to create account",
          description: error.message,
          variant: "error",
        });
        return;
      }

      let accessToken = data.session?.access_token ?? null;

      if (!accessToken) {
        const signInResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInResult.error) {
          accessToken = signInResult.data.session?.access_token ?? null;
        }
      }

      if (accessToken) {
        const syncResponse = await fetch("/api/create-user", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!syncResponse.ok) {
          const result = (await syncResponse.json()) as { error?: string };
          toast({
            title: "Account setup incomplete",
            description: result?.error ?? "Signup succeeded, but account initialization failed.",
            variant: "error",
          });
          return;
        }

        toast({
          title: "Account created",
          description: "Welcome to Sierra Invoices.",
          variant: "success",
        });
        router.push("/dashboard");
        return;
      }

      toast({
        title: "Account created",
        description: "Account created. Check your inbox if email confirmation is required before logging in.",
        variant: "success",
      });
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
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSignup();
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
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeatPassword">Repeat Password</Label>
              <Input
                id="repeatPassword"
                type="password"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              className="w-full"
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim() || !repeatPassword.trim()}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </div>
      </form>
    </AuthSplitShell>
  );
}
