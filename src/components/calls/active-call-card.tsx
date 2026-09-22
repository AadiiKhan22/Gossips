"use client";

import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "@/components/chat/user-avatar";
import { endCall } from "@/lib/chat/calls";
import { useWebRTCCall } from "@/lib/chat/use-webrtc-call";
import { cn } from "@/lib/utils";
import type { Call } from "@/types/database";

interface ActiveCallCardProps {
  call: Call;
  isCaller: boolean;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  onEnded: () => void;
}

export function ActiveCallCard({
  call,
  isCaller,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserAvatarUrl,
  onEnded,
}: ActiveCallCardProps) {
  const isVideoCall = call.call_type === "video";
  const [isSpeakerOn, setIsSpeakerOn] = React.useState(true);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const endedRef = React.useRef(false);

  const {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    hangUp,
  } = useWebRTCCall({
    call,
    isCaller,
    currentUserId,
    otherUserId,
    onCallStatusChange: (updated) => {
      console.log("Gossips call: DB status update ->", updated.status, updated);
      if (endedRef.current) return;
      if (["ended", "declined", "cancelled", "missed", "failed"].includes(updated.status)) {
        console.log("Gossips call: ending screen due to status", updated.status);
        endedRef.current = true;
        onEnded();
      }
    },
  });

  React.useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  React.useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !isSpeakerOn;
  }, [isSpeakerOn]);

  React.useEffect(() => {
    if (connectionState !== "connected") return;
    const interval = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [connectionState]);

  async function handleEndCall() {
    if (endedRef.current) return;
    console.log("Gossips call: local user clicked End Call");
    endedRef.current = true;
    hangUp();
    await endCall(call.id).catch(() => {});
    onEnded();
  }

  const statusLabel =
    connectionState === "connecting"
      ? "Connecting..."
      : connectionState === "connected"
        ? formatDuration(elapsedSeconds)
        : connectionState === "disconnected"
          ? "Reconnecting..."
          : connectionState === "failed"
            ? "Call failed"
            : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {isVideoCall ? (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
          {!remoteStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
              <UserAvatar name={otherUserName} avatarUrl={otherUserAvatarUrl} size="xl" />
            </div>
          ) : null}

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute top-6 right-6 h-40 w-28 rounded-xl border border-white/20 object-cover shadow-lg",
              isCameraOff && "hidden",
            )}
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <UserAvatar name={otherUserName} avatarUrl={otherUserAvatarUrl} size="xl" />
          <h2 className="text-2xl font-semibold">{otherUserName}</h2>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay className={isVideoCall ? "hidden" : undefined} />

      <div className="relative z-10 flex flex-col items-center gap-1 bg-gradient-to-b from-black/60 to-transparent px-6 pt-6 pb-4">
        {isVideoCall ? <h2 className="text-lg font-semibold">{otherUserName}</h2> : null}
        <span className="text-sm text-white/70">{statusLabel}</span>
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-center gap-6 bg-gradient-to-t from-black/70 to-transparent px-6 pb-10 pt-8">
        <ControlButton
          active={!isMuted}
          onClick={toggleMute}
          label={isMuted ? "Unmute" : "Mute"}
          icon={isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        />

        <ControlButton
          active={isSpeakerOn}
          onClick={() => setIsSpeakerOn((prev) => !prev)}
          label={isSpeakerOn ? "Speaker" : "Speaker off"}
          icon={isSpeakerOn ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
        />

        {isVideoCall ? (
          <ControlButton
            active={!isCameraOff}
            onClick={toggleCamera}
            label={isCameraOff ? "Start video" : "Stop video"}
            icon={isCameraOff ? <VideoOff className="size-6" /> : <Video className="size-6" />}
          />
        ) : null}

        <button
          type="button"
          onClick={handleEndCall}
          aria-label="End call"
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition hover:bg-red-500">
            <PhoneOff className="size-7" />
          </span>
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full shadow-lg transition",
          active ? "bg-white/15 hover:bg-white/25" : "bg-white text-black hover:bg-white/90",
        )}
      >
        {icon}
      </span>
    </button>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
