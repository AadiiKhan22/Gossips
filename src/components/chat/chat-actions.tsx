"use client";

import { MessageSquarePlus, UserPlus, Users } from "lucide-react";
import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatActionsProps {
  className?: string;
  onNewChat?: () => void;
  onNewGroup?: () => void;
  onFriendRequests?: () => void;
  pendingRequestCount?: number;
}

export function ChatActions({
  className,
  onNewChat,
  onNewGroup,
  onFriendRequests,
  pendingRequestCount = 0,
}: ChatActionsProps) {
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className={cn("space-y-3", className)}>
      {notice ? (
        <Alert>
          <AlertDescription className="text-xs sm:text-sm">{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="gossip" className="gap-2" onClick={onNewChat}>
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={onNewGroup}>
          <Users className="size-4" />
          New group
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        className="relative w-full gap-2"
        onClick={onFriendRequests}
      >
        <UserPlus className="size-4" />
        Friend requests
        {pendingRequestCount > 0 ? (
          <span className="bg-gossip text-gossip-foreground absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-semibold">
            {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
          </span>
        ) : null}
      </Button>
    </div>
  );
}
