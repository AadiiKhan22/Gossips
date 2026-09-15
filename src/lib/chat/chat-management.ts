import { createClient } from "@/lib/supabase/client";

export async function togglePinConversation(
  conversationId: string,
  userId: string,
  pin: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ pinned_at: pin ? new Date().toISOString() : null })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function toggleMuteConversation(
  conversationId: string,
  userId: string,
  muted: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ muted })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * "Delete chat" -- hides the conversation from this user's own list.
 * Reversible: it reappears automatically for everyone if a new message
 * is sent in it later (handled by a database trigger).
 */
export async function hideConversation(conversationId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ hidden_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * "Leave group" -- actually removes the user's membership row. Only
 * intended for group conversations; direct chats should use
 * hideConversation instead, since direct pairing logic assumes exactly
 * two membership rows always exist.
 */
export async function leaveGroupConversation(conversationId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
