-- Gossips Phase 14: Audio/Video calling
-- Call records (history) + WebRTC signaling channel, RLS, and Realtime

create type public.call_type as enum ('audio', 'video');

create type public.call_status as enum (
  'ringing',
  'accepted',
  'declined',
  'missed',
  'ended',
  'cancelled',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------------

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  call_type public.call_type not null default 'audio',
  status public.call_status not null default 'ringing',
  started_at timestamptz not null default timezone('utc', now()),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  constraint calls_no_self_call check (caller_id <> callee_id),
  constraint calls_duration_non_negative check (duration_seconds >= 0)
);

create index if not exists calls_conversation_id_started_at_idx
  on public.calls (conversation_id, started_at desc);

create index if not exists calls_caller_id_started_at_idx
  on public.calls (caller_id, started_at desc);

create index if not exists calls_callee_id_started_at_idx
  on public.calls (callee_id, started_at desc);

-- Only one live (ringing/accepted) call per conversation at a time.
create unique index if not exists calls_one_active_per_conversation_idx
  on public.calls (conversation_id)
  where status in ('ringing', 'accepted');

-- ---------------------------------------------------------------------------
-- WebRTC signaling
-- ---------------------------------------------------------------------------

create type public.call_signal_type as enum ('offer', 'answer', 'ice-candidate');

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  signal_type public.call_signal_type not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists call_signals_call_id_created_at_idx
  on public.call_signals (call_id, created_at);

create index if not exists call_signals_recipient_id_idx
  on public.call_signals (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Duration is derived on the server so clients can't forge call lengths.
-- ---------------------------------------------------------------------------

create or replace function public.handle_call_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'accepted' and old.status = 'ringing' and new.answered_at is null then
    new.answered_at = timezone('utc', now());
  end if;

  if new.status in ('ended', 'declined', 'missed', 'cancelled', 'failed')
     and old.status not in ('ended', 'declined', 'missed', 'cancelled', 'failed') then
    new.ended_at = coalesce(new.ended_at, timezone('utc', now()));

    if new.answered_at is not null then
      new.duration_seconds = greatest(
        0,
        extract(epoch from (new.ended_at - new.answered_at))::integer
      );
    else
      new.duration_seconds = 0;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists calls_handle_completion on public.calls;
create trigger calls_handle_completion
before update on public.calls
for each row
execute function public.handle_call_completion();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.calls enable row level security;
alter table public.call_signals enable row level security;

create policy "Participants can view their calls"
on public.calls
for select
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "Members can start a call"
on public.calls
for insert
to authenticated
with check (
  auth.uid() = caller_id
  and public.is_conversation_member(conversation_id, auth.uid())
  and public.is_conversation_member(conversation_id, callee_id)
  and not public.is_blocked(auth.uid(), callee_id)
);

create policy "Participants can update their calls"
on public.calls
for update
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id)
with check (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "Participants can view their signals"
on public.call_signals
for select
to authenticated
using (auth.uid() = recipient_id or auth.uid() = sender_id);

create policy "Participants can send signals"
on public.call_signals
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.calls c
    where c.id = call_id
      and (c.caller_id = auth.uid() or c.callee_id = auth.uid())
      and (c.caller_id = recipient_id or c.callee_id = recipient_id)
      and c.status in ('ringing', 'accepted')
  )
);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.calls replica identity full;
alter table public.call_signals replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end;
$$;

comment on table public.calls is
  'One-to-one audio/video call records. Duration is computed server-side by trigger.';
comment on table public.call_signals is
  'Ephemeral WebRTC signaling (SDP offers/answers and ICE candidates) between call participants.';
