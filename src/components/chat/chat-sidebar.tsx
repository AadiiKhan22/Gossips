"use client";

import { MessageSquarePlus, MoreVertical, Pencil, Phone, Plus, User, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { CallsTabList } from "@/components/calls/calls-tab-list";
import { ChatList } from "@/components/chat/chat-list";
import type { ChatManageAction } from "@/components/chat/chat-list-item";
import { ChatSearch } from "@/components/chat/chat-search";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { NotificationPermissionState } from "@/lib/chat/notifications";
import { cn } from "@/lib/utils";
import type { ChatListItem, ChatUserSummary } from "@/types/chat-ui";

type SidebarTab = "chats" | "groups" | "calls";

interface ChatSidebarProps {
  user: ChatUserSummary;
  chats: ChatListItem[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeChatId?: string | null;
  onlineUserIds?: Set<string>;
  onSelectChat?: (chatId: string) => void;
  onManageChat?: (chatId: string, action: ChatManageAction) => void;
  onNewChat?: () => void;
  onNewGroup?: () => void;
  onFriendRequests?: () => void;
  pendingRequestCount?: number;
  notificationPermission?: NotificationPermissionState;
  onEnableNotifications?: () => void;
  className?: string;
}

export function ChatSidebar({
  user,
  chats,
  isLoading = false,
  searchQuery,
  onSearchChange,
  activeChatId,
  onlineUserIds,
  onSelectChat,
  onManageChat,
  onNewChat,
  onNewGroup,
  onFriendRequests,
  pendingRequestCount = 0,
  notificationPermission = "unsupported",
  onEnableNotifications,
  className,
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<SidebarTab>("chats");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const visibleChats =
    activeTab === "groups" ? chats.filter((chat) => chat.isGroup) : chats.filter((chat) => !chat.isGroup);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground relative flex h-full w-full flex-col border-sidebar-border lg:w-[360px] lg:max-w-[40%] lg:shrink-0 lg:border-r",
        className,
      )}
    >
      <div className="border-b border-sidebar-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <div className="mb-3 flex items-center justify-between">
          <GossipsLogo size="sm" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onFriendRequests}
              aria-label="Friend requests"
              className="text-gossip hover:bg-sidebar-accent relative flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <UserPlus className="size-5" />
              {pendingRequestCount > 0 ? (
                <span className="bg-gossip text-gossip-foreground absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
                </span>
              ) : null}
            </button>

            {activeTab === "chats" ? (
              <button
                type="button"
                onClick={onNewChat}
                aria-label="New chat"
                className="text-gossip hover:bg-sidebar-accent flex size-9 items-center justify-center rounded-full transition-colors"
              >
                <Plus className="size-5" />
              </button>
            ) : null}

            {activeTab === "groups" ? (
              <button
                type="button"
                onClick={onNewGroup}
                aria-label="New group"
                className="text-gossip hover:bg-sidebar-accent flex size-9 items-center justify-center rounded-full transition-colors"
              >
                <Plus className="size-5" />
              </button>
            ) : null}

            <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="text-gossip hover:bg-sidebar-accent flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <MoreVertical className="size-5" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="bg-popover absolute right-0 top-[calc(100%+0.5rem)] z-20 w-56 overflow-hidden rounded-xl border border-border/80 shadow-lg"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 rounded-none"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onNewGroup?.();
                  }}
                >
                  <Users className="size-4" />
                  New group
                </Button>
              </div>
            ) : null}
            </div>
          </div>
        </div>

        <ChatSearch
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={
            activeTab === "groups"
              ? "Search groups..."
              : activeTab === "calls"
                ? "Search calls..."
                : "Search chats..."
          }
        />

        <div className="mt-3 flex items-stretch border-b border-sidebar-border">
          {(
            [
              { key: "chats", label: "Chats" },
              { key: "groups", label: "Groups" },
              { key: "calls", label: "Calls" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex-1 pb-2.5 text-center text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "text-gossip"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.key ? (
                <span className="bg-gossip absolute inset-x-0 -bottom-px h-0.5 rounded-full" />
              ) : null}
            </button>
          ))}
        </div>

        {notificationPermission === "default" ? (
          <Alert className="mt-3">
            <AlertDescription className="flex items-center justify-between gap-2 text-xs">
              <span>Turn on notifications for new messages.</span>
              <Button type="button" size="sm" variant="gossip" onClick={onEnableNotifications}>
                Enable
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === "calls" ? (
          <CallsTabList currentUserId={user.id} className="h-full" />
        ) : (
          <ChatList
            chats={visibleChats}
            isLoading={isLoading}
            searchQuery={searchQuery}
            activeChatId={activeChatId}
            onlineUserIds={onlineUserIds}
            onSelectChat={onSelectChat}
            onManageChat={onManageChat}
            className="h-full overflow-y-auto"
            emptyMessage={activeTab === "groups" ? "No groups yet." : undefined}
          />
        )}

        {activeTab !== "calls" ? (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="New chat"
            className="bg-gossip text-gossip-foreground absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:brightness-110"
          >
            <Pencil className="size-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex items-center justify-around border-t border-sidebar-border bg-sidebar py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <BottomNavButton
          icon={<MessageSquarePlus className="size-5" />}
          label="Chats"
          active={activeTab === "chats"}
          onClick={() => setActiveTab("chats")}
        />
        <BottomNavButton
          icon={<Users className="size-5" />}
          label="Groups"
          active={activeTab === "groups"}
          onClick={() => setActiveTab("groups")}
        />
        <BottomNavButton
          icon={<Phone className="size-5" />}
          label="Calls"
          active={activeTab === "calls"}
          onClick={() => setActiveTab("calls")}
        />
        <Link
          href="/profile"
          className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 px-3 py-1 text-xs"
        >
          <User className="size-5" />
          Profile
        </Link>
      </nav>

      <span className="sr-only">{user.displayName}</span>
    </aside>
  );
}

function BottomNavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
        active ? "text-gossip" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
