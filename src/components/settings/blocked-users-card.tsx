"use client";

import { ShieldOff } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { fetchBlockedUsers, unblockUser } from "@/lib/chat/blocking";
import type { BlockedUserSummary } from "@/types/chat-ui";

interface BlockedUsersCardProps {
  currentUserId: string;
}

export function BlockedUsersList({ currentUserId }: BlockedUsersCardProps) {
  const [blockedUsers, setBlockedUsers] = React.useState<BlockedUserSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchBlockedUsers(currentUserId).then((users) => {
      if (!cancelled) {
        setBlockedUsers(users);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  async function handleUnblock(otherUserId: string) {
    setPendingId(otherUserId);
    try {
      await unblockUser(currentUserId, otherUserId);
      setBlockedUsers((previous) => previous.filter((user) => user.id !== otherUserId));
    } catch {
      // Best-effort; leave the list unchanged on failure.
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading blocked users…</p>;
  }

  if (blockedUsers.length === 0) {
    return <p className="text-muted-foreground text-sm">You haven&apos;t blocked anyone.</p>;
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map((user) => (
        <div
          key={user.id}
          className="border-border/70 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              {user.username ? (
                <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={pendingId === user.id}
            onClick={() => handleUnblock(user.id)}
          >
            <ShieldOff className="size-3.5" />
            Unblock
          </Button>
        </div>
      ))}
    </div>
  );
}
