export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ConversationType = "direct" | "group";
export type FriendRequestStatus = "pending" | "accepted" | "rejected";
export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "declined"
  | "missed"
  | "ended"
  | "cancelled"
  | "failed";
export type CallSignalType = "offer" | "answer" | "ice-candidate";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: ConversationType;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: ConversationType;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ConversationType;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
          pinned_at: string | null;
          muted: boolean;
          hidden_at: string | null;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          pinned_at?: string | null;
          muted?: boolean;
          hidden_at?: string | null;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          pinned_at?: string | null;
          muted?: boolean;
          hidden_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachment_url: string | null;
          attachment_type: string | null;
          attachment_name: string | null;
          attachment_duration_seconds: number | null;
          reply_to_message_id: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          is_forwarded: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_duration_seconds?: number | null;
          reply_to_message_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          is_forwarded?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_duration_seconds?: number | null;
          reply_to_message_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          is_forwarded?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: FriendRequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: FriendRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: FriendRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friend_requests_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friend_requests_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reads: {
        Row: {
          conversation_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_users: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calls: {
        Row: {
          id: string;
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          call_type: CallType;
          status: CallStatus;
          started_at: string;
          answered_at: string | null;
          ended_at: string | null;
          duration_seconds: number;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          call_type?: CallType;
          status?: CallStatus;
          started_at?: string;
          answered_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          caller_id?: string;
          callee_id?: string;
          call_type?: CallType;
          status?: CallStatus;
          started_at?: string;
          answered_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number;
        };
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_caller_id_fkey";
            columns: ["caller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_callee_id_fkey";
            columns: ["callee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      call_signals: {
        Row: {
          id: string;
          call_id: string;
          sender_id: string;
          recipient_id: string;
          signal_type: CallSignalType;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          sender_id: string;
          recipient_id: string;
          signal_type: CallSignalType;
          payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          sender_id?: string;
          recipient_id?: string;
          signal_type?: CallSignalType;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_signals_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_signals_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_direct_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
      are_friends: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_message_conversation_member: {
        Args: { p_message_id: string; p_user_id: string };
        Returns: boolean;
      };
      create_group_conversation: {
        Args: { p_name: string; p_member_ids: string[] };
        Returns: string;
      };
      get_unread_counts: {
        Args: { p_user_id: string };
        Returns: { conversation_id: string; unread_count: number }[];
      };
    };
    Enums: {
      conversation_type: ConversationType;
      friend_request_status: FriendRequestStatus;
      call_type: CallType;
      call_status: CallStatus;
      call_signal_type: CallSignalType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type FriendRequest = Database["public"]["Tables"]["friend_requests"]["Row"];
export type BlockedUser = Database["public"]["Tables"]["blocked_users"]["Row"];
export type MessageReaction = Database["public"]["Tables"]["message_reactions"]["Row"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type CallSignal = Database["public"]["Tables"]["call_signals"]["Row"];
