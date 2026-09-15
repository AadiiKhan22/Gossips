"use client";

import { Mic, Paperclip, Reply, Send, Trash2, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceRecorder } from "@/lib/chat/use-voice-recorder";
import { uploadChatMedia, type ChatAttachment } from "@/lib/storage/chat-media";
import type { Message } from "@/types/database";

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, attachment?: ChatAttachment, replyToMessageId?: string) => Promise<void>;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
  onStoppedTyping?: () => void;
}

const MAX_LENGTH = 5000;

export function MessageComposer({
  conversationId,
  onSend,
  disabled = false,
  replyingTo = null,
  onCancelReply,
  onTyping,
  onStoppedTyping,
}: MessageComposerProps) {
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const recorder = useVoiceRecorder();

  const selectedPreviewUrl = React.useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  React.useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  React.useEffect(() => {
    if (recorder.error) setError(recorder.error);
  }, [recorder.error]);

  function handleFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (file) setSelectedFile(file);
    event.target.value = "";
  }

  async function sendAttachment(file: File, durationSeconds?: number) {
    setIsSending(true);
    try {
      setIsUploading(true);
      const attachment = await uploadChatMedia(file, conversationId, durationSeconds);
      setIsUploading(false);
      await onSend("", attachment, replyingTo?.id);
      setSelectedFile(null);
      onCancelReply?.();
      onStoppedTyping?.();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  }

  async function handleStopRecording() {
    const recorded = await recorder.stop();
    if (recorded) {
      await sendAttachment(recorded.file, recorded.durationSeconds);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed && !selectedFile) {
      setError("Type a message or attach a file before sending.");
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`Message must be ${MAX_LENGTH} characters or fewer.`);
      return;
    }

    setIsSending(true);

    try {
      let attachment: ChatAttachment | undefined;

      if (selectedFile) {
        setIsUploading(true);
        attachment = await uploadChatMedia(selectedFile, conversationId);
        setIsUploading(false);
      }

      await onSend(trimmed, attachment, replyingTo?.id);
      setContent("");
      setSelectedFile(null);
      onCancelReply?.();
      onStoppedTyping?.();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const busy = disabled || isSending;
  const isRecording = recorder.status === "recording";

  function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/70 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm"
    >
      {error ? <p className="text-destructive mb-2 text-sm">{error}</p> : null}

      {replyingTo ? (
        <div className="bg-muted border-gossip mb-2 flex items-center gap-2 rounded-lg border-l-2 p-2">
          <Reply className="text-gossip size-4 shrink-0" />
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            {replyingTo.content || attachmentPreviewLabel(replyingTo)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      {selectedFile ? (
        <div className="bg-muted mb-2 flex items-center gap-2 rounded-lg p-2">
          {selectedPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedPreviewUrl}
              alt="Selected attachment preview"
              className="size-10 shrink-0 rounded object-cover"
            />
          ) : (
            <Paperclip className="text-muted-foreground size-5 shrink-0" />
          )}
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            {selectedFile.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setSelectedFile(null)}
            aria-label="Remove attachment"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      {isRecording ? (
        <div className="border-gossip/30 bg-gossip/5 mb-2 flex items-center gap-3 rounded-full border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive size-9 shrink-0 rounded-full hover:bg-destructive/10"
            onClick={recorder.cancel}
            aria-label="Cancel recording"
          >
            <Trash2 className="size-4" />
          </Button>

          <span className="bg-destructive size-2.5 shrink-0 animate-pulse rounded-full" />

          <span className="text-foreground min-w-10 flex-1 text-sm font-medium tabular-nums">
            {formatDuration(recorder.elapsedSeconds)}
          </span>

          <Button
            type="button"
            variant="gossip"
            size="icon"
            className="size-9 shrink-0 rounded-full shadow-sm"
            onClick={handleStopRecording}
            aria-label="Send voice message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFilePick}
            aria-hidden="true"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip className="size-4" />
          </Button>
          <Textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (event.target.value.trim()) {
                onTyping?.();
              } else {
                onStoppedTyping?.();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={busy}
            aria-label="Message input"
            className="max-h-32 min-h-10 resize-none"
          />
          {content.trim() || selectedFile ? (
            <Button
              type="submit"
              variant="gossip"
              size="icon"
              disabled={busy || (!content.trim() && !selectedFile)}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy}
              onClick={recorder.start}
              aria-label="Record voice message"
            >
              <Mic className="size-4" />
            </Button>
          )}
        </div>
      )}

      {isUploading ? (
        <p className="text-muted-foreground mt-2 text-xs">Uploading...</p>
      ) : null}
    </form>
  );
}

function attachmentPreviewLabel(message: Message): string {
  if (message.attachment_type?.startsWith("image/")) return "📷 Photo";
  if (message.attachment_type?.startsWith("audio/")) return "🎤 Voice message";
  if (message.attachment_url) return `📎 ${message.attachment_name ?? "Attachment"}`;
  return "";
}
