"use client";

import { ArrowLeft, ChevronDown, ChevronUp, MoreVertical, Search, ShieldOff, UserX, X } from "lucide-react";
import * as React from "react";

import { MessageComposer } from "@/components/chat/message-composer";
import { MessageList } from "@/components/chat/message-list";
import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReactionSummary } from "@/lib/chat/reactions";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/lib/storage/chat-media";
import type { ChatListItem } from "@/types/chat-ui";
import type { Message } from "@/types/database";

interface ConversationPanelProps {
  conversation: ChatListItem;
  messages: Message[];
  messagesLoading?: boolean;
  currentUserId: string;
  otherReadAt?: string | null;
  senderNamesById?: Map<string, string>;
  reactionsByMessageId?: Map<string, ReactionSummary[]>;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  isOtherOnline?: boolean;
  isOtherTyping?: boolean;
  onTyping?: () => void;
  onStoppedTyping?: () => void;
  onSend: (content: string, attachment?: ChatAttachment, replyToMessageId?: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onForward?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onBack?: () => void;
  isOtherBlocked?: boolean;
  isBlockedByOther?: boolean;
  onToggleBlock?: () => void;
  className?: string;
}

export function ConversationPanel({
  conversation,
  messages,
  messagesLoading = false,
  currentUserId,
  otherReadAt = null,
  senderNamesById,
  reactionsByMessageId,
  replyingTo = null,
  onCancelReply,
  isOtherOnline = false,
  isOtherTyping = false,
  onTyping,
  onStoppedTyping,
  onSend,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onBack,
  isOtherBlocked = false,
  isBlockedByOther = false,
  onToggleBlock,
  className,
}: ConversationPanelProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeMatchIndex, setActiveMatchIndex] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveMatchIndex(0);
  }, [conversation.id]);

  React.useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  const matchIds = React.useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return [];
    return messages
      .filter((message) => !message.deleted_at && message.content.toLowerCase().includes(normalized))
      .map((message) => message.id);
  }, [messages, searchQuery]);

  const activeMatchId = matchIds[activeMatchIndex] ?? null;

  function goToPreviousMatch() {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((index) => (index - 1 + matchIds.length) % matchIds.length);
  }

  function goToNextMatch() {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((index) => (index + 1) % matchIds.length);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <section className={cn("bg-background flex min-w-0 flex-1 flex-col overflow-hidden", className)}>
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onBack}
            aria-label="Back to chats"
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}

        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <Input
              ref={searchInputRef}
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (event.shiftKey) goToPreviousMatch();
                  else goToNextMatch();
                } else if (event.key === "Escape") {
                  closeSearch();
                }
              }}
              placeholder="Search messages..."
              className="h-8"
              aria-label="Search messages in this conversation"
            />
            {searchQuery.trim() ? (
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {matchIds.length > 0 ? `${activeMatchIndex + 1}/${matchIds.length}` : "0/0"}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={matchIds.length === 0}
              onClick={goToPreviousMatch}
              aria-label="Previous match"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={matchIds.length === 0}
              onClick={goToNextMatch}
              aria-label="Next match"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={closeSearch}
              aria-label="Close search"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <UserAvatar
              name={conversation.name}
              avatarUrl={conversation.avatarUrl}
              size="sm"
              isOnline={!conversation.isGroup && isOtherOnline}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{conversation.name}</h2>
              <p className="text-muted-foreground text-xs">
                {conversation.isGroup
                  ? `${conversation.memberCount ?? 0} members`
                  : isOtherOnline
                    ? "Online"
                    : "Private chat"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search messages"
            >
              <Search className="size-4" />
            </Button>

            {!conversation.isGroup && onToggleBlock ? (
              <div className="relative" ref={menuRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-label="Conversation options"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="size-4" />
                </Button>

                {menuOpen ? (
                  <div
                    role="menu"
                    aria-label="Conversation options"
                    className="bg-background border-border absolute top-10 right-0 z-30 w-52 rounded-lg border py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onToggleBlock();
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                        isOtherBlocked ? "text-foreground" : "text-destructive",
                      )}
                    >
                      {isOtherBlocked ? (
                        <ShieldOff className="size-4" />
                      ) : (
                        <UserX className="size-4" />
                      )}
                      {isOtherBlocked ? "Unblock user" : "Block user"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </header>

      {isOtherBlocked ? (
        <div className="border-border/70 bg-muted/50 border-b px-4 py-2 text-center text-xs sm:px-6">
          You&apos;ve blocked this user. Unblock them to send or receive messages.
        </div>
      ) : isBlockedByOther ? (
        <div className="border-border/70 bg-muted/50 border-b px-4 py-2 text-center text-xs sm:px-6">
          {conversation.name} blocked you.
        </div>
      ) : null}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={messagesLoading}
        otherReadAt={otherReadAt}
        isGroup={conversation.isGroup}
        senderNamesById={senderNamesById}
        reactionsByMessageId={reactionsByMessageId}
        scrollToMessageId={activeMatchId}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onForward={onForward}
        onReact={onReact}
      />

      {isOtherTyping ? (
        <div className="px-4 pb-1 sm:px-6">
          <div className="bg-muted inline-flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-2.5">
            <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full" />
          </div>
        </div>
      ) : null}

      <MessageComposer
        conversationId={conversation.id}
        onSend={onSend}
        disabled={messagesLoading || isOtherBlocked || isBlockedByOther}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        onTyping={onTyping}
        onStoppedTyping={onStoppedTyping}
      />
    </section>
  );
}
