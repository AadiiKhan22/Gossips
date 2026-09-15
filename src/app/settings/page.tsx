import Link from "next/link";
import { redirect } from "next/navigation";

import { BackToChats } from "@/components/chat/back-to-chats";
import { GossipsLogo } from "@/components/brand/gossips-logo";
import { BlockedUsersList } from "@/components/settings/blocked-users-card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserWithProfile } from "@/lib/auth/get-user";

export default async function SettingsPage() {
  const session = await getUserWithProfile();

  if (!session) {
    redirect("/login");
  }

  const { user, profile } = session;
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "User";

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
          <Badge variant="gossip">Settings</Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Preferences</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your Gossips experience. More options arrive in later phases.
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Signed in as {displayName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <span className="text-muted-foreground">Email</span>
                <span>{user.email}</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/profile">Edit profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Use the theme toggle in the header or profile menu.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Light, dark, and system themes are supported across the app.
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-90">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Coming in Phase 12</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Notification preferences
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Blocked users</CardTitle>
              <CardDescription>
                Blocked users can&apos;t message you or send friend requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlockedUsersList currentUserId={user.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
