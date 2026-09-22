import { getDisplayName } from "@/lib/chat/format";
import { createClient } from "@/lib/supabase/client";
import type { FriendStatus, FriendSummary, IncomingFriendRequest, UserSearchResult } from "@/types/chat-ui";
import type { FriendRequest, Profile } from "@/types/database";

type ProfilePreview = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

/**
 * Search users by username/display name and annotate each result with the
 * current friend status between the searching user and that result.
 */
export async function searchUsersWithFriendStatus(
  query: string,
  currentUserId: string,
): Promise<UserSearchResult[]> {
  const supabase = createClient();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Escape PostgREST filter syntax special characters (`,`, `(`, `)`, `%`,
  // `_`) so user input can't break out of the ilike pattern or the `.or()`
  // filter list and inject extra conditions.
  const safePattern = `%${escapeForIlike(trimmed)}%`;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", currentUserId)
    .or(`username.ilike.${safePattern},display_name.ilike.${safePattern}`)
    .limit(10);

  if (error || !profiles?.length) return [];

  const { data: blocks } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", currentUserId);
  const blockedIds = new Set((blocks ?? []).map((row) => row.blocked_id));

  const ids = profiles.map((profile) => profile.id);

  const { data: requests } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.in.(${ids.join(",")})),and(receiver_id.eq.${currentUserId},sender_id.in.(${ids.join(",")}))`,
    );

  return (profiles as ProfilePreview[])
    .filter((profile) => !blockedIds.has(profile.id))
    .map((profile) => {
    // If duplicate rows exist for the same pair (shouldn't happen going
    // forward, see the prevent_duplicate_friend_request trigger), prefer the
    // strongest relationship: accepted > pending > anything else.
    const statusRank: Record<string, number> = { accepted: 2, pending: 1 };
    const candidates = (requests ?? []).filter(
      (request) =>
        (request.sender_id === currentUserId && request.receiver_id === profile.id) ||
        (request.receiver_id === currentUserId && request.sender_id === profile.id),
    );
    const relevant = candidates.sort(
      (a, b) => (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0),
    )[0] as Pick<FriendRequest, "id" | "sender_id" | "receiver_id" | "status"> | undefined;

    let friendStatus: FriendStatus = "none";
    if (relevant?.status === "accepted") {
      friendStatus = "friends";
    } else if (relevant?.status === "pending" && relevant.sender_id === currentUserId) {
      friendStatus = "outgoing";
    } else if (relevant?.status === "pending" && relevant.receiver_id === currentUserId) {
      friendStatus = "incoming";
    }

    return {
      id: profile.id,
      username: profile.username,
      displayName: getDisplayName(profile),
      avatarUrl: profile.avatar_url,
      friendStatus,
      requestId: relevant?.id,
    } satisfies UserSearchResult;
  });
}

export async function sendFriendRequest(
  currentUserId: string,
  otherUserId: string,
): Promise<void> {
  const supabase = createClient();

  // Guard against duplicate rows: don't insert a new request if any
  // relationship (pending or accepted) already exists between these users.
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("id, status")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") throw new Error("You're already friends.");
    throw new Error("A friend request is already pending.");
  }

  const { error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: currentUserId, receiver_id: otherUserId });

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchIncomingFriendRequests(
  currentUserId: string,
): Promise<IncomingFriendRequest[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_id, profiles!friend_requests_sender_id_fkey(id, username, display_name, avatar_url)")
    .eq("receiver_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => {
      const profile = normalizeProfile(
        row.profiles as ProfilePreview | ProfilePreview[] | null,
      );
      if (!profile) return null;
      return {
        requestId: row.id,
        id: profile.id,
        username: profile.username,
        displayName: getDisplayName(profile),
        avatarUrl: profile.avatar_url,
      } satisfies IncomingFriendRequest;
    })
    .filter((item): item is IncomingFriendRequest => item !== null);
}

export async function fetchIncomingFriendRequestCount(currentUserId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("friend_requests")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", currentUserId)
    .eq("status", "pending");

  if (error || count == null) return 0;
  return count;
}

export async function fetchFriends(currentUserId: string): Promise<FriendSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      "sender_id, receiver_id, sender:profiles!friend_requests_sender_id_fkey(id, username, display_name, avatar_url), receiver:profiles!friend_requests_receiver_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("status", "accepted")
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

  if (error || !data) return [];

  return data
    .map((row) => {
      const isSender = row.sender_id === currentUserId;
      const profile = normalizeProfile(
        (isSender ? row.receiver : row.sender) as ProfilePreview | ProfilePreview[] | null,
      );
      if (!profile) return null;
      return {
        id: profile.id,
        username: profile.username,
        displayName: getDisplayName(profile),
        avatarUrl: profile.avatar_url,
      } satisfies FriendSummary;
    })
    .filter((item): item is FriendSummary => item !== null);
}

// Escapes characters with meaning inside a PostgREST filter value: `%` and
// `_` are ilike wildcards, `,` `(` `)` `*` delimit `.or()` filter lists.
function escapeForIlike(value: string): string {
  return value.replace(/[%_,()*\\]/g, (char) => `\\${char}`);
}

function normalizeProfile(
  profile: ProfilePreview | ProfilePreview[] | null | undefined,
): ProfilePreview | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}
