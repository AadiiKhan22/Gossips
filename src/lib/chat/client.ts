import { formatChatListTime, getDisplayName } from "@/lib/chat/format";
import { createClient } from "@/lib/supabase/client";
import type { ChatListItem } from "@/types/chat-ui";
import type { Message, Profile } from "@/types/database";

type ProfilePreview = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

type MemberWithProfile = {
  conversation_id: string;
  user_id: string;
  profiles: ProfilePreview | ProfilePreview[] | null;
};

export async function fetchConversationsClient(userId: string): Promise<ChatListItem[]> {
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, pinned_at, muted, hidden_at")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const visibleMemberships = memberships.filter((row) => !row.hidden_at);
  if (!visibleMemberships.length) return [];

  const myStateByConversation = new Map(
    visibleMemberships.map((row) => [row.conversation_id, row]),
  );
  const conversationIds = visibleMemberships.map((row) => row.conversation_id);

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, type, name, updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (!conversations?.length) return [];

  const { data: members } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id, profiles(id, username, display_name, avatar_url)")
    .in("conversation_id", conversationIds);

  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, content, attachment_url, attachment_type, attachment_name, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const latestMessageByConversation = new Map<string, Message>();
  for (const message of messages ?? []) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message as Message);
    }
  }

  const items = conversations.map((conversation) => {
    const conversationMembers = ((members ?? []) as MemberWithProfile[]).filter(
      (member) => member.conversation_id === conversation.id,
    );
    const isGroup = conversation.type === "group";
    const otherMember = conversationMembers.find((member) => member.user_id !== userId);
    const otherProfile = normalizeProfile(otherMember?.profiles);
    const lastMessage = latestMessageByConversation.get(conversation.id);
    const myState = myStateByConversation.get(conversation.id);

    return {
      id: conversation.id,
      name: isGroup ? (conversation.name ?? "Group") : otherProfile ? getDisplayName(otherProfile) : "Conversation",
      otherUserId: isGroup ? undefined : otherProfile?.id,
      lastMessage: previewTextFor(lastMessage),
      timestamp: lastMessage
        ? formatChatListTime(lastMessage.created_at)
        : formatChatListTime(conversation.updated_at),
      avatarUrl: isGroup ? undefined : otherProfile?.avatar_url,
      isGroup,
      memberCount: isGroup ? conversationMembers.length : undefined,
      memberNames: isGroup
        ? conversationMembers
            .filter((member) => member.user_id !== userId)
            .map((member) => normalizeProfile(member.profiles))
            .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
            .map((profile) => getDisplayName(profile))
        : undefined,
      isPinned: Boolean(myState?.pinned_at),
      isMuted: Boolean(myState?.muted),
      _pinnedAt: myState?.pinned_at ?? null,
      _updatedAt: lastMessage?.created_at ?? conversation.updated_at,
    };
  });

  return items
    .sort((a, b) => {
      if (Boolean(a._pinnedAt) !== Boolean(b._pinnedAt)) {
        return a._pinnedAt ? -1 : 1;
      }
      if (a._pinnedAt && b._pinnedAt) {
        return new Date(b._pinnedAt).getTime() - new Date(a._pinnedAt).getTime();
      }
      return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime();
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _pinnedAt, _updatedAt, ...item }) => item);
}

export async function searchUsers(query: string, currentUserId: string): Promise<ProfilePreview[]> {
  const supabase = createClient();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", currentUserId)
    .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .limit(10);

  if (error || !data) return [];
  return data;
}

export async function startDirectConversation(otherUserId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_user_id: otherUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

export interface ConversationMemberInfo {
  name: string;
  avatarUrl: string | null;
}

export async function fetchConversationMemberNames(
  conversationId: string,
): Promise<Map<string, ConversationMemberInfo>> {
  const supabase = createClient();
  const map = new Map<string, ConversationMemberInfo>();

  const { data, error } = await supabase
    .from("conversation_members")
    .select("user_id, profiles(id, username, display_name, avatar_url)")
    .eq("conversation_id", conversationId);

  if (error || !data) return map;

  for (const row of data as MemberWithProfile[]) {
    const profile = normalizeProfile(row.profiles);
    if (profile) {
      map.set(row.user_id, { name: getDisplayName(profile), avatarUrl: profile.avatar_url ?? null });
    }
  }

  return map;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  attachment?: { url: string; type: string; name: string; durationSeconds?: number },
  replyToMessageId?: string,
): Promise<Message> {
  const supabase = createClient();
  const trimmed = content.trim();
  if (!trimmed && !attachment) {
    throw new Error("Message cannot be empty.");
  }

  const insertPayload = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: trimmed,
    attachment_url: attachment?.url ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_duration_seconds: attachment?.durationSeconds ?? null,
    reply_to_message_id: replyToMessageId ?? null,
  };

  const { data, error } = await supabase.from("messages").insert(insertPayload).select("*").single();

  if (!error && data) {
    return data;
  }

  // A stale/near-expiry auth token can make a single request fail its
  // row-level security check even though the user is legitimately a
  // member of the conversation. Refresh the session once and retry
  // before surfacing an error, since this resolves itself silently most
  // of the time.
  if (error?.code === "42501" || error?.message?.toLowerCase().includes("row-level security")) {
    await supabase.auth.refreshSession();
    const retry = await supabase.from("messages").insert(insertPayload).select("*").single();
    if (!retry.error && retry.data) {
      return retry.data;
    }
    throw new Error(retry.error?.message ?? "Failed to send message.");
  }

  throw new Error(error?.message ?? "Failed to send message.");
}

function normalizeProfile(
  profile: ProfilePreview | ProfilePreview[] | null | undefined,
): ProfilePreview | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

function previewTextFor(message: Message | undefined): string | undefined {
  if (!message) return undefined;
  if (message.content) return message.content;
  if (message.attachment_type?.startsWith("image/")) return "📷 Photo";
  if (message.attachment_type?.startsWith("audio/")) return "🎤 Voice message";
  if (message.attachment_url) return `📎 ${message.attachment_name ?? "Attachment"}`;
  return undefined;
}
