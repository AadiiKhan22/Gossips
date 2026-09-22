"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  markCallFailed,
  sendCallSignal,
  subscribeToCallSignals,
  subscribeToCallUpdates,
} from "@/lib/chat/calls";
import type { Call, CallSignalType } from "@/types/database";

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let cachedIceServersPromise: Promise<RTCIceServer[]> | null = null;

/** Fetch fresh TURN/STUN credentials from our server route (Metered), with a STUN-only fallback. */
function getIceServers(): Promise<RTCIceServer[]> {
  if (!cachedIceServersPromise) {
    cachedIceServersPromise = fetch("/api/turn-credentials")
      .then((res) => res.json())
      .then((data: { iceServers?: RTCIceServer[] }) => data.iceServers ?? FALLBACK_ICE_SERVERS)
      .catch(() => FALLBACK_ICE_SERVERS);
  }
  return cachedIceServersPromise;
}

export type CallConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

interface UseWebRTCCallOptions {
  call: Call | null;
  /** True if the local user placed the call (creates the SDP offer). */
  isCaller: boolean;
  currentUserId: string;
  otherUserId: string;
  /** Called when the call's DB row changes status (e.g. remote hangup). */
  onCallStatusChange?: (call: Call) => void;
}

interface UseWebRTCCallResult {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: CallConnectionState;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  hangUp: () => void;
}

/**
 * Owns the RTCPeerConnection + local/remote media for a single active call.
 * Signaling (SDP offer/answer, ICE candidates) is exchanged via the
 * `call_signals` table over Supabase Realtime (see lib/chat/calls.ts).
 */
export function useWebRTCCall({
  call,
  isCaller,
  currentUserId,
  otherUserId,
  onCallStatusChange,
}: UseWebRTCCallOptions): UseWebRTCCallResult {
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = React.useState<CallConnectionState>("idle");
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(false);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = React.useRef<RealtimeChannel | null>(null);
  const statusChannelRef = React.useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = React.useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = React.useRef(false);
  const cleanedUpRef = React.useRef(false);

  const sendSignal = React.useCallback(
    (signalType: CallSignalType, payload: unknown) => {
      if (!call) return;
      sendCallSignal(call.id, currentUserId, otherUserId, signalType, payload).catch(() => {
        // Best-effort: a dropped signal will surface as a connection timeout.
      });
    },
    [call, currentUserId, otherUserId],
  );

  React.useEffect(() => {
    if (!call) return;
    cleanedUpRef.current = false;

    let cancelled = false;

    async function setup() {
      setConnectionState("connecting");

      // Subscribe to status updates FIRST, independent of local media, so a
      // remote hangup/decline is always received even if getUserMedia fails
      // below (e.g. insecure origin, permission denied, no device).
      statusChannelRef.current = subscribeToCallUpdates(call!.id, (updated) => {
        onCallStatusChange?.(updated);
      });

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: call!.call_type === "video",
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaError) {
        if (!cancelled) {
          console.error("Gossips call: getUserMedia failed", mediaError);
          setConnectionState("failed");
          markCallFailed(call!.id).catch(() => {});
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setLocalStream(stream);

      const iceServers = await getIceServers();
      console.log("Gossips call: using ICE servers", iceServers);
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0] ?? null);
      };

      pc.onconnectionstatechange = () => {
        console.log("Gossips call: connectionState ->", pc.connectionState);
        if (cancelled) return;
        if (pc.connectionState === "connected") setConnectionState("connected");
        else if (pc.connectionState === "disconnected") setConnectionState("disconnected");
        else if (pc.connectionState === "failed") setConnectionState("failed");
      };

      pc.oniceconnectionstatechange = () => {
        console.log("Gossips call: iceConnectionState ->", pc.iceConnectionState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Gossips call: local ICE candidate", event.candidate.type, event.candidate.protocol);
          sendSignal("ice-candidate", event.candidate.toJSON());
        } else {
          console.log("Gossips call: ICE gathering complete");
        }
      };

      signalChannelRef.current = subscribeToCallSignals(call!.id, async (signal) => {
        if (signal.senderId === currentUserId) return;
        const pcNow = pcRef.current;
        if (!pcNow) return;

        if (signal.signalType === "offer" && !isCaller) {
          await pcNow.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit),
          );
          hasRemoteDescriptionRef.current = true;
          await flushPendingCandidates(pcNow);

          const answer = await pcNow.createAnswer();
          await pcNow.setLocalDescription(answer);
          sendSignal("answer", answer);
        } else if (signal.signalType === "answer" && isCaller) {
          await pcNow.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit),
          );
          hasRemoteDescriptionRef.current = true;
          await flushPendingCandidates(pcNow);
        } else if (signal.signalType === "ice-candidate") {
          const candidateInit = signal.payload as RTCIceCandidateInit;
          if (hasRemoteDescriptionRef.current) {
            await pcNow.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
          } else {
            pendingCandidatesRef.current.push(candidateInit);
          }
        }
      });

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", offer);
      }
    }

    async function flushPendingCandidates(pc: RTCPeerConnection) {
      const queued = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.id]);

  function cleanup() {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    pcRef.current?.close();
    pcRef.current = null;

    localStream?.getTracks().forEach((track) => track.stop());

    signalChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;
    statusChannelRef.current?.unsubscribe();
    statusChannelRef.current = null;

    hasRemoteDescriptionRef.current = false;
    pendingCandidatesRef.current = [];

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  const toggleMute = React.useCallback(() => {
    if (!localStream) return;
    const nextMuted = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [localStream, isMuted]);

  const toggleCamera = React.useCallback(() => {
    if (!localStream) return;
    const nextOff = !isCameraOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsCameraOff(nextOff);
  }, [localStream, isCameraOff]);

  const hangUp = React.useCallback(() => {
    cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    hangUp,
  };
}
