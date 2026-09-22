"use client";

import * as React from "react";

import { ChatEmptyState, ChatSearchEmptyState } from "@/components/chat/chat-empty-state";
import { ChatListItemRow, type ChatManageAction } from "@/components/chat/chat-list-item";
import { ChatLoading } from "@/components/chat/chat-loading";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat-ui";

interface ChatListProps {
  chats: ChatListItem[];
  isLoading?: boolean;
  searchQuery?: string;
  activeChatId?: string | null;
  onlineUserIds?: Set<string>;
  onSelectChat?: (chatId: string) => void;
  onManageChat?: (chatId: string, action: ChatManageAction) => void;
  className?: string;
  emptyMessage?: string;
}

function filterChats(chats: ChatListItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return chats;

  return chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(normalized) ||
      chat.lastMessage?.toLowerCase().includes(normalized),
  );
}

export function ChatList({
  chats,
  isLoading = false,
  searchQuery = "",
  activeChatId = null,
  onlineUserIds,
  onSelectChat,
  onManageChat,
  className,
  emptyMessage,
}: ChatListProps) {
  const filteredChats = React.useMemo(
    () => filterChats(chats, searchQuery),
    [chats, searchQuery],
  );

  if (isLoading) {
    return <ChatLoading className={className} />;
  }

  if (chats.length === 0) {
    if (emptyMessage) {
      return (
        <p className={cn("text-muted-foreground px-4 py-10 text-center text-sm", className)}>
          {emptyMessage}
        </p>
      );
    }
    return <ChatEmptyState compact className={className} />;
  }

  if (filteredChats.length === 0) {
    return <ChatSearchEmptyState />;
  }

  return (
    <div className={cn("divide-y divide-border/60 overflow-y-auto", className)}>
      {filteredChats.map((chat) => (
        <ChatListItemRow
          key={chat.id}
          chat={chat}
          isActive={activeChatId === chat.id}
          isOnline={Boolean(chat.otherUserId && onlineUserIds?.has(chat.otherUserId))}
          onSelect={onSelectChat}
          onManage={onManageChat}
        />
      ))}
    </div>
  );
}
