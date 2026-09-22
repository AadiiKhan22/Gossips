"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  hasFieldErrors,
  validateSignupForm,
  type AuthFieldErrors,
} from "@/lib/validations/auth";

const fieldDark =
  "dark:border-[#1f2d4d] dark:bg-[#0f1a33] dark:text-white dark:placeholder:text-[#6b7a99]";

export function SignupForm() {
  const router = useRouter();

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<AuthFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // No separate "confirm password" field in this design; validate against
    // itself so the shared validator's mismatch check is a no-op.
    const errors = validateSignupForm(email, password, password, displayName);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Account created. Check your email to confirm your address, then sign in.",
      );
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

      {successMessage ? (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="displayName" className="dark:text-white">Full Name</Label>
        <Input
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.displayName)}
          disabled={isLoading}
          className={`h-12 rounded-xl ${fieldDark}`}
        />
        {fieldErrors.displayName ? (
          <p className="text-destructive text-sm">{fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="dark:text-white">Email or Phone</Label>
        <Input
          id="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          disabled={isLoading}
          className={`h-12 rounded-xl ${fieldDark}`}
        />
        {fieldErrors.email ? (
          <p className="text-destructive text-sm">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="dark:text-white">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
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

      <Button
        type="submit"
        variant="gossip"
        className="h-12 w-full rounded-full text-base dark:bg-[linear-gradient(90deg,#3b82f6,#2563eb)]! dark:text-white! dark:shadow-[0_8px_24px_rgba(37,99,235,0.35)] dark:hover:opacity-90"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Sign Up"}
      </Button>

      <p className="text-muted-foreground text-center text-xs dark:text-[#8a97b4]">
        By signing up, you agree to our{" "}
        <span className="text-gossip font-medium dark:text-[#4aa3ff]">Terms of Service</span> and{" "}
        <span className="text-gossip font-medium dark:text-[#4aa3ff]">Privacy Policy</span>
      </p>

      <p className="text-center text-sm text-muted-foreground dark:text-[#8a97b4]">
        Already have an account?{" "}
        <Link href="/login" className="text-gossip font-medium hover:underline dark:text-[#4aa3ff]">
          Login
        </Link>
      </p>
    </form>
  );
}
