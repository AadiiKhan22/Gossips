-- Gossips Phase 4.6: Fix RLS infinite recursion
-- The Phase 4 policies on conversation_members / messages / conversations
-- check membership by querying conversation_members from within its own
-- policy (and from conversations' policy), which makes Postgres recursively
-- evaluate that table's RLS on itself -> "infinite recursion detected in
-- policy" (500 errors on the client).
--
-- Fix: add a SECURITY DEFINER helper that reads membership without
-- triggering RLS, and use it in all affected policies instead of a
-- self-referencing subquery.

create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

-- conversations
drop policy if exists "Members can view conversations" on public.conversations;
create policy "Members can view conversations"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id, auth.uid()));

-- conversation_members (this is the one that was self-referencing)
drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

-- messages
drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

comment on function public.is_conversation_member(uuid, uuid) is
  'Security definer helper to check conversation membership without triggering RLS recursion';
