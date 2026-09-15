"use client";

import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { fetchIncomingFriendRequests, respondToFriendRequest } from "@/lib/chat/friends";
import { useDialogA11y } from "@/lib/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import type { IncomingFriendRequest } from "@/types/chat-ui";

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onRequestsChanged?: () => void;
}

export function FriendRequestsDialog({
  open,
  onOpenChange,
  currentUserId,
  onRequestsChanged,
}: FriendRequestsDialogProps) {
  const [requests, setRequests] = React.useState<IncomingFriendRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useDialogA11y(open, onOpenChange, dialogRef);

  React.useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setError(null);
    void fetchIncomingFriendRequests(currentUserId)
      .then(setRequests)
      .catch(() => setError("Failed to load friend requests."))
      .finally(() => setIsLoading(false));
  }, [open, currentUserId]);

  async function handleRespond(requestId: string, accept: boolean) {
    setError(null);
    setPendingId(requestId);
    try {
      await respondToFriendRequest(requestId, accept);
      setRequests((previous) => previous.filter((request) => request.requestId !== requestId));
      onRequestsChanged?.();
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : "Failed to update request.");
    } finally {
      setPendingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-requests-title"
        className="bg-background w-full max-w-md overflow-hidden rounded-xl border border-border/80 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="friend-requests-title" className="text-lg font-semibold">
              Friend requests
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

          {isLoading ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">Loading...</p>
          ) : null}

          {!isLoading && requests.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No pending friend requests.
            </p>
          ) : null}

          <ul className="space-y-1">
            {requests.map((request) => {
              const isPending = pendingId === request.requestId;
              return (
                <li key={request.requestId}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2",
                      isPending && "opacity-70",
                    )}
                  >
                    <UserAvatar name={request.displayName} avatarUrl={request.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{request.displayName}</p>
                      {request.username ? (
                        <p className="text-muted-foreground truncate text-xs">@{request.username}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="gossip"
                        disabled={isPending}
                        onClick={() => handleRespond(request.requestId, true)}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleRespond(request.requestId, false)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
