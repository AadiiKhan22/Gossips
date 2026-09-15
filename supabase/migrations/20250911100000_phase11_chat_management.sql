-- Gossips Phase 11: Search and chat management
-- Per-member pin/mute/hide state on conversations, plus the RLS needed
-- for users to manage their own membership row (previously only
-- insertable via security-definer functions).

alter table public.conversation_members
  add column if not exists pinned_at timestamptz,
  add column if not exists muted boolean not null default false,
  add column if not exists hidden_at timestamptz;

-- Members can update their own row (pin/mute/hide toggles).
drop policy if exists "Users can update their own membership" on public.conversation_members;
create policy "Users can update their own membership"
on public.conversation_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Members can remove their own membership (used for "Leave group").
-- Direct chats should use hidden_at instead of deleting the row, since
-- the 1:1 pairing logic (get_or_create_direct_conversation) assumes
-- exactly two membership rows always exist for a direct conversation.
drop policy if exists "Users can remove their own membership" on public.conversation_members;
create policy "Users can remove their own membership"
on public.conversation_members
for delete
to authenticated
using (user_id = auth.uid());

-- Hiding a conversation ("Delete chat") is per-user and reversible: if a
-- new message arrives, unhide it for everyone again, matching the usual
-- "delete just clears it until something new comes in" behavior.
create or replace function public.unhide_conversation_on_new_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversation_members
  set hidden_at = null
  where conversation_id = new.conversation_id
    and hidden_at is not null;
  return new;
end;
$$;

drop trigger if exists messages_unhide_conversation on public.messages;
create trigger messages_unhide_conversation
after insert on public.messages
for each row
execute function public.unhide_conversation_on_new_message();

comment on column public.conversation_members.pinned_at is 'Set when this member pins the conversation; sorted to the top of their list';
comment on column public.conversation_members.muted is 'Whether this member has muted notifications for this conversation';
comment on column public.conversation_members.hidden_at is 'Set when this member deletes/clears the conversation from their own list; cleared automatically when a new message arrives';
