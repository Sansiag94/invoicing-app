"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthSplitShell from "@/components/AuthSplitShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { buildVerifyEmailPath } from "@/lib/authClient";
import { ensureSupabaseSessionRestored, supabase } from "@/utils/supabase";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureSupabaseSessionRestored();
      const { data } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      const userEmail = data.user?.email?.trim() ?? "";
      if (userEmail) {
        setEmail((current) => current || userEmail);
      }

      if (data.user?.email_confirmed_at) {
        router.replace("/dashboard");
        return;
      }

      setIsChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleResend() {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Enter the account email so we can resend the verification message.",
        variant: "error",
      });
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verification email sent",
        description: "Check your inbox and spam folder for the confirmation link.",
        variant: "success",
      });
      router.replace(buildVerifyEmailPath(email));
    } catch (error) {
      toast({
        title: "Unable to resend email",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthSplitShell
      eyebrow="Verify email"
      title="Confirm your email before entering the workspace"
      description="We need the account email to be confirmed before the invoicing workspace can be opened."
      alternateText="Already confirmed?"
      alternateLabel="Log in"
      alternateHref="/login"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verifyEmail">Account email</Label>
            <Input
              id="verifyEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-slate-100">What to do next</p>
            <ol className="mt-2 space-y-1.5 leading-6">
              <li>1. Open the confirmation email we sent to this address.</li>
              <li>2. Click the verification link.</li>
              <li>3. Return here and log in to open your workspace.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleResend()}
              disabled={isResending || isChecking}
              className="w-full sm:w-auto"
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </Button>
            <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Go to log in</Link>
            </Button>
          </div>
        </div>
      </div>
    </AuthSplitShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
