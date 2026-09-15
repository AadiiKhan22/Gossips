-- Gossips Phase 4.5: Fix RLS bug + friend requests
-- 1. Fixes column-ambiguity bug in Phase 4 RLS policies
-- 2. Adds friend_requests table + friendship check
-- 3. Gates get_or_create_direct_conversation on an accepted friend request

-- ---------------------------------------------------------------------
-- 1. Fix Phase 4 RLS bug: unqualified `conversation_id` inside the
--    subquery resolved to the subquery's own column (cm.conversation_id),
--    making the check always true. Recreate with explicit qualification.
-- ---------------------------------------------------------------------

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
on public.conversation_members
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------
-- 2. Friend requests
-- ---------------------------------------------------------------------

create type public.friend_request_status as enum ('pending', 'accepted', 'rejected');

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint friend_requests_not_self check (sender_id <> receiver_id),
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);

create index if not exists friend_requests_receiver_id_idx
  on public.friend_requests (receiver_id);
create index if not exists friend_requests_sender_id_idx
  on public.friend_requests (sender_id);

-- Prevent duplicate pending/accepted requests in either direction
-- (sender->receiver and receiver->sender both blocked while one is active)
create or replace function public.prevent_duplicate_friend_requests()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists friend_requests_prevent_duplicates on public.friend_requests;
create trigger friend_requests_prevent_duplicates
before insert on public.friend_requests
for each row
execute function public.prevent_duplicate_friend_requests();

drop trigger if exists friend_requests_updated_at on public.friend_requests;
create trigger friend_requests_updated_at
before update on public.friend_requests
for each row
execute function public.handle_updated_at();

alter table public.friend_requests enable row level security;

create policy "Users can view their own friend requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "Receiver can respond to a friend request"
on public.friend_requests
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

create policy "Sender can cancel a pending friend request"
on public.friend_requests
for delete
to authenticated
using (auth.uid() = sender_id and status = 'pending');

-- Helper: are two users friends (an accepted request exists either direction)?
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
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Gate direct conversations on friendship
-- ---------------------------------------------------------------------

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  conv_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null then
    raise exception 'Other user is required';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot create a conversation with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'User not found';
  end if;

  if not public.are_friends(current_user_id, other_user_id) then
    raise exception 'You must be friends before you can message this user';
  end if;

  select c.id
  into conv_id
  from public.conversations c
  where c.type = 'direct'
    and (
      select count(*)
      from public.conversation_members cm
      where cm.conversation_id = c.id
    ) = 2
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = c.id
        and cm.user_id = current_user_id
    )
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = c.id
        and cm.user_id = other_user_id
    )
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type)
  values ('direct')
  returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (conv_id, current_user_id),
    (conv_id, other_user_id);

  return conv_id;
end;
$$;

comment on table public.friend_requests is 'Friend requests between users; direct messaging requires an accepted request';
comment on function public.are_friends(uuid, uuid) is 'Returns true if two users have an accepted friend request between them';
