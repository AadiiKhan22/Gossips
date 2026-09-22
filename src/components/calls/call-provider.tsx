"use client";

import * as React from "react";

import { ActiveCallCard } from "@/components/calls/active-call-card";
import { IncomingCallCard } from "@/components/calls/incoming-call-card";
import { OutgoingCallCard } from "@/components/calls/outgoing-call-card";
import {
  acceptCall,
  cancelCall,
  declineCall,
  fetchCallProfile,
  markCallMissed,
  startCall,
  subscribeToCallUpdates,
  subscribeToIncomingCalls,
} from "@/lib/chat/calls";
import { getDisplayName } from "@/lib/chat/format";
import { showIncomingCallNotification } from "@/lib/chat/notifications";
import type { Call, CallType } from "@/types/database";

const RING_TIMEOUT_MS = 30_000;

type OtherPartyInfo = { name: string; avatarUrl: string | null };

interface CallContextValue {
  /** The call currently connected/in-progress (accepted by both sides). Consumed by the in-call screen. */
  activeCall: (Call & { otherParty: OtherPartyInfo; isCaller: boolean }) | null;
  clearActiveCall: () => void;
  placeCall: (conversationId: string, calleeId: string, callType: CallType) => Promise<void>;
}

const CallContext = React.createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const ctx = React.useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

interface CallProviderProps {
  currentUserId: string;
  onlineUserIds?: Set<string>;
  children: React.ReactNode;
}

export function CallProvider({ currentUserId, onlineUserIds, children }: CallProviderProps) {
  const [incomingCall, setIncomingCall] = React.useState<Call | null>(null);
  const [incomingCaller, setIncomingCaller] = React.useState<OtherPartyInfo | null>(null);
  const [outgoingIsRinging, setOutgoingIsRinging] = React.useState(false);

  const [outgoingCall, setOutgoingCall] = React.useState<Call | null>(null);
  const [outgoingCallee, setOutgoingCallee] = React.useState<OtherPartyInfo | null>(null);

  const [activeCall, setActiveCall] = React.useState<CallContextValue["activeCall"]>(null);

  const ringTimeoutRef = React.useRef<number | null>(null);

  const clearRingTimeout = React.useCallback(() => {
    if (ringTimeoutRef.current) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  // Listen app-wide for calls placed to this user.
  React.useEffect(() => {
    const channel = subscribeToIncomingCalls(currentUserId, async (call) => {
      const caller = await fetchCallProfile(call.caller_id);
      const callerName = caller ? getDisplayName(caller) : "Unknown";
      setIncomingCall(call);
      setIncomingCaller({
        name: callerName,
        avatarUrl: caller?.avatar_url ?? null,
      });

      showIncomingCallNotification({
        callerName,
        callType: call.call_type,
        avatarUrl: caller?.avatar_url ?? null,
      });

      clearRingTimeout();
      ringTimeoutRef.current = window.setTimeout(() => {
        markCallMissed(call.id).catch(() => {});
        setIncomingCall(null);
        setIncomingCaller(null);
      }, RING_TIMEOUT_MS);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, clearRingTimeout]);

  // Watch the outgoing call's status (declined / accepted / cancelled elsewhere).
  React.useEffect(() => {
    if (!outgoingCall) return;

    const channel = subscribeToCallUpdates(outgoingCall.id, (updated) => {
      if (updated.status === "accepted") {
        clearRingTimeout();
        if (outgoingCallee) {
          setActiveCall({ ...updated, otherParty: outgoingCallee, isCaller: true });
        }
        setOutgoingCall(null);
        setOutgoingCallee(null);
      } else if (["declined", "missed", "cancelled", "failed", "ended"].includes(updated.status)) {
        clearRingTimeout();
        setOutgoingCall(null);
        setOutgoingCallee(null);
      }
    });

    ringTimeoutRef.current = window.setTimeout(() => {
      markCallMissed(outgoingCall.id).catch(() => {});
      setOutgoingCall(null);
      setOutgoingCallee(null);
    }, RING_TIMEOUT_MS);

    return () => {
      channel.unsubscribe();
      clearRingTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outgoingCall?.id]);

  const placeCall = React.useCallback(
    async (conversationId: string, calleeId: string, callType: CallType) => {
      setOutgoingIsRinging(Boolean(onlineUserIds?.has(calleeId)));

      const [callee, call] = await Promise.all([
        fetchCallProfile(calleeId),
        startCall(conversationId, currentUserId, calleeId, callType),
      ]);

      setOutgoingCallee({
        name: callee ? getDisplayName(callee) : "Unknown",
        avatarUrl: callee?.avatar_url ?? null,
      });
      setOutgoingCall(call);
    },
    [currentUserId, onlineUserIds],
  );

  async function handleAccept() {
    if (!incomingCall || !incomingCaller) return;
    clearRingTimeout();
    await acceptCall(incomingCall.id).catch(() => {});
    setActiveCall({ ...incomingCall, status: "accepted", otherParty: incomingCaller, isCaller: false });
    setIncomingCall(null);
    setIncomingCaller(null);
  }

  async function handleDecline() {
    if (!incomingCall) return;
    clearRingTimeout();
    await declineCall(incomingCall.id).catch(() => {});
    setIncomingCall(null);
    setIncomingCaller(null);
  }

  async function handleCancelOutgoing() {
    if (!outgoingCall) return;
    clearRingTimeout();
    await cancelCall(outgoingCall.id).catch(() => {});
    setOutgoingCall(null);
    setOutgoingCallee(null);
  }

  const clearActiveCall = React.useCallback(() => setActiveCall(null), []);

  return (
    <CallContext.Provider value={{ activeCall, clearActiveCall, placeCall }}>
      {children}

      {incomingCall && incomingCaller ? (
        <IncomingCallCard
          callerName={incomingCaller.name}
          callerAvatarUrl={incomingCaller.avatarUrl}
          callType={incomingCall.call_type}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      ) : null}

      {outgoingCall && outgoingCallee ? (
        <OutgoingCallCard
          calleeName={outgoingCallee.name}
          calleeAvatarUrl={outgoingCallee.avatarUrl}
          callType={outgoingCall.call_type}
          statusLabel={outgoingIsRinging ? "Ringing..." : "Calling..."}
          onCancel={handleCancelOutgoing}
        />
      ) : null}

      {activeCall ? (
        <ActiveCallCard
          call={activeCall}
          isCaller={activeCall.isCaller}
          currentUserId={currentUserId}
          otherUserId={activeCall.isCaller ? activeCall.callee_id : activeCall.caller_id}
          otherUserName={activeCall.otherParty.name}
          otherUserAvatarUrl={activeCall.otherParty.avatarUrl}
          onEnded={clearActiveCall}
        />
      ) : null}
    </CallContext.Provider>
  );
}
