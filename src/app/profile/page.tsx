import Link from "next/link";
import { redirect } from "next/navigation";

import { BackToChats } from "@/components/chat/back-to-chats";
import { GossipsLogo } from "@/components/brand/gossips-logo";
import { LogoutButton } from "@/components/profile/logout-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { BlockedUsersList } from "@/components/settings/blocked-users-card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserWithProfile } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const session = await getUserWithProfile();

  if (!session) {
    redirect("/login");
  }

  const { profile, user } = session;

  if (!profile) {
    return (
      <div className="bg-background min-h-svh">
        <header className="border-b border-border/80 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <BackToChats />
              <GossipsLogo size="sm" showText={false} />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile not ready</CardTitle>
              <CardDescription>
                Your profile is still being set up. Refresh the page in a moment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="gossip">
                <Link href="/profile">Refresh</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const supabase = await createClient();
  const [friendsResult, groupsResult] = await Promise.all([
    supabase
      .from("friend_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`),
    supabase
      .from("conversation_members")
      .select("conversation_id, conversations!inner(type)", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("conversations.type", "group"),
  ]);
  const friendsCount = friendsResult.count ?? 0;
  const groupsCount = groupsResult.count ?? 0;

  return (
    <div className="bg-background min-h-svh">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BackToChats />
            <GossipsLogo size="sm" showText={false} />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 space-y-2">
          <Badge variant="gossip">Profile</Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit your profile</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update how you appear on Gossips. Only you can edit your profile.
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="grid grid-cols-2 divide-x divide-border py-2 text-center">
            <div>
              <p className="text-2xl font-bold">{friendsCount}</p>
              <p className="text-muted-foreground text-sm">Friends</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{groupsCount}</p>
              <p className="text-muted-foreground text-sm">Groups</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gossip/15">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Username, display name, avatar, and bio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} email={user.email ?? ""} />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Blocked users</CardTitle>
            <CardDescription>Blocked users can&apos;t message you or send friend requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockedUsersList currentUserId={profile.id} />
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <LogoutButton />
        </div>
      </main>
    </div>
  );
}
