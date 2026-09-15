-- Gossips Phase 9: Advanced messaging
-- Replies, reactions, edit/delete (soft delete), and forwarding.

-- ---------------------------------------------------------------------
-- 1. Messages: reply, edit, soft-delete, forward metadata
-- ---------------------------------------------------------------------

alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages (id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists is_forwarded boolean not null default false;

create index if not exists messages_reply_to_message_id_idx
  on public.messages (reply_to_message_id);

-- A deleted message is allowed to have empty content/no attachment;
-- everything else still needs text or an attachment.
alter table public.messages
  drop constraint if exists messages_content_or_attachment;

alter table public.messages
  add constraint messages_content_or_attachment
  check (
    deleted_at is not null
    or char_length(trim(content)) > 0
    or attachment_url is not null
  );

-- Senders can edit or soft-delete their own messages (soft delete = an
-- update that clears content/attachment and sets deleted_at).
drop policy if exists "Senders can update their own messages" on public.messages;
create policy "Senders can update their own messages"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. Reactions
-- ---------------------------------------------------------------------

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions (message_id);

create or replace function public.is_message_conversation_member(
  p_message_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id
      and public.is_conversation_member(m.conversation_id, p_user_id)
  );
$$;

revoke all on function public.is_message_conversation_member(uuid, uuid) from public;
grant execute on function public.is_message_conversation_member(uuid, uuid) to authenticated;

alter table public.message_reactions enable row level security;

create policy "Members can view reactions"
on public.message_reactions
for select
to authenticated
using (public.is_message_conversation_member(message_id, auth.uid()));

create policy "Members can add their own reactions"
on public.message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_message_conversation_member(message_id, auth.uid())
);

create policy "Members can update their own reactions"
on public.message_reactions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Members can remove their own reactions"
on public.message_reactions
for delete
to authenticated
using (user_id = auth.uid());

alter table public.message_reactions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
end;
$$;

-- Messages already have replica identity full and are on the realtime
-- publication (Phase 4); UPDATE events (edits/deletes) will now flow
-- through the same channel automatically.

comment on column public.messages.reply_to_message_id is 'Message being replied to, if any';
comment on column public.messages.edited_at is 'Set when the sender edits the message content';
comment on column public.messages.deleted_at is 'Set when the sender soft-deletes the message';
comment on column public.messages.is_forwarded is 'True if this message was forwarded from another conversation';
comment on table public.message_reactions is 'One emoji reaction per user per message';
