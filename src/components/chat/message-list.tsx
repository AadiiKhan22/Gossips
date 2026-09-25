"use client";

import * as React from "react";

import { MessageBubble } from "@/components/chat/message-bubble";
import type { ConversationMemberInfo } from "@/lib/chat/client";
import type { ReactionSummary } from "@/lib/chat/reactions";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  currentUserAvatarUrl?: string | null;
  currentUserName?: string;
  otherAvatarUrl?: string | null;
  otherName?: string;
  isLoading?: boolean;
  /** Other member's last_read_at ISO string, or null if they haven't read yet. */
  otherReadAt?: string | null;
  isGroup?: boolean;
  senderInfoById?: Map<string, ConversationMemberInfo>;
  reactionsByMessageId?: Map<string, ReactionSummary[]>;
  /** Message id to scroll to and briefly highlight, e.g. an active search match. */
  scrollToMessageId?: string | null;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onForward?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  currentUserAvatarUrl,
  otherAvatarUrl,
  currentUserName,
  otherName,
  isLoading = false,
  otherReadAt = null,
  isGroup = false,
  senderInfoById,
  reactionsByMessageId,
  scrollToMessageId = null,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
}: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const messageNodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    if (scrollToMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, scrollToMessageId]);

  React.useEffect(() => {
    if (!scrollToMessageId) return;
    messageNodeRefs.current.get(scrollToMessageId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [scrollToMessageId]);

  const messagesById = React.useMemo(() => {
    const map = new Map<string, Message>();
    for (const message of messages) map.set(message.id, message);
    return map;
  }, [messages]);

  // While messages are loading, render an empty pane instead of a
  // "Loading..." message so the chat just appears once it's ready.
  if (isLoading) {
    return <div className="flex-1" />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-muted-foreground max-w-sm text-sm">
          No messages yet. Say hello to start the conversation.
        </p>
      </div>
    );
  }

  const otherReadAtMs = otherReadAt ? new Date(otherReadAt).getTime() : null;

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId;
        const isSeen =
          isOwn && otherReadAtMs !== null && new Date(message.created_at).getTime() <= otherReadAtMs;
        const replyToMessage = message.reply_to_message_id
          ? (messagesById.get(message.reply_to_message_id) ?? null)
          : null;

        return (
          <div
            key={message.id}
            ref={(node) => {
              if (node) messageNodeRefs.current.set(message.id, node);
              else messageNodeRefs.current.delete(message.id);
            }}
            className={cn(
              "rounded-2xl transition-shadow",
              scrollToMessageId === message.id && "ring-gossip ring-2 ring-offset-2 ring-offset-background",
            )}
          >
            <MessageBubble
              message={message}
              isOwn={isOwn}
              isSeen={isSeen}
              isGroup={isGroup}
              senderName={senderInfoById?.get(message.sender_id)?.name ?? (isOwn ? currentUserName : otherName)}
              avatarUrl={
                isOwn
                  ? currentUserAvatarUrl
                  : (senderInfoById?.get(message.sender_id)?.avatarUrl ?? otherAvatarUrl)
              }
              replyToMessage={replyToMessage}
              reactions={reactionsByMessageId?.get(message.id) ?? []}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onForward={onForward}
              onReact={onReact}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
