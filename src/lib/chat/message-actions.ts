import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export async function editMessage(messageId: string, content: string): Promise<Message> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to edit message.");
  }

  return data;
}

export async function deleteMessage(messageId: string): Promise<Message> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({
      content: "",
      attachment_url: null,
      attachment_type: null,
      attachment_name: null,
      attachment_duration_seconds: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to delete message.");
  }

  return data;
}

export async function forwardMessage(
  source: Message,
  targetConversationId: string,
  senderId: string,
): Promise<Message> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: targetConversationId,
      sender_id: senderId,
      content: source.content,
      attachment_url: source.attachment_url,
      attachment_type: source.attachment_type,
      attachment_name: source.attachment_name,
      attachment_duration_seconds: source.attachment_duration_seconds,
      is_forwarded: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to forward message.");
  }

  return data;
}
