import { getDisplayName } from "@/lib/chat/format";
import { createClient } from "@/lib/supabase/client";
import type { CallLogItem } from "@/types/chat-ui";
import type { Call, CallSignalType, CallType, Profile } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ProfilePreview = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

/** Fetch a single profile preview (name/avatar) for call UI. */
export async function fetchCallProfile(userId: string): Promise<ProfilePreview | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Start a new call in a direct conversation. Fails (via the DB's unique
 * index / RLS) if a call is already ringing/active in that conversation,
 * or if either party has blocked the other.
 */
export async function startCall(
  conversationId: string,
  callerId: string,
  calleeId: string,
  callType: CallType,
): Promise<Call> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calls")
    .insert({
      conversation_id: conversationId,
      caller_id: callerId,
      callee_id: calleeId,
      call_type: callType,
      status: "ringing",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to start call.");
  }

  return data;
}

export async function acceptCall(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "accepted" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function declineCall(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "declined" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

/** Caller hangs up before the callee answers. */
export async function cancelCall(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "cancelled" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

/** Ringing call times out with no answer. */
export async function markCallMissed(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "missed" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

/** Either party ends an in-progress call. */
export async function endCall(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "ended" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function markCallFailed(callId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calls").update({ status: "failed" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

/**
 * Send a WebRTC signaling payload (offer / answer / ICE candidate) to the
 * other participant of a call, over a dedicated Supabase Realtime broadcast
 * channel scoped to that call.
 */
export async function sendCallSignal(
  callId: string,
  senderId: string,
  recipientId: string,
  signalType: CallSignalType,
  payload: unknown,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("call_signals").insert({
    call_id: callId,
    sender_id: senderId,
    recipient_id: recipientId,
    signal_type: signalType,
    payload: payload as never,
  });

  if (error) throw new Error(error.message);
}

export type CallSignalPayload = {
  id: string;
  callId: string;
  senderId: string;
  signalType: CallSignalType;
  payload: unknown;
};

/** Subscribe to incoming signaling rows for a specific call. */
export function subscribeToCallSignals(
  callId: string,
  onSignal: (signal: CallSignalPayload) => void,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase
    .channel(`call-signals:${callId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `call_id=eq.${callId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          call_id: string;
          sender_id: string;
          signal_type: CallSignalType;
          payload: unknown;
        };
        onSignal({
          id: row.id,
          callId: row.call_id,
          senderId: row.sender_id,
          signalType: row.signal_type,
          payload: row.payload,
        });
      },
    )
    .subscribe();

  return channel;
}

/** Subscribe to call row updates (e.g. status changes) for a specific call. */
export function subscribeToCallUpdates(
  callId: string,
  onUpdate: (call: Call) => void,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase
    .channel(`call-updates:${callId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      (payload) => onUpdate(payload.new as Call),
    )
    .subscribe();

  return channel;
}

/** Subscribe to newly-inserted calls where the current user is the callee (incoming ring). */
export function subscribeToIncomingCalls(
  userId: string,
  onIncoming: (call: Call) => void,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${userId}` },
      (payload) => onIncoming(payload.new as Call),
    )
    .subscribe();

  return channel;
}

/** Fetch call history (both placed and received) for the current user. */
export async function fetchCallHistory(userId: string): Promise<CallLogItem[]> {
  const supabase = createClient();

  const { data: calls, error } = await supabase
    .from("calls")
    .select("*")
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error || !calls?.length) return [];

  const otherUserIds = Array.from(
    new Set(calls.map((call) => (call.caller_id === userId ? call.callee_id : call.caller_id))),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", otherUserIds);

  const profileById = new Map((profiles as ProfilePreview[] | null)?.map((p) => [p.id, p]));

  return calls.map((call) => {
    const isOutgoing = call.caller_id === userId;
    const otherUserId = isOutgoing ? call.callee_id : call.caller_id;
    const otherProfile = profileById.get(otherUserId);

    return {
      id: call.id,
      conversationId: call.conversation_id,
      otherUserId,
      otherUserName: otherProfile ? getDisplayName(otherProfile) : "Unknown",
      otherUserAvatarUrl: otherProfile?.avatar_url ?? null,
      callType: call.call_type,
      status: call.status,
      direction: isOutgoing ? "outgoing" : "incoming",
      startedAt: call.started_at,
      durationSeconds: call.duration_seconds,
    };
  });
}
