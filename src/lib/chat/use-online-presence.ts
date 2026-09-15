"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Tracks who is currently online across the whole app using a single
 * shared presence channel. No database table involved -- presence state
 * lives only in the realtime connection and clears automatically when a
 * user disconnects (closes the tab, loses network, etc).
 */
export function useOnlinePresence(userId: string): Set<string> {
  const [onlineUserIds, setOnlineUserIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return onlineUserIds;
}
