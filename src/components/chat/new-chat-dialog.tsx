"use client";

import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startDirectConversation } from "@/lib/chat/client";
import { cancelFriendRequest, searchUsersWithFriendStatus, sendFriendRequest } from "@/lib/chat/friends";
import { useDialogA11y } from "@/lib/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import type { UserSearchResult } from "@/types/chat-ui";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onConversationStarted: (conversationId: string) => void;
}

export function NewChatDialog({
  open,
  onOpenChange,
  currentUserId,
  onConversationStarted,
}: NewChatDialogProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useDialogA11y(open, onOpenChange, dialogRef);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  const refreshSearch = React.useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const users = await searchUsersWithFriendStatus(trimmed, currentUserId);
    setResults(users);
  }, [query, currentUserId]);

  React.useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const users = await searchUsersWithFriendStatus(trimmed, currentUserId);
        setResults(users);
      } catch {
        setError("Failed to search users.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, open, currentUserId]);

  async function handleAddFriend(otherUserId: string) {
    setError(null);
    setPendingAction(otherUserId);
    try {
      await sendFriendRequest(currentUserId, otherUserId);
      await refreshSearch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to send friend request.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCancelRequest(requestId: string, otherUserId: string) {
    setError(null);
    setPendingAction(otherUserId);
    try {
      await cancelFriendRequest(requestId);
      await refreshSearch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to cancel request.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStartChat(otherUserId: string) {
    setError(null);
    setPendingAction(otherUserId);

    try {
      const conversationId = await startDirectConversation(otherUserId);
      onConversationStarted(conversationId);
      onOpenChange(false);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to start chat.");
    } finally {
      setPendingAction(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        className="bg-background w-full max-w-md overflow-hidden rounded-xl border border-border/80 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="new-chat-title" className="text-lg font-semibold">
              New chat
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Search by username or display name. You can message someone once they accept your
            friend request.
          </p>
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users..."
            className="mt-3"
            aria-label="Search users"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

          {query.trim().length < 2 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              Type at least 2 characters to search.
            </p>
          ) : null}

          {isSearching ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">Searching...</p>
          ) : null}

          {!isSearching && query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">No users found.</p>
          ) : null}

          <ul className="space-y-1">
            {results.map((profile) => {
              const isPending = pendingAction === profile.id;
              return (
                <li key={profile.id}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      isPending && "opacity-70",
                    )}
                  >
                    <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{profile.displayName}</p>
                      {profile.username ? (
                        <p className="text-muted-foreground truncate text-xs">@{profile.username}</p>
                      ) : null}
                    </div>

                    {profile.friendStatus === "friends" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="gossip"
                        disabled={isPending}
                        onClick={() => handleStartChat(profile.id)}
                      >
                        {isPending ? "Opening..." : "Message"}
                      </Button>
                    ) : profile.friendStatus === "outgoing" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          profile.requestId && handleCancelRequest(profile.requestId, profile.id)
                        }
                      >
                        {isPending ? "..." : "Requested"}
                      </Button>
                    ) : profile.friendStatus === "incoming" ? (
                      <span className="text-muted-foreground text-xs font-medium">
                        Check your requests
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleAddFriend(profile.id)}
                      >
                        {isPending ? "..." : "Add friend"}
                      </Button>
                    )}
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
