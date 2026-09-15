import { getDisplayName } from "@/lib/chat/format";
import { createClient } from "@/lib/supabase/client";
import type { BlockedUserSummary } from "@/types/chat-ui";
import type { Profile } from "@/types/database";

type ProfilePreview = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export async function blockUser(currentUserId: string, otherUserId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("blocked_users")
    .upsert(
      { blocker_id: currentUserId, blocked_id: otherUserId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function unblockUser(currentUserId: string, otherUserId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", otherUserId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function isUserBlocked(
  currentUserId: string,
  otherUserId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", otherUserId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export async function isBlockedByUser(
  otherUserId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_blocked_by", {
    p_other_user_id: otherUserId,
  });

  if (error) return false;
  return Boolean(data);
}

export async function fetchBlockedUsers(currentUserId: string): Promise<BlockedUserSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id, profiles!blocked_users_blocked_id_fkey(id, username, display_name, avatar_url)")
    .eq("blocker_id", currentUserId);

  if (error || !data) return [];

  return data
    .map((row) => {
      const profile = normalizeProfile(
        row.profiles as ProfilePreview | ProfilePreview[] | null,
      );
      if (!profile) return null;
      return {
        id: profile.id,
        username: profile.username,
        displayName: getDisplayName(profile),
        avatarUrl: profile.avatar_url,
      } satisfies BlockedUserSummary;
    })
    .filter((item): item is BlockedUserSummary => item !== null);
}

function normalizeProfile(
  profile: ProfilePreview | ProfilePreview[] | null | undefined,
): ProfilePreview | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}
