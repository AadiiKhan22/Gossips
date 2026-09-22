"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="border-destructive/40 text-destructive hover:bg-destructive/10 dark:border-[#3b82f6]/40 dark:text-[#4aa3ff] dark:hover:bg-[#3b82f6]/10 dark:hover:text-[#4aa3ff]"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="size-4" />
      {isLoggingOut ? "Logging out..." : "Log out"}
    </Button>
  );
}
