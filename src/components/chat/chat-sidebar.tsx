"use client";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { ChatActions } from "@/components/chat/chat-actions";
import { ChatList } from "@/components/chat/chat-list";
import type { ChatManageAction } from "@/components/chat/chat-list-item";
import { ChatSearch } from "@/components/chat/chat-search";
import { ProfileMenu } from "@/components/chat/profile-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { NotificationPermissionState } from "@/lib/chat/notifications";
import { cn } from "@/lib/utils";
import type { ChatListItem, ChatUserSummary } from "@/types/chat-ui";

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
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full w-full flex-col border-sidebar-border lg:w-[360px] lg:max-w-[40%] lg:shrink-0 lg:border-r",
        className,
      )}
    >
      <div className="border-b border-sidebar-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="mb-4">
          <GossipsLogo size="sm" />
        </div>
        <ChatSearch value={searchQuery} onChange={onSearchChange} />
        <ChatActions
          className="mt-3"
          onNewChat={onNewChat}
          onNewGroup={onNewGroup}
          onFriendRequests={onFriendRequests}
          pendingRequestCount={pendingRequestCount}
        />

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

      <div className="flex-1 overflow-hidden">
        <ChatList
          chats={chats}
          isLoading={isLoading}
          searchQuery={searchQuery}
          activeChatId={activeChatId}
          onlineUserIds={onlineUserIds}
          onSelectChat={onSelectChat}
          onManageChat={onManageChat}
          className="h-full overflow-y-auto"
        />
      </div>

      <ProfileMenu user={user} />
    </aside>
  );
}
