import { createClient } from "@/lib/supabase/client";
import type { MessageReaction } from "@/types/database";

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

/**
 * Tapping the same emoji you already reacted with removes it. Tapping a
 * different emoji replaces your previous reaction on that message (one
 * reaction per user per message, matching the table's primary key).
 */
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("message_reactions")
    .upsert(
      { message_id: messageId, user_id: userId, emoji },
      { onConflict: "message_id,user_id" },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchReactionsForMessages(
  messageIds: string[],
  currentUserId: string,
): Promise<Map<string, ReactionSummary[]>> {
  const map = new Map<string, ReactionSummary[]>();
  if (messageIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);

  if (error || !data) return map;

  const grouped = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();

  for (const reaction of data as Pick<MessageReaction, "message_id" | "user_id" | "emoji">[]) {
    if (!grouped.has(reaction.message_id)) {
      grouped.set(reaction.message_id, new Map());
    }
    const byEmoji = grouped.get(reaction.message_id)!;
    const entry = byEmoji.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (reaction.user_id === currentUserId) entry.reactedByMe = true;
    byEmoji.set(reaction.emoji, entry);
  }

  for (const [messageId, byEmoji] of grouped) {
    map.set(
      messageId,
      Array.from(byEmoji.entries()).map(([emoji, { count, reactedByMe }]) => ({
        emoji,
        count,
        reactedByMe,
      })),
    );
  }

  return map;
}
