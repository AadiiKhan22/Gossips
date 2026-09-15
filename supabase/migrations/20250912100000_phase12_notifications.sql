-- Gossips Phase 12: Notifications
-- Adds a function to compute unread message counts per conversation for
-- a user, used to drive the sidebar unread badges, the browser tab
-- title badge, and deciding when to show a browser notification.

create or replace function public.get_unread_counts(p_user_id uuid)
returns table(conversation_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.conversation_id,
    count(*) as unread_count
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
    and cm.user_id = p_user_id
  left join public.message_reads mr
    on mr.conversation_id = m.conversation_id
    and mr.user_id = p_user_id
  where m.sender_id <> p_user_id
    and m.deleted_at is null
    and m.created_at > coalesce(mr.last_read_at, cm.joined_at)
  group by m.conversation_id;
$$;

revoke all on function public.get_unread_counts(uuid) from public;
grant execute on function public.get_unread_counts(uuid) to authenticated;

comment on function public.get_unread_counts(uuid) is
  'Per-conversation unread message count for a user, based on messages sent after their last read/join point';
