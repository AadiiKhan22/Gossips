-- Gossips Phase 13.2: RLS audit pass
--
-- Finding: several UPDATE policies only check *who* may update a row
-- (e.g. sender_id = auth.uid()), not *which columns* may change. Postgres
-- RLS's `with check` only validates the NEW row in isolation, so it
-- cannot compare against the OLD row on its own. That means, as written,
-- a user could UPDATE a row they own and quietly change a column that
-- should never move (e.g. reassign their own message to a different
-- conversation_id, or their own conversation_members row to a different
-- conversation_id), sidestepping the membership checks that only apply
-- at INSERT time.
--
-- Fix: BEFORE UPDATE triggers that raise an exception if a column meant
-- to be immutable after creation actually changed.

-- ---------------------------------------------------------------------
-- 1. messages: sender_id, conversation_id, created_at, reply_to_message_id,
--    is_forwarded must never change after insert (only content,
--    attachment_*, edited_at, deleted_at do, via edit/soft-delete).
-- ---------------------------------------------------------------------

create or replace function public.lock_message_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id <> old.sender_id then
    raise exception 'sender_id cannot be changed';
  end if;
  if new.conversation_id <> old.conversation_id then
    raise exception 'conversation_id cannot be changed';
  end if;
  if new.created_at <> old.created_at then
    raise exception 'created_at cannot be changed';
  end if;
  if new.reply_to_message_id is distinct from old.reply_to_message_id then
    raise exception 'reply_to_message_id cannot be changed';
  end if;
  if new.is_forwarded <> old.is_forwarded then
    raise exception 'is_forwarded cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_lock_immutable_columns on public.messages;
create trigger messages_lock_immutable_columns
before update on public.messages
for each row
execute function public.lock_message_immutable_columns();

-- ---------------------------------------------------------------------
-- 2. conversation_members: conversation_id, user_id, joined_at must
--    never change (only pinned_at, muted, hidden_at do).
-- ---------------------------------------------------------------------

create or replace function public.lock_conversation_member_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if new.conversation_id <> old.conversation_id then
    raise exception 'conversation_id cannot be changed';
  end if;
  if new.user_id <> old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  if new.joined_at <> old.joined_at then
    raise exception 'joined_at cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_members_lock_immutable_columns on public.conversation_members;
create trigger conversation_members_lock_immutable_columns
before update on public.conversation_members
for each row
execute function public.lock_conversation_member_immutable_columns();

-- ---------------------------------------------------------------------
-- 3. friend_requests: sender_id, receiver_id, created_at must never
--    change (only status/updated_at do, via accept/reject).
-- ---------------------------------------------------------------------

create or replace function public.lock_friend_request_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id <> old.sender_id then
    raise exception 'sender_id cannot be changed';
  end if;
  if new.receiver_id <> old.receiver_id then
    raise exception 'receiver_id cannot be changed';
  end if;
  if new.created_at <> old.created_at then
    raise exception 'created_at cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists friend_requests_lock_immutable_columns on public.friend_requests;
create trigger friend_requests_lock_immutable_columns
before update on public.friend_requests
for each row
execute function public.lock_friend_request_immutable_columns();

-- ---------------------------------------------------------------------
-- 4. message_reactions: message_id, user_id must never change (only
--    emoji does, via "change my reaction").
-- ---------------------------------------------------------------------

create or replace function public.lock_message_reaction_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if new.message_id <> old.message_id then
    raise exception 'message_id cannot be changed';
  end if;
  if new.user_id <> old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists message_reactions_lock_immutable_columns on public.message_reactions;
create trigger message_reactions_lock_immutable_columns
before update on public.message_reactions
for each row
execute function public.lock_message_reaction_immutable_columns();

-- ---------------------------------------------------------------------
-- 5. Storage buckets: enforce file size limits and allowed MIME types
--    at the bucket level (RLS policies can't inspect file bytes/size).
-- ---------------------------------------------------------------------

update storage.buckets
set file_size_limit = 5 * 1024 * 1024, -- 5 MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';

update storage.buckets
set file_size_limit = 25 * 1024 * 1024, -- 25 MB, matches client-side check
    allowed_mime_types = array[
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip'
    ]
where id = 'chat-media';

comment on function public.lock_message_immutable_columns() is 'Prevents UPDATE from reassigning a message to a different conversation/sender';
comment on function public.lock_conversation_member_immutable_columns() is 'Prevents UPDATE from reassigning a membership row to a different conversation/user';
comment on function public.lock_friend_request_immutable_columns() is 'Prevents UPDATE from forging a different sender/receiver on a friend request';
comment on function public.lock_message_reaction_immutable_columns() is 'Prevents UPDATE from moving a reaction to a different message/user';
