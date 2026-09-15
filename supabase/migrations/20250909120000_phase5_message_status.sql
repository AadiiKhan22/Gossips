-- Gossips Phase 5: Message status (sent / seen)
-- Tracks, per conversation member, how far they've read.
-- "sent" = message exists. "seen" = the other member's last_read_at is
-- at or after the message's created_at.

create table if not exists public.message_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create index if not exists message_reads_conversation_id_idx
  on public.message_reads (conversation_id);

alter table public.message_reads enable row level security;

-- Any member of the conversation can see everyone's read state in it
-- (needed to compute "seen" ticks on your own messages).
create policy "Members can view read receipts"
on public.message_reads
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

-- Users can only write their own read state.
create policy "Users can upsert their own read receipt"
on public.message_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

create policy "Users can update their own read receipt"
on public.message_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.message_reads replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.message_reads;
exception
  when duplicate_object then null;
end;
$$;

comment on table public.message_reads is
  'Per-user last-read timestamp per conversation, used to compute sent/seen ticks';
