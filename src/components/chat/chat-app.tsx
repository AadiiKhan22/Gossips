"use client";

import * as React from "react";

import { ChatMainPanel } from "@/components/chat/chat-main-panel";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { CallProvider } from "@/components/calls/call-provider";
import type { ChatManageAction } from "@/components/chat/chat-list-item";
import { ConversationPanel } from "@/components/chat/conversation-panel";
import { ForwardDialog } from "@/components/chat/forward-dialog";
import { FriendRequestsDialog } from "@/components/chat/friend-requests-dialog";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { NewGroupDialog } from "@/components/chat/new-group-dialog";
import { formatChatListTime } from "@/lib/chat/format";
import {
  fetchConversationMemberNames,
  fetchConversationsClient,
  fetchMessages,
  sendMessage,
} from "@/lib/chat/client";
import { blockUser, isBlockedByUser, isUserBlocked, unblockUser } from "@/lib/chat/blocking";
import { fetchIncomingFriendRequestCount } from "@/lib/chat/friends";
import { useVisualViewport } from "@/lib/hooks/use-visual-viewport";
import {
  hideConversation,
  leaveGroupConversation,
  toggleMuteConversation,
  togglePinConversation,
} from "@/lib/chat/chat-management";
import { playMessageReceivedSound } from "@/lib/audio/ui-sounds";
import { deleteMessage, editMessage } from "@/lib/chat/message-actions";
import {
  fetchUnreadCounts,
  getNotificationPermission,
  requestNotificationPermission,
  showMessageNotification,
  updateTitleWithUnreadCount,
  type NotificationPermissionState,
} from "@/lib/chat/notifications";
import { useOnlinePresence } from "@/lib/chat/use-online-presence";
import { useTypingIndicator } from "@/lib/chat/use-typing-indicator";
import { fetchOtherMemberReadAt, markConversationRead } from "@/lib/chat/receipts";
import {
  fetchReactionsForMessages,
  toggleReaction,
  type ReactionSummary,
} from "@/lib/chat/reactions";
import type { ChatAttachment } from "@/lib/storage/chat-media";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ChatListItem, ChatUserSummary } from "@/types/chat-ui";
import type { Message, MessageReaction } from "@/types/database";

interface ChatAppProps {
  user: ChatUserSummary;
  initialChats: ChatListItem[];
}

