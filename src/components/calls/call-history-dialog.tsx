"use client";

import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import * as React from "react";

import { useCallContext } from "@/components/calls/call-provider";
import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { fetchCallHistory } from "@/lib/chat/calls";
import { startDirectConversation } from "@/lib/chat/client";
import { useDialogA11y } from "@/lib/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import type { CallLogItem } from "@/types/chat-ui";

interface CallHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export function CallHistoryDialog({ open, onOpenChange, currentUserId }: CallHistoryDialogProps) {
  const { placeCall } = useCallContext();
  const [calls, setCalls] = React.useState<CallLogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useDialogA11y(open, onOpenChange, dialogRef);

  React.useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setError(null);
    void fetchCallHistory(currentUserId)
      .then(setCalls)
      .catch(() => setError("Failed to load call history."))
      .finally(() => setIsLoading(false));
  }, [open, currentUserId]);

  async function handleCallBack(item: CallLogItem, callType: "audio" | "video") {
    onOpenChange(false);
    const conversationId = item.conversationId || (await startDirectConversation(item.otherUserId));
    await placeCall(conversationId, item.otherUserId, callType);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-history-title"
        className="bg-background w-full max-w-md overflow-hidden rounded-xl border border-border/80 shadow-xl"
      >
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="call-history-title" className="text-lg font-semibold">
              Calls
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

          {isLoading ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">Loading...</p>
          ) : null}

          {!isLoading && calls.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">No calls yet.</p>
          ) : null}

          <ul className="space-y-1">
            {calls.map((item) => {
              const isMissedOrDeclined =
                (item.direction === "incoming" && (item.status === "missed" || item.status === "declined")) ||
                item.status === "failed";

              return (
                <li key={item.id}>
                  <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2">
                    <UserAvatar name={item.otherUserName} avatarUrl={item.otherUserAvatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.otherUserName}</p>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          isMissedOrDeclined ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        <CallDirectionIcon item={item} />
                        <span>{describeCall(item)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Voice call ${item.otherUserName}`}
                        onClick={() => handleCallBack(item, "audio")}
                      >
                        <Phone className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Video call ${item.otherUserName}`}
                        onClick={() => handleCallBack(item, "video")}
                      >
                        <Video className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CallDirectionIcon({ item }: { item: CallLogItem }) {
  if (item.direction === "incoming" && (item.status === "missed" || item.status === "declined")) {
    return <PhoneMissed className="size-3.5" />;
  }
  if (item.direction === "outgoing") return <PhoneOutgoing className="size-3.5" />;
  return <PhoneIncoming className="size-3.5" />;
}

function describeCall(item: CallLogItem): string {
  const kind = item.callType === "video" ? "Video" : "Voice";
  const when = formatWhen(item.startedAt);

  if (item.status === "missed") return `Missed ${kind.toLowerCase()} call · ${when}`;
  if (item.status === "declined") return `Declined · ${when}`;
  if (item.status === "failed") return `Failed · ${when}`;
  if (item.status === "cancelled") return `Cancelled · ${when}`;
  if (item.durationSeconds > 0) return `${kind} · ${formatDuration(item.durationSeconds)} · ${when}`;
  return `${kind} call · ${when}`;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
