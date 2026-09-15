import { createClient } from "@/lib/supabase/client";

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("message_reads").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Returns the other member's last_read_at for a conversation, or null if
 * they haven't read anything yet.
 */
export async function fetchOtherMemberReadAt(
  conversationId: string,
  currentUserId: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("message_reads")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .neq("user_id", currentUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data.last_read_at;
}
