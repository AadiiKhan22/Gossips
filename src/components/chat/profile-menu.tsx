"use client";

import { ChevronUp, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ChatUserSummary } from "@/types/chat-ui";

interface ProfileMenuProps {
  user: ChatUserSummary;
  className?: string;
}

export function ProfileMenu({ user, className }: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        "relative border-t border-sidebar-border bg-sidebar/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="hover:bg-sidebar-accent flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {user.username ? `@${user.username}` : user.email}
          </p>
        </div>
        <ChevronUp
          className={cn("text-muted-foreground size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="bg-popover absolute right-3 bottom-[calc(100%+0.5rem)] left-3 z-20 overflow-hidden rounded-xl border border-border/80 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Account</span>
            <ThemeToggle />
          </div>
          <div className="p-1">
            <Button variant="ghost" className="w-full justify-start gap-2" asChild role="menuitem">
              <Link href="/profile" onClick={() => setOpen(false)}>
                <UserRound className="size-4" />
                Profile
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive w-full justify-start gap-2"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="size-4" />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
