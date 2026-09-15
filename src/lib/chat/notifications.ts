import { createClient } from "@/lib/supabase/client";

export async function fetchUnreadCounts(userId: string): Promise<Map<string, number>> {
  const supabase = createClient();
  const map = new Map<string, number>();

  const { data, error } = await supabase.rpc("get_unread_counts", { p_user_id: userId });
  if (error || !data) return map;

  for (const row of data) {
    map.set(row.conversation_id, Number(row.unread_count));
  }

  return map;
}

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  return result;
}

export function showMessageNotification(options: {
  senderName: string;
  body: string;
  avatarUrl?: string | null;
  onClick?: () => void;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Don't interrupt someone who's actively looking at the tab.
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const notification = new Notification(options.senderName, {
    body: options.body,
    icon: options.avatarUrl ?? "/favicon.ico",
    tag: "gossips-message",
  });

  if (options.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }
}

export function updateTitleWithUnreadCount(totalUnread: number, baseTitle = "Gossips"): void {
  if (typeof document === "undefined") return;
  document.title = totalUnread > 0 ? `(${totalUnread}) ${baseTitle}` : baseTitle;
}
