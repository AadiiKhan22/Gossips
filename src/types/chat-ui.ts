export type ChatListItem = {
  id: string;
  name: string;
  otherUserId?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  avatarUrl?: string | null;
  isGroup?: boolean;
  memberCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
};

export type ChatUserSummary = {
  id: string;
  email: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
};

export type FriendStatus = "none" | "friends" | "outgoing" | "incoming";

export type UserSearchResult = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  friendStatus: FriendStatus;
  requestId?: string;
};

export type IncomingFriendRequest = {
  requestId: string;
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type FriendSummary = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type BlockedUserSummary = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type CallDirection = "outgoing" | "incoming";

export type CallLogItem = {
  id: string;
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  callType: "audio" | "video";
  status: "ringing" | "accepted" | "declined" | "missed" | "ended" | "cancelled" | "failed";
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number;
};
