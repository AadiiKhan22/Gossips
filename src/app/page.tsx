import { redirect } from "next/navigation";

import { ChatApp } from "@/components/chat/chat-app";
import { getUserWithProfile } from "@/lib/auth/get-user";
import { getConversationsForUser } from "@/lib/chat/conversations";
import type { ChatUserSummary } from "@/types/chat-ui";

export default async function HomePage() {
  const session = await getUserWithProfile();

  if (!session) {
    redirect("/login");
  }

  const { user, profile } = session;

  const chatUser: ChatUserSummary = {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "User",
    username: profile?.username,
    avatarUrl: profile?.avatar_url,
  };

  const initialChats = await getConversationsForUser(user.id);

  return <ChatApp user={chatUser} initialChats={initialChats} />;
}
