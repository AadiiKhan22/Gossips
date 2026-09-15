"use client";

import { BellOff, MoreVertical, Pin, Trash2, Users } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat-ui";

export type ChatManageAction = "pin" | "unpin" | "mute" | "unmute" | "delete" | "leave";

interface ChatListItemRowProps {
  chat: ChatListItem;
  isActive?: boolean;
  isOnline?: boolean;
  onSelect?: (chatId: string) => void;
  onManage?: (chatId: string, action: ChatManageAction) => void;
}

export function ChatListItemRow({
  chat,
  isActive = false,
  isOnline = false,
  onSelect,
  onManage,
}: ChatListItemRowProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;

    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowMenu(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  function handleAction(action: ChatManageAction) {
    onManage?.(chat.id, action);
    setShowMenu(false);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group hover:bg-sidebar-accent relative flex w-full items-center gap-3 px-3 py-3 transition-colors",
        isActive && "bg-sidebar-accent",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(chat.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <UserAvatar name={chat.name} avatarUrl={chat.avatarUrl} size="md" isOnline={isOnline} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              {chat.isPinned ? <Pin className="text-gossip size-3 shrink-0 fill-current" /> : null}
              <span className="truncate font-medium">{chat.name}</span>
            </span>
            {chat.timestamp ? (
              <span className="text-muted-foreground shrink-0 text-xs">{chat.timestamp}</span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-muted-foreground truncate text-sm">
              {chat.isGroup ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5 shrink-0" />
                  {chat.lastMessage ?? "Group chat"}
                </span>
              ) : (
                chat.lastMessage ?? "No messages yet"
              )}
            </p>
            <span className="flex shrink-0 items-center gap-1">
              {chat.isMuted ? <BellOff className="text-muted-foreground size-3.5" /> : null}
              {chat.unreadCount && chat.unreadCount > 0 ? (
                <Badge className="bg-gossip text-gossip-foreground rounded-full px-2">
                  {chat.unreadCount}
                </Badge>
              ) : null}
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setShowMenu((value) => !value)}
        aria-label="Chat options"
        aria-haspopup="true"
        aria-expanded={showMenu}
        className={cn(
          "text-muted-foreground hover:bg-background shrink-0 rounded-full p-1.5 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
          showMenu && "opacity-100",
        )}
      >
        <MoreVertical className="size-4" />
      </button>

      {showMenu ? (
        <div
          role="menu"
          aria-label="Chat options"
          className="bg-background border-border absolute top-12 right-2 z-30 w-44 rounded-lg border py-1 shadow-lg"
        >
          <MenuItem
            icon={Pin}
            label={chat.isPinned ? "Unpin chat" : "Pin chat"}
            onClick={() => handleAction(chat.isPinned ? "unpin" : "pin")}
          />
          <MenuItem
            icon={BellOff}
            label={chat.isMuted ? "Unmute" : "Mute notifications"}
            onClick={() => handleAction(chat.isMuted ? "unmute" : "mute")}
          />
          <MenuItem
            icon={Trash2}
            label={chat.isGroup ? "Leave group" : "Delete chat"}
            destructive
            onClick={() => handleAction(chat.isGroup ? "leave" : "delete")}
          />
        </div>
      ) : null}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, destructive = false }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