export function ChatApp({ user, initialChats }: ChatAppProps) {
  const [chats, setChats] = React.useState<ChatListItem[]>(initialChats);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState("");
  const [newChatOpen, setNewChatOpen] = React.useState(false);
  const [newGroupOpen, setNewGroupOpen] = React.useState(false);
  const [friendRequestsOpen, setFriendRequestsOpen] = React.useState(false);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const [otherReadAt, setOtherReadAt] = React.useState<string | null>(null);
  const [isOtherBlocked, setIsOtherBlocked] = React.useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = React.useState(false);
  const [senderNamesById, setSenderNamesById] = React.useState<Map<string, string>>(new Map());
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  // Lock the page itself to the viewport while the chat screen is
  // mounted. Mobile Safari otherwise lets the whole page scroll when the
  // on-screen keyboard opens (a well-known iOS quirk), which drags the
  // fixed chat header off-screen -- unlike WhatsApp, where the header
  // always stays put. Only this screen locks body scroll; other pages
  // (Settings, Profile) are unaffected since this runs only while
  // ChatApp is mounted.
  React.useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.height = "100%";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.height = previousBodyHeight;
    };
  }, []);
  const [reactionsByMessageId, setReactionsByMessageId] = React.useState<
    Map<string, ReactionSummary[]>
  >(new Map());
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = React.useState<Message | null>(null);
  const [unreadCounts, setUnreadCounts] = React.useState<Map<string, number>>(new Map());
  const [notificationPermission, setNotificationPermission] =
    React.useState<NotificationPermissionState>("unsupported");

  React.useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  React.useEffect(() => {
    void fetchUnreadCounts(user.id).then(setUnreadCounts);
  }, [user.id]);

  const chatsWithUnread = React.useMemo(
    () =>
      chats.map((chat) => ({
        ...chat,
        unreadCount: unreadCounts.get(chat.id) ?? 0,
      })),
    [chats, unreadCounts],
  );

  const totalUnread = React.useMemo(
    () => Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0),
    [unreadCounts],
  );

  React.useEffect(() => {
    updateTitleWithUnreadCount(totalUnread);
    return () => updateTitleWithUnreadCount(0);
  }, [totalUnread]);

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
  }

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  const onlineUserIds = useOnlinePresence(user.id);
  const { typingUserIds, sendTyping, sendStoppedTyping } = useTypingIndicator(activeChatId, user.id);
  const isOtherOnline = Boolean(activeChat?.otherUserId && onlineUserIds.has(activeChat.otherUserId));
  const isOtherTyping = typingUserIds.size > 0;

  const refreshPendingRequestCount = React.useCallback(() => {
    void fetchIncomingFriendRequestCount(user.id).then(setPendingRequestCount);
  }, [user.id]);

  React.useEffect(() => {
    refreshPendingRequestCount();
  }, [refreshPendingRequestCount]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`friend-requests:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => refreshPendingRequestCount(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user.id, refreshPendingRequestCount]);

  const updateChatPreview = React.useCallback((message: Message) => {
    setChats((previous) => {
      const existing = previous.find((chat) => chat.id === message.conversation_id);

      if (!existing) {
        void fetchConversationsClient(user.id).then(setChats);
        return previous;
      }

      const updatedChat: ChatListItem = {
        ...existing,
        lastMessage: previewTextFor(message),
        timestamp: formatChatListTime(message.created_at),
      };

      return [updatedChat, ...previous.filter((chat) => chat.id !== message.conversation_id)];
    });
  }, [user.id]);

  React.useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setReplyingTo(null);
      return;
    }

    let cancelled = false;
    setMessagesLoading(true);
    setReplyingTo(null);

    void fetchMessages(activeChatId).then((loadedMessages) => {
      if (!cancelled) {
        setMessages(loadedMessages);
        setMessagesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // Group sender names, for the "sender name above bubble" label.
  React.useEffect(() => {
    if (!activeChatId || !activeChat?.isGroup) {
      setSenderNamesById(new Map());
      return;
    }

    let cancelled = false;
    void fetchConversationMemberNames(activeChatId).then((names) => {
      if (!cancelled) setSenderNamesById(names);
    });

    return () => {
      cancelled = true;
    };
  }, [activeChatId, activeChat?.isGroup]);

  // Reactions for the currently loaded messages.
  React.useEffect(() => {
    if (messages.length === 0) {
      setReactionsByMessageId(new Map());
      return;
    }

    let cancelled = false;
    void fetchReactionsForMessages(
      messages.map((message) => message.id),
      user.id,
    ).then((map) => {
      if (!cancelled) setReactionsByMessageId(map);
    });

    return () => {
      cancelled = true;
    };
    // Only re-fetch when the active chat's message set changes (not on every
    // local optimistic reaction toggle -- that's handled separately below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, messages.length, user.id]);

  // Live reaction updates for whatever is currently loaded.
  React.useEffect(() => {
    const messageIds = new Set(messages.map((message) => message.id));
    if (messageIds.size === 0) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`reactions:${activeChatId ?? "none"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as MessageReaction | null;
          if (!row || !messageIds.has(row.message_id)) return;

          void fetchReactionsForMessages([row.message_id], user.id).then((map) => {
            setReactionsByMessageId((previous) => {
              const next = new Map(previous);
              const updated = map.get(row.message_id) ?? [];
              if (updated.length === 0) {
                next.delete(row.message_id);
              } else {
                next.set(row.message_id, updated);
              }
              return next;
            });
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [messages, activeChatId, user.id]);

  React.useEffect(() => {
    if (!activeChatId || activeChat?.isGroup) {
      setOtherReadAt(null);
      return;
    }

    let cancelled = false;

    const refreshReadAt = () => {
      void fetchOtherMemberReadAt(activeChatId, user.id).then((readAt) => {
        if (!cancelled) setOtherReadAt(readAt);
      });
    };

    void markConversationRead(activeChatId, user.id).catch(() => {});
    refreshReadAt();

    // Realtime can miss events on mobile browsers (e.g. when the tab is
    // backgrounded), so also poll every few seconds as a safety net for
    // the "seen" double-tick.
    const intervalId = setInterval(refreshReadAt, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeChatId, activeChat?.isGroup, user.id]);

  React.useEffect(() => {
    const otherUserId = activeChat?.otherUserId;
    if (!otherUserId) {
      setIsOtherBlocked(false);
      setIsBlockedByOther(false);
      return;
    }

    let cancelled = false;
    void isUserBlocked(user.id, otherUserId).then((blocked) => {
      if (!cancelled) setIsOtherBlocked(blocked);
    });
    void isBlockedByUser(otherUserId).then((blocked) => {
      if (!cancelled) setIsBlockedByOther(blocked);
    });

    return () => {
      cancelled = true;
    };
  }, [activeChat?.otherUserId, user.id]);

  // Mark as read + clear the unread badge for whichever chat is open,
  // regardless of whether it's a direct chat or a group.
  React.useEffect(() => {
    if (!activeChatId) return;

    void markConversationRead(activeChatId, user.id).catch(() => {});
    setUnreadCounts((previous) => {
      if (!previous.has(activeChatId)) return previous;
      const next = new Map(previous);
      next.delete(activeChatId);
      return next;
    });
  }, [activeChatId, user.id]);

  React.useEffect(() => {
    if (!activeChatId || activeChat?.isGroup) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`reads:${activeChatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `conversation_id=eq.${activeChatId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_id: string; last_read_at: string } | null;
          if (!row || row.user_id === user.id) return;
          setOtherReadAt(row.last_read_at);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeChatId, activeChat?.isGroup, user.id]);

  const activeChatRef = React.useRef(activeChat);
  React.useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const senderNamesByIdRef = React.useRef(senderNamesById);
  React.useEffect(() => {
    senderNamesByIdRef.current = senderNamesById;
  }, [senderNamesById]);

  React.useEffect(() => {
    if (!activeChatId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${activeChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((previous) => {
            if (previous.some((message) => message.id === newMessage.id)) {
              return previous;
            }
            return [...previous, newMessage];
          });
          updateChatPreview(newMessage);
          if (newMessage.sender_id !== user.id) {
            void markConversationRead(activeChatId, user.id).catch(() => {});
            const senderName = activeChatRef.current?.isGroup
              ? (senderNamesByIdRef.current.get(newMessage.sender_id) ?? "Someone")
              : (activeChatRef.current?.name ?? "Someone");
            const preview = newMessage.content || "sent an attachment";
            setLiveAnnouncement(`New message from ${senderName}: ${preview}`);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeChatId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((previous) =>
            previous.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeChatId, updateChatPreview, user.id]);

  const activeChatIdRef = React.useRef(activeChatId);
  React.useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const chatsRef = React.useRef(chats);
  React.useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const chatIdsKey = React.useMemo(() => chats.map((chat) => chat.id).join(","), [chats]);

  React.useEffect(() => {
    if (!chatIdsKey) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=in.(${chatIdsKey})`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === user.id) return;
          updateChatPreview(newMessage);

          const isViewingThisChat = activeChatIdRef.current === newMessage.conversation_id;
          const isTabVisible = document.visibilityState === "visible" && document.hasFocus();

          // Don't badge/count-as-unread a message in the conversation
          // you're actively looking at right now.
          if (!(isViewingThisChat && isTabVisible)) {
            setUnreadCounts((previous) => {
              const next = new Map(previous);
              next.set(newMessage.conversation_id, (next.get(newMessage.conversation_id) ?? 0) + 1);
              return next;
            });
          }

          const chat = chatsRef.current.find((item) => item.id === newMessage.conversation_id);
          if (chat?.isMuted) return;

          playMessageReceivedSound();

          showMessageNotification({
            senderName: chat?.name ?? "New message",
            body: previewTextFor(newMessage) || "Sent an attachment",
            avatarUrl: chat?.avatarUrl,
            onClick: () => setActiveChatId(newMessage.conversation_id),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user.id, updateChatPreview, chatIdsKey]);

  async function handleSend(content: string, attachment?: ChatAttachment, replyToMessageId?: string) {
    if (!activeChatId) return;

    let message;
    try {
      message = await sendMessage(activeChatId, user.id, content, attachment, replyToMessageId);
    } catch (sendError) {
      const rawMessage = sendError instanceof Error ? sendError.message : "";
      if (rawMessage.toLowerCase().includes("row-level security")) {
        // A generic RLS failure could mean a real block, or something
        // else (a stale/desynced conversation state, for example). Check
        // the actual block status before claiming it's a block, so the
        // person doesn't see a false "you've been blocked" message.
        const otherUserId = activeChat?.otherUserId;
        if (otherUserId) {
          const [blockedThem, blockedByThem] = await Promise.all([
            isUserBlocked(user.id, otherUserId),
            isBlockedByUser(otherUserId),
          ]);
          setIsOtherBlocked(blockedThem);
          setIsBlockedByOther(blockedByThem);
          if (blockedThem || blockedByThem) {
            throw new Error("This message couldn't be delivered because of a block between you two.");
          }
        }
        throw new Error("This message couldn't be sent. Please try again.");
      }
      throw sendError;
    }

    setMessages((previous) => {
      if (previous.some((item) => item.id === message.id)) {
        return previous;
      }
      return [...previous, message];
    });
    updateChatPreview(message);
  }

  async function handleEditMessage(messageId: string, content: string) {
    const updated = await editMessage(messageId, content);
    setMessages((previous) =>
      previous.map((message) => (message.id === updated.id ? updated : message)),
    );
  }

  async function handleDeleteMessage(messageId: string) {
    const updated = await deleteMessage(messageId);
    setMessages((previous) =>
      previous.map((message) => (message.id === updated.id ? updated : message)),
    );
  }

  function handleReact(messageId: string, emoji: string) {
    void toggleReaction(messageId, user.id, emoji)
      .then(() => {
        void fetchReactionsForMessages([messageId], user.id).then((map) => {
          setReactionsByMessageId((previous) => {
            const next = new Map(previous);
            const updated = map.get(messageId) ?? [];
            if (updated.length === 0) {
              next.delete(messageId);
            } else {
              next.set(messageId, updated);
            }
            return next;
          });
        });
      })
      .catch((error) => {
        console.error("Failed to toggle reaction:", error);
      });
  }

  async function handleConversationStarted(conversationId: string) {
    const refreshedChats = await fetchConversationsClient(user.id);
    setChats(refreshedChats);
    setActiveChatId(conversationId);
  }

  async function handleForwarded() {
    const refreshedChats = await fetchConversationsClient(user.id);
    setChats(refreshedChats);
  }

  async function handleManageChat(chatId: string, action: ChatManageAction) {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;

    try {
      switch (action) {
        case "pin":
          await togglePinConversation(chatId, user.id, true);
          break;
        case "unpin":
          await togglePinConversation(chatId, user.id, false);
          break;
        case "mute":
          await toggleMuteConversation(chatId, user.id, true);
          break;
        case "unmute":
          await toggleMuteConversation(chatId, user.id, false);
          break;
        case "delete":
          await hideConversation(chatId, user.id);
          break;
        case "leave":
          await leaveGroupConversation(chatId, user.id);
          break;
      }

      if (action === "delete" || action === "leave") {
        setChats((previous) => previous.filter((item) => item.id !== chatId));
        if (activeChatId === chatId) setActiveChatId(null);
      } else {
        const refreshedChats = await fetchConversationsClient(user.id);
        setChats(refreshedChats);
      }
    } catch (manageError) {
      console.error("Failed to update chat:", manageError);
      window.alert("Something went wrong. Please try again.");
    }
  }

  async function handleToggleBlock() {
    const otherUserId = activeChat?.otherUserId;
    if (!otherUserId) return;

    try {
      if (isOtherBlocked) {
        await unblockUser(user.id, otherUserId);
        setIsOtherBlocked(false);
      } else {
        await blockUser(user.id, otherUserId);
        setIsOtherBlocked(true);
      }
    } catch (toggleError) {
      console.error("Failed to toggle block:", toggleError);
      window.alert(
        toggleError instanceof Error
          ? toggleError.message
          : "Something went wrong while updating the block. Please try again.",
      );
    }
  }

  return (
    <CallProvider currentUserId={user.id} onlineUserIds={onlineUserIds}>
      <div aria-live="polite" role="status" className="sr-only">
        {liveAnnouncement}
      </div>
      <div
        className="fixed inset-x-0 flex overflow-hidden bg-background overscroll-none"
        style={{ top: viewportOffsetTop, height: viewportHeight }}
      >
        <ChatSidebar
          user={user}
          chats={chatsWithUnread}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeChatId={activeChatId}
          onlineUserIds={onlineUserIds}
          onSelectChat={setActiveChatId}
          onManageChat={handleManageChat}
          onNewChat={() => setNewChatOpen(true)}
          onNewGroup={() => setNewGroupOpen(true)}
          onFriendRequests={() => setFriendRequestsOpen(true)}
          pendingRequestCount={pendingRequestCount}
          notificationPermission={notificationPermission}
          onEnableNotifications={handleEnableNotifications}
          className={cn(activeChatId && "hidden lg:flex")}
        />

        {activeChat ? (
          <ConversationPanel
            conversation={activeChat}
            messages={messages}
            messagesLoading={messagesLoading}
            currentUserId={user.id}
            currentUserAvatarUrl={user.avatarUrl}
            currentUserName={user.displayName}
            otherReadAt={otherReadAt}
            senderNamesById={senderNamesById}
            reactionsByMessageId={reactionsByMessageId}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            isOtherOnline={isOtherOnline}
            isOtherTyping={isOtherTyping}
            onTyping={sendTyping}
            onStoppedTyping={sendStoppedTyping}
            onSend={handleSend}
            onReply={setReplyingTo}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onForward={setForwardingMessage}
            onReact={handleReact}
            onBack={() => setActiveChatId(null)}
            isOtherBlocked={isOtherBlocked}
            isBlockedByOther={isBlockedByOther}
            onToggleBlock={handleToggleBlock}
            className="flex flex-1"
          />
        ) : (
          <ChatMainPanel />
        )}
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        currentUserId={user.id}
        onConversationStarted={handleConversationStarted}
      />

      <NewGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        currentUserId={user.id}
        onGroupCreated={handleConversationStarted}
      />

      <FriendRequestsDialog
        open={friendRequestsOpen}
        onOpenChange={setFriendRequestsOpen}
        currentUserId={user.id}
        onRequestsChanged={refreshPendingRequestCount}
      />

      <ForwardDialog
        message={forwardingMessage}
        chats={chats}
        currentUserId={user.id}
        onClose={() => setForwardingMessage(null)}
        onForwarded={handleForwarded}
      />
    </CallProvider>
  );
}

function previewTextFor(message: Message): string {
  if (message.deleted_at) return "This message was deleted";
  if (message.content) return message.content;
  if (message.attachment_type?.startsWith("image/")) return "📷 Photo";
  if (message.attachment_type?.startsWith("audio/")) return "🎤 Voice message";
  if (message.attachment_url) return `📎 ${message.attachment_name ?? "Attachment"}`;
  return "";
}
