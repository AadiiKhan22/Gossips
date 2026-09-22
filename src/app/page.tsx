import { redirect } from "next/navigation";

import { ChatApp } from "@/components/chat/chat-app";
import { getProfile, getUser } from "@/lib/auth/get-user";
import { getConversationsForUser } from "@/lib/chat/conversations";
import type { ChatUserSummary } from "@/types/chat-ui";

export default async function HomePage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, initialChats] = await Promise.all([
    getProfile(user.id),
    getConversationsForUser(user.id),
  ]);

  const chatUser: ChatUserSummary = {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "User",
    username: profile?.username,
    avatarUrl: profile?.avatar_url,
  };

  return <ChatApp user={chatUser} initialChats={initialChats} />;
}
