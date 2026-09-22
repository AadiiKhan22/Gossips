"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { hasFieldErrors, validateLoginForm, type AuthFieldErrors } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const fieldDark =
    "dark:border-[#1f2d4d] dark:bg-[#0f1a33] dark:text-white dark:placeholder:text-[#6b7a99]";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [fieldErrors, setFieldErrors] = React.useState<AuthFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
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

      // "Remember me" unchecked: keep the session for this tab only, not
      // across future browser restarts (Supabase persists by default).
      if (!rememberMe) {
        window.sessionStorage.setItem("gossips_session_only", "1");
      } else {
        window.sessionStorage.removeItem("gossips_session_only");
      }

      setFailedAttempts(0);
      router.replace(redirectTo);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError(null);
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        setFormError(error.message);
        setIsGoogleLoading(false);
      }
      // On success the browser navigates away to Google, so no further
      // state update is needed here.
    } catch {
      setFormError("Couldn't start Google sign-in. Please try again.");
      setIsGoogleLoading(false);
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
        <Label htmlFor="email" className="sr-only">
          Email or Phone
        </Label>
        <Input
          id="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="Email or Phone"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          disabled={isLoading}
          className={`h-12 rounded-xl ${fieldDark}`}
        />
        {fieldErrors.email ? <p className="text-destructive text-sm">{fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="sr-only">
          Password
        </Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          disabled={isLoading}
          className={`h-12 rounded-xl ${fieldDark}`}
        />
        {fieldErrors.password ? (
          <p className="text-destructive text-sm">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 dark:text-[#c9d3e8]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="accent-gossip size-4 rounded dark:accent-[#3b82f6]"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-gossip font-medium hover:underline dark:text-[#4aa3ff]">
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="gossip"
        className="h-12 w-full rounded-full text-base dark:bg-[linear-gradient(90deg,#3b82f6,#2563eb)]! dark:text-white! dark:shadow-[0_8px_24px_rgba(37,99,235,0.35)] dark:hover:opacity-90"
        disabled={isLoading || Boolean(lockedUntil && Date.now() < lockedUntil)}
      >
        {lockedUntil && Date.now() < lockedUntil
          ? `Try again in ${lockCountdown}s`
          : isLoading
            ? "Signing in..."
            : "Login"}
      </Button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border dark:bg-[#1f2d4d]" />
        <span className="text-muted-foreground text-xs dark:text-[#8a97b4]">or continue with</span>
        <div className="h-px flex-1 bg-border dark:bg-[#1f2d4d]" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2 rounded-xl dark:border-[#1f2d4d] dark:bg-[#0f1a33] dark:text-white dark:hover:bg-[#15224a]"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        <GoogleIcon className="size-5" />
        {isGoogleLoading ? "Redirecting..." : "Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gossip font-medium hover:underline dark:text-[#4aa3ff]">
          Sign up
        </Link>
      </p>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3a7.4 7.4 0 0 1-4.06 1.14c-3.13 0-5.78-2.11-6.73-4.96H1.25v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.25a12 12 0 0 0 0 10.74l4.02-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.25 6.63l4.02 3.1C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
