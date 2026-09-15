import { createClient } from "@/lib/supabase/server";
import { formatChatListTime, getDisplayName } from "@/lib/chat/format";
import type { ChatListItem } from "@/types/chat-ui";
import type { Database, Message, Profile } from "@/types/database";

type ProfilePreview = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

type MemberWithProfile = {
  conversation_id: string;
  user_id: string;
  profiles: ProfilePreview | ProfilePreview[] | null;
};

export async function getConversationsForUser(userId: string): Promise<ChatListItem[]> {
  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id, pinned_at, muted, hidden_at")
    .eq("user_id", userId);

  if (membershipError || !memberships?.length) {
    return [];
  }

  const visibleMemberships = memberships.filter((row) => !row.hidden_at);
  if (!visibleMemberships.length) return [];

  const myStateByConversation = new Map(
    visibleMemberships.map((row) => [row.conversation_id, row]),
  );
  const conversationIds = visibleMemberships.map((row) => row.conversation_id);

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, type, name, updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (conversationsError || !conversations?.length) {
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id, profiles(id, username, display_name, avatar_url)")
    .in("conversation_id", conversationIds);

  if (membersError || !members) {
    return [];
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id, content, attachment_url, attachment_type, attachment_name, created_at, sender_id")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messagesError) {
    return sortAndStripState(
      mapConversationsWithoutMessages(
        conversations,
        members as MemberWithProfile[],
        userId,
        myStateByConversation,
      ),
    );
  }

  const latestMessageByConversation = new Map<string, Message>();
  for (const message of messages ?? []) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message as Message);
    }
  }

  const items = conversations.map((conversation) => {
    const conversationMembers = (members as MemberWithProfile[]).filter(
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
      isPinned: Boolean(myState?.pinned_at),
      isMuted: Boolean(myState?.muted),
      _pinnedAt: myState?.pinned_at ?? null,
      _updatedAt: lastMessage?.created_at ?? conversation.updated_at,
    };
  });

  return sortAndStripState(items);
}

function sortAndStripState(
  items: (ChatListItem & { _pinnedAt?: string | null; _updatedAt?: string })[],
): ChatListItem[] {
  return items
    .sort((a, b) => {
      if (Boolean(a._pinnedAt) !== Boolean(b._pinnedAt)) {
        return a._pinnedAt ? -1 : 1;
      }
      if (a._pinnedAt && b._pinnedAt) {
        return new Date(b._pinnedAt).getTime() - new Date(a._pinnedAt).getTime();
      }
      return new Date(b._updatedAt ?? 0).getTime() - new Date(a._updatedAt ?? 0).getTime();
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _pinnedAt, _updatedAt, ...item }) => item);
}

export async function getMessagesForConversation(conversationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getConversationParticipant(
  conversationId: string,
  currentUserId: string,
): Promise<ProfilePreview | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversation_members")
    .select("user_id, profiles(id, username, display_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .neq("user_id", currentUserId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeProfile(
    (data as { profiles: ProfilePreview | ProfilePreview[] | null }).profiles,
  );
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

function mapConversationsWithoutMessages(
  conversations: Pick<
    Database["public"]["Tables"]["conversations"]["Row"],
    "id" | "type" | "name" | "updated_at"
  >[],
  members: MemberWithProfile[],
  userId: string,
  myStateByConversation: Map<string, { pinned_at: string | null; muted: boolean }>,
): (ChatListItem & { _pinnedAt?: string | null; _updatedAt?: string })[] {
  return conversations.map((conversation) => {
    const conversationMembers = members.filter(
      (member) => member.conversation_id === conversation.id,
    );
    const isGroup = conversation.type === "group";
    const otherMember = conversationMembers.find((member) => member.user_id !== userId);
    const otherProfile = normalizeProfile(otherMember?.profiles);
    const myState = myStateByConversation.get(conversation.id);

    return {
      id: conversation.id,
      name: isGroup ? (conversation.name ?? "Group") : otherProfile ? getDisplayName(otherProfile) : "Conversation",
      otherUserId: isGroup ? undefined : otherProfile?.id,
      timestamp: formatChatListTime(conversation.updated_at),
      avatarUrl: isGroup ? undefined : otherProfile?.avatar_url,
      isGroup,
      memberCount: isGroup ? conversationMembers.length : undefined,
      isPinned: Boolean(myState?.pinned_at),
      isMuted: Boolean(myState?.muted),
      _pinnedAt: myState?.pinned_at ?? null,
      _updatedAt: conversation.updated_at,
    };
  });
}
