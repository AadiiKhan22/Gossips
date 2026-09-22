"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { startIncomingRingtone, stopIncomingRingtone } from "@/lib/audio/ui-sounds";
import type { CallType } from "@/types/database";

interface IncomingCallCardProps {
  callerName: string;
  callerAvatarUrl?: string | null;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallCard({
  callerName,
  callerAvatarUrl,
  callType,
  onAccept,
  onDecline,
}: IncomingCallCardProps) {
  React.useEffect(() => {
    startIncomingRingtone();
    return () => stopIncomingRingtone();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 px-6 py-16 text-white backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 pt-8">
        <span className="text-sm tracking-wide text-white/60">
          Incoming {callType === "video" ? "video" : "voice"} call
        </span>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-gossip/40" />
          <UserAvatar name={callerName} avatarUrl={callerAvatarUrl} size="xl" className="relative" />
        </div>
        <h2 className="text-2xl font-semibold">{callerName}</h2>
      </div>

      <div className="flex w-full max-w-xs items-center justify-between">
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline call"
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition hover:bg-red-500">
            <PhoneOff className="size-7" />
          </span>
          <span className="text-xs text-white/70">Decline</span>
        </button>

        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept call"
          className="flex flex-col items-center gap-2"
        >
          <span className="bg-gossip flex size-16 items-center justify-center rounded-full shadow-lg transition hover:brightness-110">
            {callType === "video" ? <Video className="size-7" /> : <Phone className="size-7" />}
          </span>
          <span className="text-xs text-white/70">Accept</span>
        </button>
      </div>
    </div>
  );
}
