"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

// Safety net only -- clears a stuck indicator if a "stopped" signal never
// arrives (e.g. the sender's tab closed or lost connection mid-draft).
// Under normal use, the indicator is cleared explicitly by sendStoppedTyping,
// not by this timeout.
const TYPING_SAFETY_TIMEOUT_MS = 15000;
const TYPING_THROTTLE_MS = 2000;

/**
 * Ephemeral "is typing" broadcast scoped to one conversation. Nothing is
 * persisted -- it's a live signal only. The indicator stays on for as long
 * as the other person has a draft (even through pauses) and clears the
 * moment they send the message or clear their draft.
 */
export function useTypingIndicator(conversationId: string | null, userId: string) {
  const [typingUserIds, setTypingUserIds] = React.useState<Set<string>>(new Set());
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const isReadyRef = React.useRef(false);
  const safetyTimeoutsRef = React.useRef<Map<string, number>>(new Map());
  const lastSentAtRef = React.useRef<number>(0);

  const clearTypingUser = React.useCallback((typingUserId: string) => {
    setTypingUserIds((previous) => {
      if (!previous.has(typingUserId)) return previous;
      const next = new Set(previous);
      next.delete(typingUserId);
      return next;
    });

    const existing = safetyTimeoutsRef.current.get(typingUserId);
    if (existing) {
      window.clearTimeout(existing);
      safetyTimeoutsRef.current.delete(typingUserId);
    }
  }, []);

  React.useEffect(() => {
    setTypingUserIds(new Set());
    channelRef.current = null;
    isReadyRef.current = false;

    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (message) => {
        const payload = message.payload as { userId?: string };
        const typingUserId = payload.userId;
        if (!typingUserId || typingUserId === userId) return;

        setTypingUserIds((previous) => new Set(previous).add(typingUserId));

        const existing = safetyTimeoutsRef.current.get(typingUserId);
        if (existing) window.clearTimeout(existing);

        const timeout = window.setTimeout(() => {
          clearTypingUser(typingUserId);
        }, TYPING_SAFETY_TIMEOUT_MS);
        safetyTimeoutsRef.current.set(typingUserId, timeout);
      })
      .on("broadcast", { event: "stopped_typing" }, (message) => {
        const payload = message.payload as { userId?: string };
        const typingUserId = payload.userId;
        if (!typingUserId) return;
        clearTypingUser(typingUserId);
      })
      .subscribe((status) => {
        isReadyRef.current = status === "SUBSCRIBED";
      });

    const safetyTimeouts = safetyTimeoutsRef.current;

    return () => {
      isReadyRef.current = false;
      void supabase.removeChannel(channel);
      safetyTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      safetyTimeouts.clear();
    };
  }, [conversationId, userId, clearTypingUser]);

  const sendTyping = React.useCallback(() => {
    if (!isReadyRef.current || !channelRef.current) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < TYPING_THROTTLE_MS) return;
    lastSentAtRef.current = now;

    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  const sendStoppedTyping = React.useCallback(() => {
    if (!channelRef.current) return;

    // Bypass the throttle -- "stopped" should always go out immediately.
    lastSentAtRef.current = 0;

    void channelRef.current.send({
      type: "broadcast",
      event: "stopped_typing",
      payload: { userId },
    });
  }, [userId]);

  return { typingUserIds, sendTyping, sendStoppedTyping };
}
