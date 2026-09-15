"use client";

import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { forwardMessage } from "@/lib/chat/message-actions";
import { useDialogA11y } from "@/lib/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat-ui";
import type { Message } from "@/types/database";

interface ForwardDialogProps {
  message: Message | null;
  chats: ChatListItem[];
  currentUserId: string;
  onClose: () => void;
  onForwarded: (conversationId: string) => void;
}

export function ForwardDialog({ message, chats, currentUserId, onClose, onForwarded }: ForwardDialogProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useDialogA11y(Boolean(message), (next) => {
    if (!next) onClose();
  }, dialogRef);

  if (!message) return null;

  async function handleForward(conversationId: string) {
    if (!message) return;
    setError(null);
    setPendingId(conversationId);
    try {
      await forwardMessage(message, conversationId, currentUserId);
      onForwarded(conversationId);
      onClose();
    } catch (forwardError) {
      setError(forwardError instanceof Error ? forwardError.message : "Failed to forward message.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-title"
        className="bg-background w-full max-w-md overflow-hidden rounded-xl border border-border/80 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="forward-title" className="text-lg font-semibold">
              Forward to...
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

          {chats.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No conversations to forward to yet.
            </p>
          ) : null}

          <ul className="space-y-1">
            {chats.map((chat) => {
              const isPending = pendingId === chat.id;
              return (
                <li key={chat.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleForward(chat.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      "hover:bg-muted",
                      isPending && "opacity-70",
                    )}
                  >
                    <UserAvatar name={chat.name} avatarUrl={chat.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{chat.name}</p>
                    </div>
                    {isPending ? (
                      <span className="text-muted-foreground text-xs">Sending...</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
