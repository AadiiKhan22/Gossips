"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import * as React from "react";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validatePassword } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

// The email link points at /auth/confirm first (a server route), which does
// the one-time-token verification with verifyOtp and establishes a real
// session via cookies, then redirects here with a clean URL (no token_hash/
// type — those were already consumed server-side and can't be reused).
// So by the time this page mounts, the person should already be logged in.
// We just need to confirm a session exists, not verify anything ourselves.
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 dark:bg-[linear-gradient(180deg,#050b18_0%,#0a1430_100%)]">
          <p className="text-muted-foreground text-center text-sm dark:text-[#8a97b4]">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = React.useState<"verifying" | "ready" | "invalid">("verifying");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    // Legacy/fallback path: if a link ever points straight at this page with
    // token_hash + type still on it (e.g. an old email already sent, or a
    // future email template change), verify it here instead of just
    // checking for a session.
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (tokenHash && type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any }).then(({ error: verifyError }) => {
        setStatus(verifyError ? "invalid" : "ready");
      });
      return;
    }

    // Normal path: /auth/confirm already verified the token server-side and
    // set the session cookie. Just check that the session is really there.
    supabase.auth.getUser().then(({ data, error: userError }) => {
      setStatus(!userError && data.user ? "ready" : "invalid");
    });
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 dark:bg-[linear-gradient(180deg,#050b18_0%,#0a1430_100%)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <GossipsLogo size="xl" showText={false} className="mb-3" />
          <h1 className="text-gossip text-2xl font-bold tracking-tight dark:text-[#e8eefc]">
            Set a new password
          </h1>
          <p className="text-muted-foreground mt-1 text-sm dark:text-[#8a97b4]">
            Choose a new password for your account.
          </p>
        </div>

        {status === "verifying" ? (
          <p className="text-muted-foreground text-center text-sm dark:text-[#8a97b4]">
            Verifying your link...
          </p>
        ) : status === "invalid" ? (
          <div className="space-y-4 text-center">
            <Alert variant="destructive">
              <AlertDescription>
                This reset link is invalid or has already been used. Please request a new one.
              </AlertDescription>
            </Alert>
            <a href="/forgot-password" className="text-gossip text-sm font-medium hover:underline">
              Request a new link
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="password" className="dark:text-white">
                New password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                className="h-12 rounded-xl dark:border-[#1f2d4d] dark:bg-[#0f1a33] dark:text-white dark:placeholder:text-[#6b7a99]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="dark:text-white">
                Confirm password
              </Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter the new password"
                className="h-12 rounded-xl dark:border-[#1f2d4d] dark:bg-[#0f1a33] dark:text-white dark:placeholder:text-[#6b7a99]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="h-12 w-full rounded-full text-base dark:bg-[linear-gradient(90deg,#3b82f6,#2563eb)]! dark:text-white! dark:shadow-[0_8px_24px_rgba(37,99,235,0.35)] dark:hover:opacity-90"
            >
              {isSaving ? "Saving..." : "Save new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
