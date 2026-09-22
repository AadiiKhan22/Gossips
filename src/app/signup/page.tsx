import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background px-6 py-6 dark:bg-[linear-gradient(180deg,#050b18_0%,#0a1430_100%)]">
      <Link
        href="/login"
        aria-label="Back to login"
        className="text-muted-foreground hover:text-foreground dark:text-[#8a97b4] dark:hover:text-white -ml-2 mb-4 flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="mx-auto w-full max-w-sm flex-1">
        <GossipsLogo size="md" className="mb-6 dark:hidden" />
        <div className="mb-6 hidden items-center gap-3 dark:flex">
          <GossipsLogo size="lg" showText={false} />
          <span className="text-3xl font-bold tracking-tight text-[#e8eefc]">Gossips</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight dark:text-white">Create your account</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm dark:text-[#8a97b4]">Join the community</p>

        <SignupForm />
      </div>
    </div>
  );
}
