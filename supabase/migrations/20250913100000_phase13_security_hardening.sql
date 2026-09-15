-- Gossips Phase 13: Privacy and security hardening
-- 1. Blocking users (table, RLS, and enforcement in friend/message flows)
-- 2. Rate limiting on friend requests and messages
-- 3. Input sanitization guardrails at the DB layer (defense in depth)
-- 4. Misc RLS tightening

-- ---------------------------------------------------------------------
-- 1. Blocking
-- ---------------------------------------------------------------------

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocked_id_idx
  on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

-- You can see who you blocked, but not who blocked you (avoids leaking
-- that info to the blocked party).
drop policy if exists "Users can view their own block list" on public.blocked_users;
create policy "Users can view their own block list"
on public.blocked_users
for select
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "Users can block others" on public.blocked_users;
create policy "Users can block others"
on public.blocked_users
for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists "Users can unblock others" on public.blocked_users;
create policy "Users can unblock others"
on public.blocked_users
for delete
to authenticated
using (blocker_id = auth.uid());

create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_users bu
    where (bu.blocker_id = user_a and bu.blocked_id = user_b)
       or (bu.blocker_id = user_b and bu.blocked_id = user_a)
  );
$$;

revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- Blocking someone tears down any active/pending friendship between the
-- two users and cancels outstanding requests either direction.
create or replace function public.handle_block_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_requests fr
  where (fr.sender_id = new.blocker_id and fr.receiver_id = new.blocked_id)
     or (fr.sender_id = new.blocked_id and fr.receiver_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists blocked_users_cleanup_friendship on public.blocked_users;
create trigger blocked_users_cleanup_friendship
after insert on public.blocked_users
for each row
execute function public.handle_block_user();

-- Friendship requires the users not be blocked either direction.
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = user_a and fr.receiver_id = user_b)
        or (fr.sender_id = user_b and fr.receiver_id = user_a)
      )
  )
  and not public.is_blocked(user_a, user_b);
$$;

-- Cannot send a friend request to someone you blocked or who blocked you.
create or replace function public.prevent_duplicate_friend_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_blocked(new.sender_id, new.receiver_id) then
    raise exception 'Cannot send a friend request to this user';
  end if;

  if exists (
    select 1
    from public.friend_requests fr
    where fr.status in ('pending', 'accepted')
      and (
        (fr.sender_id = new.sender_id and fr.receiver_id = new.receiver_id)
        or (fr.sender_id = new.receiver_id and fr.receiver_id = new.sender_id)
      )
  ) then
    raise exception 'A friend request already exists between these users';
  end if;
  return new;
end;
$$;

-- Direct-message gate: also block messaging in an *existing* direct
-- conversation once either party blocks the other (friendship revoked
-- above already stops new conversations; this stops old ones).
create or replace function public.can_message_in_conversation(
  p_conversation_id uuid,
  p_sender_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  conv_type public.conversation_type;
  other_member uuid;
begin
  select type into conv_type from public.conversations where id = p_conversation_id;

  if conv_type is null then
    return false;
  end if;

  if conv_type = 'direct' then
    select cm.user_id into other_member
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> p_sender_id
    limit 1;

    if other_member is not null and public.is_blocked(p_sender_id, other_member) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.can_message_in_conversation(uuid, uuid) from public;
grant execute on function public.can_message_in_conversation(uuid, uuid) to authenticated;

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
  and public.can_message_in_conversation(conversation_id, auth.uid())
);

comment on table public.blocked_users is 'Users blocked by other users; blocks friendship, requests, and direct messaging both ways';
comment on function public.is_blocked(uuid, uuid) is 'True if either user has blocked the other';

-- ---------------------------------------------------------------------
-- 2. Rate limiting (defense against spam / abuse from a compromised or
--    malicious client, since RLS alone does not throttle write volume)
-- ---------------------------------------------------------------------

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.messages
  where sender_id = new.sender_id
    and created_at > timezone('utc', now()) - interval '10 seconds';

  if recent_count >= 20 then
    raise exception 'You are sending messages too quickly. Please slow down.';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
before insert on public.messages
for each row
execute function public.enforce_message_rate_limit();

create or replace function public.enforce_friend_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.friend_requests
  where sender_id = new.sender_id
    and created_at > timezone('utc', now()) - interval '1 hour';

  if recent_count >= 30 then
    raise exception 'You have sent too many friend requests recently. Please try again later.';
  end if;

  return new;
end;
$$;

drop trigger if exists friend_requests_rate_limit on public.friend_requests;
create trigger friend_requests_rate_limit
before insert on public.friend_requests
for each row
execute function public.enforce_friend_request_rate_limit();

-- ---------------------------------------------------------------------
-- 3. Input guardrails at the DB layer (client already validates, but
--    RLS/constraints are the real trust boundary)
-- ---------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_username_length;
alter table public.profiles
  add constraint profiles_username_length check (
    username is null or (char_length(username) >= 3 and char_length(username) <= 30)
  );

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]+$');

alter table public.friend_requests
  alter column sender_id set not null,
  alter column receiver_id set not null;

comment on function public.enforce_message_rate_limit() is 'Caps a user to 20 messages per rolling 10 seconds';
comment on function public.enforce_friend_request_rate_limit() is 'Caps a user to 30 outgoing friend requests per rolling hour';
