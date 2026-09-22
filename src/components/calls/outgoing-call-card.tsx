"use client";

import { PhoneOff } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { startOutgoingRingback, stopOutgoingRingback } from "@/lib/audio/ui-sounds";
import type { CallType } from "@/types/database";

interface OutgoingCallCardProps {
  calleeName: string;
  calleeAvatarUrl?: string | null;
  callType: CallType;
  statusLabel?: string;
  onCancel: () => void;
}

export function OutgoingCallCard({
  calleeName,
  calleeAvatarUrl,
  callType,
  statusLabel,
  onCancel,
}: OutgoingCallCardProps) {
  React.useEffect(() => {
    startOutgoingRingback();
    return () => stopOutgoingRingback();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 px-6 py-16 text-white backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 pt-8">
        <span className="text-sm tracking-wide text-white/60">
          {statusLabel ?? `${callType === "video" ? "Video calling" : "Calling"}...`}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <span className="absolute inset-0 -m-3 animate-pulse rounded-full bg-gossip/30" />
          <UserAvatar name={calleeName} avatarUrl={calleeAvatarUrl} size="xl" className="relative" />
        </div>
        <h2 className="text-2xl font-semibold">{calleeName}</h2>
      </div>

      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel call"
        className="flex flex-col items-center gap-2"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition hover:bg-red-500">
          <PhoneOff className="size-7" />
        </span>
        <span className="text-xs text-white/70">Cancel</span>
      </button>
    </div>
  );
}
