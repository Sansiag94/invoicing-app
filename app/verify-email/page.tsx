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
import { ensureSupabaseSessionRestored, supabase, syncSessionPersistence } from "@/utils/supabase";

type VerificationStatus = "checking" | "waiting" | "verified" | "error";

function getHashParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

function getOtpType(value: string | null): "signup" | "magiclink" | "recovery" | "invite" | "email_change" | "email" {
  if (
    value === "magiclink" ||
    value === "recovery" ||
    value === "invite" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value;
  }

  return "signup";
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const { toast } = useToast();
  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [status, setStatus] = useState<VerificationStatus>("checking");
  const [statusMessage, setStatusMessage] = useState("Checking your verification link...");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentSearchParams = new URLSearchParams(queryString);
        const errorDescription = currentSearchParams.get("error_description") ?? currentSearchParams.get("error");
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const code = currentSearchParams.get("code");
        const tokenHash = currentSearchParams.get("token_hash");
        const hashParams = getHashParams();
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        if (code) {
          setStatusMessage("Confirming your email...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
          syncSessionPersistence(data.session);
        } else if (tokenHash) {
          setStatusMessage("Confirming your email...");
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: getOtpType(currentSearchParams.get("type")),
          });
          if (error) {
            throw error;
          }
          syncSessionPersistence(data.session);
        } else if (hashAccessToken && hashRefreshToken) {
          setStatusMessage("Restoring your verified session...");
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (error) {
            throw error;
          }
          syncSessionPersistence(data.session);
        } else {
          await ensureSupabaseSessionRestored();
        }

        if (cancelled) {
          return;
        }

        const { data } = await supabase.auth.getUser();
        const userEmail = data.user?.email?.trim() ?? "";
        if (userEmail) {
          setEmail((current) => current || userEmail);
        }

        if (data.user?.email_confirmed_at) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) {
            setStatus("verified");
            setStatusMessage("Email verified. Please log in to open your workspace.");
            setIsChecking(false);
            return;
          }

          setStatusMessage("Preparing your workspace...");
          const response = await fetch("/api/create-user", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!response.ok) {
            let message = "Email verified, but the workspace could not be prepared.";
            try {
              const result = (await response.json()) as { error?: string };
              message = result.error ?? message;
            } catch {
              // Keep the fallback message.
            }
            throw new Error(message);
          }

          if (!cancelled) {
            setStatus("verified");
            setStatusMessage("Email verified. Opening your workspace...");
            router.replace("/dashboard");
          }
          return;
        }

        setStatus("waiting");
        setStatusMessage("Open the verification email, then return here.");
        setIsChecking(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "The verification link could not be used.";
        setStatus("error");
        setStatusMessage(message);
        setIsChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, queryString]);

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
        durationMs: null,
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
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {status === "checking"
                ? "Verification in progress"
                : status === "verified"
                  ? "Email confirmed"
                  : status === "error"
                    ? "Verification needs attention"
                    : "What to do next"}
            </p>
            <p className="mt-2 leading-6">{statusMessage}</p>
            {status === "waiting" ? (
              <ol className="mt-2 space-y-1.5 leading-6">
                <li>1. Open the confirmation email we sent to this address.</li>
                <li>2. Click the verification link.</li>
                <li>3. The app will open your workspace after confirmation.</li>
              </ol>
            ) : null}
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
