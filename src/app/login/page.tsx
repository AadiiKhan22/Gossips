import { Suspense } from "react";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 dark:bg-[linear-gradient(180deg,#050b18_0%,#0a1430_100%)]">
      <div className="pointer-events-none absolute -top-32 left-1/2 hidden h-72 w-72 -translate-x-1/2 rounded-full bg-[#1d4ed8]/20 blur-3xl dark:block" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <GossipsLogo size="xl" showText={false} className="mb-3" />
          <h1 className="text-gossip text-3xl font-bold tracking-tight dark:text-[#e8eefc]">Gossips</h1>
          <p className="text-muted-foreground mt-1 text-sm dark:text-[#8a97b4]">Sign in to continue</p>
        </div>

        <Suspense fallback={<p className="text-muted-foreground text-center text-sm">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
