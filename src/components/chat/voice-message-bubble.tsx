"use client";

import { Check, CheckCheck, Mic, Pause, Play } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { formatMessageTime } from "@/lib/chat/format";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  src: string;
  durationSeconds?: number | null;
  createdAt: string;
  isOwn: boolean;
  isSeen?: boolean;
  messageId: string;
  avatarUrl?: string | null;
  senderName?: string;
}

const BAR_COUNT = 27;

export function VoiceMessageBubble({
  src,
  durationSeconds,
  createdAt,
  isOwn,
  isSeen = false,
  messageId,
  avatarUrl,
  senderName,
}: VoiceMessageBubbleProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0..1
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [totalSeconds, setTotalSeconds] = React.useState(durationSeconds ?? 0);

  // Deterministic pseudo-waveform per message so it stays stable on re-render.
  const barHeights = React.useMemo(() => seededBarHeights(messageId, BAR_COUNT), [messageId]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }

  function handleSeek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !totalSeconds) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * totalSeconds;
    setProgress(ratio);
  }

  return (
    <div
      className={cn(
        "bg-gossip flex w-72 max-w-full items-center gap-3 rounded-2xl px-3 py-3 text-white shadow-sm sm:w-80",
        isOwn ? "rounded-br-md" : "rounded-bl-md",
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setElapsedSeconds(0);
        }}
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration) && duration > 0) setTotalSeconds(duration);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setElapsedSeconds(audio.currentTime);
          if (audio.duration) setProgress(audio.currentTime / audio.duration);
        }}
      />

      <div className="relative shrink-0">
        <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-white/20">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={44} height={44} className="size-full object-cover" />
          ) : senderName?.trim() ? (
            <span className="text-sm font-semibold text-white/90">
              {senderName.trim().charAt(0).toUpperCase()}
            </span>
          ) : null}
        </span>
        <Mic className="absolute -bottom-1 -right-1 size-3.5 text-white drop-shadow" />
      </div>

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-white shadow-sm transition hover:bg-white/35"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          onClick={handleSeek}
          role="slider"
          aria-label="Seek voice message"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="flex h-6 w-full cursor-pointer items-center gap-[2px]"
        >
          {barHeights.map((height, index) => {
            const played = index / BAR_COUNT < progress;
            return (
              <span
                key={index}
                style={{ height: `${height}%` }}
                className={cn(
                  "w-[3px] flex-1 rounded-full transition-colors",
                  played ? "bg-white" : "bg-white/35",
                )}
              />
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-white/85">
          <span className="tabular-nums">
            {formatSeconds(isPlaying || elapsedSeconds > 0 ? elapsedSeconds : totalSeconds)}
          </span>
          <span className="flex items-center gap-1">
            <time dateTime={createdAt}>{formatMessageTime(createdAt)}</time>
            {isOwn ? (
              isSeen ? (
                <CheckCheck className="size-3.5 text-[#16A34A]" aria-label="Seen" />
              ) : (
                <Check className="size-3.5" aria-label="Sent" />
              )
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatSeconds(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function seededBarHeights(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const heights: number[] = [];
  let value = hash;
  for (let i = 0; i < count; i++) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    const normalized = (value % 100) / 100;
    heights.push(30 + normalized * 70);
  }
  return heights;
}
