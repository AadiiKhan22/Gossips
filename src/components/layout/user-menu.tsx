"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  displayName: string;
}

export function UserMenu({ displayName }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
        <Link href="/profile">
          <UserRound className="size-4" />
          {displayName}
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild className="sm:hidden">
        <Link href="/profile" aria-label="Profile">
          <UserRound className="size-4" />
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isLoading}
        className="gap-2"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">{isLoading ? "Signing out..." : "Sign out"}</span>
      </Button>
    </div>
  );
}
