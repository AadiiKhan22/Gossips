"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";
import {
  hasFieldErrors,
  validateLoginForm,
  type AuthFieldErrors,
} from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<AuthFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockedUntil, setLockedUntil] = React.useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = React.useState(0);

  React.useEffect(() => {
    if (!lockedUntil) return;

    const interval = window.setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        window.clearInterval(interval);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  React.useEffect(() => {
    const error = searchParams.get("error");
    if (error === "auth_callback_error") {
      setFormError("Authentication failed. Please try signing in again.");
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (lockedUntil && Date.now() < lockedUntil) {
      setFormError(`Too many attempts. Try again in ${lockCountdown}s.`);
      return;
    }

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);

        // Defense-in-depth client-side lockout. The real rate limit that
        // can't be bypassed by clearing local state lives in Supabase
        // Auth (Dashboard -> Authentication -> Rate Limits).
        if (attempts >= 5) {
          const lockSeconds = 30;
          setLockedUntil(Date.now() + lockSeconds * 1000);
          setLockCountdown(lockSeconds);
          setFormError(`Too many failed attempts. Try again in ${lockSeconds}s.`);
        } else {
          setFormError(error.message);
        }
        return;
      }

      setFailedAttempts(0);
      router.push(redirectTo);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          disabled={isLoading}
        />
        {fieldErrors.email ? (
          <p className="text-destructive text-sm">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          disabled={isLoading}
        />
        {fieldErrors.password ? (
          <p className="text-destructive text-sm">{fieldErrors.password}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="gossip"
        className="w-full"
        disabled={isLoading || Boolean(lockedUntil && Date.now() < lockedUntil)}
      >
        {lockedUntil && Date.now() < lockedUntil
          ? `Try again in ${lockCountdown}s`
          : isLoading
            ? "Signing in..."
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gossip font-medium hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
