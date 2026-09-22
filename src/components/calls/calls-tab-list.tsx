"use client";

import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import * as React from "react";

import { useCallContext } from "@/components/calls/call-provider";
import { UserAvatar } from "@/components/chat/user-avatar";
import { fetchCallHistory } from "@/lib/chat/calls";
import { startDirectConversation } from "@/lib/chat/client";
import { cn } from "@/lib/utils";
import type { CallLogItem } from "@/types/chat-ui";

interface CallsTabListProps {
  currentUserId: string;
  className?: string;
}

type CallFilter = "all" | "missed" | "outgoing" | "incoming";

export function CallsTabList({ currentUserId, className }: CallsTabListProps) {
  const { placeCall } = useCallContext();
  const [calls, setCalls] = React.useState<CallLogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<CallFilter>("all");

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
    void fetchCallHistory(currentUserId)
      .then(setCalls)
      .catch(() => setError("Failed to load call history."))
      .finally(() => setIsLoading(false));
  }, [currentUserId]);

  async function handleCallBack(item: CallLogItem, callType: "audio" | "video") {
    const conversationId = item.conversationId || (await startDirectConversation(item.otherUserId));
    await placeCall(conversationId, item.otherUserId, callType);
  }

  const filteredCalls = React.useMemo(() => {
    if (filter === "all") return calls;
    if (filter === "missed") {
      return calls.filter(
        (item) => item.direction === "incoming" && (item.status === "missed" || item.status === "declined"),
      );
    }
    return calls.filter((item) => item.direction === filter);
  }, [calls, filter]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-5 border-b border-border/70 px-4 pb-2 pt-1">
        {(
          [
            { key: "all", label: "All" },
            { key: "missed", label: "Missed" },
            { key: "outgoing", label: "Outgoing" },
            { key: "incoming", label: "Incoming" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "relative pb-2 text-sm font-medium transition-colors",
              filter === tab.key ? "text-gossip" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {filter === tab.key ? (
              <span className="bg-gossip absolute inset-x-0 -bottom-px h-0.5 rounded-full" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {error ? <p className="text-destructive px-2 py-2 text-sm">{error}</p> : null}

        {isLoading ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">Loading...</p>
        ) : null}

        {!isLoading && filteredCalls.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">No calls yet.</p>
        ) : null}

        <ul className="space-y-1">
          {filteredCalls.map((item) => {
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
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      aria-label={`Voice call ${item.otherUserName}`}
                      onClick={() => handleCallBack(item, "audio")}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full text-white shadow-sm transition hover:brightness-110",
                        isMissedOrDeclined ? "bg-destructive" : "bg-[#16a34a]",
                      )}
                    >
                      <Phone className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Video call ${item.otherUserName}`}
                      onClick={() => handleCallBack(item, "video")}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full text-white shadow-sm transition hover:brightness-110",
                        isMissedOrDeclined ? "bg-destructive" : "bg-[#16a34a]",
                      )}
                    >
                      <Video className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
