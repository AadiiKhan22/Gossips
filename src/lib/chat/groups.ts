import { createClient } from "@/lib/supabase/client";

export async function createGroupConversation(
  name: string,
  memberIds: string[],
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_group_conversation", {
    p_name: name,
    p_member_ids: memberIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}
