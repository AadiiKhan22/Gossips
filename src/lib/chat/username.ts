import { createClient } from "@/lib/supabase/client";
import { normalizeUsername } from "@/lib/validations/profile";

export type UsernameAvailability = "available" | "taken" | "unknown";

/**
 * Checks whether a username is free to take, case-insensitively, ignoring
 * the current user's own row (so re-saving your own unchanged username
 * doesn't falsely report "taken").
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId: string,
): Promise<UsernameAvailability> {
  const normalized = normalizeUsername(username);
  if (!normalized) return "unknown";

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", normalized)
    .neq("id", currentUserId)
    .maybeSingle();

  if (error) return "unknown";
  return data ? "taken" : "available";
}
