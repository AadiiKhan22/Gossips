import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to Gossips."
      footer={
        <p>
          By continuing, you agree to use Gossips responsibly.
        </p>
      }
    >
      <Suspense fallback={<p className="text-muted-foreground text-center text-sm">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
