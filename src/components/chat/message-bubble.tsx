"use client";

import { ImageLightbox } from "@/components/chat/image-lightbox";
import { UserAvatar } from "@/components/chat/user-avatar";
import { VoiceMessageBubble } from "@/components/chat/voice-message-bubble";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  FileText,
  Forward,
  Pencil,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMessageTime } from "@/lib/chat/format";
import type { ReactionSummary } from "@/lib/chat/reactions";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isSeen?: boolean;
  isGroup?: boolean;
  senderName?: string;
  avatarUrl?: string | null;
  replyToMessage?: Message | null;
  reactions?: ReactionSummary[];
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onForward?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  isSeen = false,
  isGroup = false,
  senderName,
  avatarUrl,
  replyToMessage,
  reactions = [],
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(message.content);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isDeleted = Boolean(message.deleted_at);
  const isImageAttachment = message.attachment_type?.startsWith("image/") ?? false;
  const isAudioAttachment = message.attachment_type?.startsWith("audio/") ?? false;

  React.useEffect(() => {
    if (!showMenu && !showEmojiPicker) return;

    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowEmojiPicker(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMenu(false);
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu, showEmojiPicker]);

  async function handleSaveEdit() {
    if (!onEdit) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;

    setIsSavingEdit(true);
    setActionError(null);
    try {
      await onEdit(message.id, trimmed);
      setIsEditing(false);
    } catch {
      setActionError("Couldn't save your edit. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Delete this message? This can't be undone.")) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await onDelete(message.id);
      setShowMenu(false);
    } catch {
      setActionError("Couldn't delete this message. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCopy() {
    const text = message.content || attachmentLabel(message);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied; silently ignore.
    }
    setShowMenu(false);
  }

  if (isDeleted) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="text-muted-foreground max-w-[85%] rounded-2xl border border-dashed border-border/70 px-4 py-2 text-sm italic sm:max-w-[70%]">
          This message was deleted
        </div>
      </div>
    );
  }

  const showGroupAvatar = isGroup && !isOwn && Boolean(senderName) && !isAudioAttachment;

  return (
    <>
      <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
      {showGroupAvatar ? (
        <UserAvatar name={senderName ?? "?"} avatarUrl={avatarUrl} size="xs" className="mb-0.5 shrink-0" />
      ) : null}
      <div ref={containerRef} className="group relative max-w-[85%] sm:max-w-[70%]">
        {showEmojiPicker ? (
          <div
            className={cn(
              "bg-background border-border absolute -top-11 z-30 flex gap-1 rounded-full border px-2 py-1.5 shadow-md",
              isOwn ? "right-0" : "left-0",
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="hover:bg-muted rounded-full p-1 text-lg leading-none"
                onClick={() => {
                  onReact?.(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {/* Quick-react smiley -- floats outside the bubble on hover, no layout shift */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((value) => !value)}
          aria-label="React"
          aria-haspopup="true"
          aria-expanded={showEmojiPicker}
          className={cn(
            "bg-background border-border absolute top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity",
            "group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
            showEmojiPicker && "opacity-100",
            isOwn ? "right-full mr-2" : "-right-2 translate-x-full",
          )}
        >
          <Smile className="text-muted-foreground size-4" />
        </button>

        {/* Hover-revealed chevron -- always top-right, CSS-only opacity toggle */}
        <button
          type="button"
          onClick={() => setShowMenu((value) => !value)}
          aria-label="Message actions"
          aria-haspopup="true"
          aria-expanded={showMenu}
          className={cn(
            "bg-background border-border absolute -top-2 right-1 z-20 flex size-6 items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity",
            "group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
            showMenu && "opacity-100",
          )}
        >
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>

        {showMenu ? (
          <div
            role="menu"
            aria-label="Message actions"
            className={cn(
              "bg-background border-border absolute top-6 z-30 w-48 rounded-lg border py-1 shadow-lg",
              isOwn ? "right-1" : "left-1",
            )}
          >
            {onReply ? (
              <MenuItem
                icon={Reply}
                label="Reply"
                onClick={() => {
                  onReply(message);
                  setShowMenu(false);
                }}
              />
            ) : null}
            <MenuItem
              icon={Smile}
              label="React"
              onClick={() => {
                setShowEmojiPicker(true);
                setShowMenu(false);
              }}
            />
            {onForward ? (
              <MenuItem
                icon={Forward}
                label="Forward"
                onClick={() => {
                  onForward(message);
                  setShowMenu(false);
                }}
              />
            ) : null}
            <MenuItem icon={Copy} label={copied ? "Copied!" : "Copy"} onClick={handleCopy} />
            {isOwn && message.content && !isEditing ? (
              <MenuItem
                icon={Pencil}
                label="Edit"
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
              />
            ) : null}
            {isOwn && !isDeleting ? (
              <MenuItem icon={Trash2} label="Delete" destructive onClick={handleDelete} />
            ) : null}
          </div>
        ) : null}

        {message.attachment_url &&
        isImageAttachment &&
        !isEditing &&
        !replyToMessage &&
        !message.is_forwarded &&
        !(isGroup && !isOwn && senderName) ? (
          // Borderless photo message: no bubble background/padding, just the
          // rounded image (with an optional caption underneath) and the
          // timestamp overlaid on the image itself.
          <div className={cn("w-72 max-w-full sm:w-80", isOwn ? "ml-auto" : "mr-auto")}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block w-full cursor-zoom-in"
                aria-label="Open image"
              >
                <Image
                  src={message.attachment_url}
                  alt={message.attachment_name ?? "Image attachment"}
                  width={480}
                  height={360}
                  sizes="(max-width: 640px) 85vw, 320px"
                  className={cn(
                    "max-h-80 w-full object-cover shadow-xs",
                    isOwn ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md",
                  )}
                />
              </button>
              {!message.content ? (
                <div className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
                  <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                  {isOwn ? (
                    isSeen ? (
                      <CheckCheck className="size-3.5 text-[#16A34A]" aria-label="Seen" />
                    ) : (
                      <Check className="size-3.5" aria-label="Sent" />
                    )
                  ) : null}
                </div>
              ) : null}
            </div>

            {message.content ? (
              <div className="px-1 pt-1.5">
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {message.content}
                </p>
                <div className="text-muted-foreground mt-0.5 flex items-center justify-end gap-1 text-[11px]">
                  {message.edited_at ? <span className="italic">edited</span> : null}
                  <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                  {isOwn ? (
                    isSeen ? (
                      <CheckCheck className="size-3.5 text-[#16A34A]" aria-label="Seen" />
                    ) : (
                      <Check className="size-3.5" aria-label="Sent" />
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : message.attachment_url &&
          isAudioAttachment &&
          !isEditing &&
          !replyToMessage &&
          !message.is_forwarded &&
          !(isGroup && !isOwn && senderName) ? (
          <VoiceMessageBubble
            src={message.attachment_url}
            durationSeconds={message.attachment_duration_seconds}
            createdAt={message.created_at}
            isOwn={isOwn}
            isSeen={isSeen}
            messageId={message.id}
            avatarUrl={avatarUrl}
            senderName={senderName}
          />
        ) : (
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm shadow-xs",
            isOwn
              ? "bg-gossip text-gossip-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md",
          )}
        >
          {message.is_forwarded ? (
            <p
              className={cn(
                "mb-1 flex items-center gap-1 text-[11px] italic",
                isOwn ? "text-gossip-foreground/70" : "text-muted-foreground",
              )}
            >
              <Forward className="size-3" /> Forwarded
            </p>
          ) : null}

          {isGroup && !isOwn && senderName ? (
            <p className="text-gossip mb-0.5 text-xs font-semibold">{senderName}</p>
          ) : null}

          {replyToMessage ? (
            <div
              className={cn(
                "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs",
                isOwn
                  ? "border-gossip-foreground/40 bg-black/10"
                  : "border-gossip bg-background/70",
              )}
            >
              <p className={cn("font-medium", isOwn ? "" : "text-gossip")}>
                {replyToMessage.deleted_at ? "Deleted message" : (replyToMessage.content || attachmentLabel(replyToMessage))}
              </p>
            </div>
          ) : null}

          {message.attachment_url && isImageAttachment ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="mb-2 block w-full cursor-zoom-in"
              aria-label="Open image"
            >
              <Image
                src={message.attachment_url}
                alt={message.attachment_name ?? "Image attachment"}
                width={480}
                height={360}
                sizes="(max-width: 640px) 85vw, 320px"
                className="max-h-64 w-full rounded-lg object-cover"
              />
            </button>
          ) : null}

          {message.attachment_url && !isImageAttachment && !isAudioAttachment ? (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mb-2 flex items-center gap-2 rounded-lg p-2",
                isOwn ? "bg-black/10" : "bg-background",
              )}
            >
              <FileText className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate underline">
                {message.attachment_name ?? "Attachment"}
              </span>
            </a>
          ) : null}

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                rows={2}
                className="bg-background text-foreground resize-none"
              />
              {actionError ? <p className="text-destructive text-xs">{actionError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(message.content);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="gossip"
                  disabled={isSavingEdit || !editValue.trim()}
                  onClick={handleSaveEdit}
                >
                  {isSavingEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : message.content ? (
            <p className="leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          ) : null}

          {!isEditing && actionError ? (
            <p className="text-destructive mt-1 text-xs">{actionError}</p>
          ) : null}

          {!(isAudioAttachment && !message.content) ? (
            <div
              className={cn(
                "mt-1 flex items-center justify-end gap-1 text-[11px]",
                isOwn ? "text-gossip-foreground/80" : "text-muted-foreground",
              )}
            >
              {message.edited_at ? <span className="italic">edited</span> : null}
              <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
              {isOwn ? (
                isSeen ? (
                  <CheckCheck className="size-3.5 text-[#16A34A]" aria-label="Seen" />
                ) : (
                  <Check className="size-3.5" aria-label="Sent" />
                )
              ) : null}
            </div>
          ) : null}
        </div>
        )}

        {reactions.length > 0 ? (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact?.(message.id, reaction.emoji)}
                aria-pressed={reaction.reactedByMe}
                aria-label={`${reaction.emoji} reaction, ${reaction.count} ${
                  reaction.count === 1 ? "person" : "people"
                }${reaction.reactedByMe ? " including you" : ""}. Tap to toggle your reaction.`}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                  reaction.reactedByMe
                    ? "border-gossip bg-gossip/10"
                    : "border-border bg-background",
                )}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 ? <span className="tabular-nums">{reaction.count}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
    {lightboxOpen && message.attachment_url && isImageAttachment ? (
      <ImageLightbox
        src={message.attachment_url}
        alt={message.attachment_name ?? "Image attachment"}
        onClose={() => setLightboxOpen(false)}
      />
    ) : null}
    </>
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

function attachmentLabel(message: Message): string {
  if (message.attachment_type?.startsWith("image/")) return "📷 Photo";
  if (message.attachment_type?.startsWith("audio/")) return "🎤 Voice message";
  if (message.attachment_url) return `📎 ${message.attachment_name ?? "Attachment"}`;
  return "";
}
