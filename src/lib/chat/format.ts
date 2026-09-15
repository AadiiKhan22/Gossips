export function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatChatListTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return formatMessageTime(isoDate);
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
  });
}

export function getDisplayName(profile: {
  display_name: string | null;
  username: string | null;
}): string {
  return profile.display_name ?? profile.username ?? "Unknown user";
}
