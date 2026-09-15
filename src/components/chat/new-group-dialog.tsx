"use client";

import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFriends } from "@/lib/chat/friends";
import { createGroupConversation } from "@/lib/chat/groups";
import { useDialogA11y } from "@/lib/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import type { FriendSummary } from "@/types/chat-ui";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onGroupCreated: (conversationId: string) => void;
}

export function NewGroupDialog({
  open,
  onOpenChange,
  currentUserId,
  onGroupCreated,
}: NewGroupDialogProps) {
  const [friends, setFriends] = React.useState<FriendSummary[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [groupName, setGroupName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useDialogA11y(open, onOpenChange, dialogRef);

  React.useEffect(() => {
    if (!open) {
      setGroupName("");
      setSelectedIds(new Set());
      setError(null);
      return;
    }

    setIsLoading(true);
    void fetchFriends(currentUserId)
      .then(setFriends)
      .catch(() => setError("Failed to load friends."))
      .finally(() => setIsLoading(false));
  }, [open, currentUserId]);

  function toggleFriend(friendId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }

  async function handleCreate() {
    setError(null);

    if (!groupName.trim()) {
      setError("Give your group a name.");
      return;
    }

    if (selectedIds.size === 0) {
      setError("Select at least one friend.");
      return;
    }

    setIsCreating(true);
    try {
      const conversationId = await createGroupConversation(groupName, Array.from(selectedIds));
      onGroupCreated(conversationId);
      onOpenChange(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create group.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-group-title"
        className="bg-background w-full max-w-md overflow-hidden rounded-xl border border-border/80 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="new-group-title" className="text-lg font-semibold">
              New group
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <Input
            autoFocus
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            className="mt-3"
            aria-label="Group name"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

          {isLoading ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">Loading friends...</p>
          ) : null}

          {!isLoading && friends.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              Add some friends first before creating a group.
            </p>
          ) : null}

          <ul className="space-y-1">
            {friends.map((friend) => {
              const isSelected = selectedIds.has(friend.id);
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      isSelected ? "bg-gossip/10" : "hover:bg-muted",
                    )}
                  >
                    <UserAvatar name={friend.displayName} avatarUrl={friend.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{friend.displayName}</p>
                      {friend.username ? (
                        <p className="text-muted-foreground truncate text-xs">@{friend.username}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "border-border flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        isSelected && "bg-gossip border-gossip",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border/70 px-4 py-3">
          <Button
            type="button"
            variant="gossip"
            className="w-full"
            disabled={isCreating}
            onClick={handleCreate}
          >
            {isCreating ? "Creating..." : `Create group${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
