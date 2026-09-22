-- Gossips Phase 16: backfill friendships for existing direct conversations.
-- Direct chats created before the friend-request system existed have no
-- matching friend_requests row, so search/new-group UIs incorrectly treat
-- those existing contacts as strangers. Create an 'accepted' row for every
-- direct-conversation pair that's missing one.

insert into public.friend_requests (sender_id, receiver_id, status)
select
  least(a.user_id, b.user_id) as sender_id,
  greatest(a.user_id, b.user_id) as receiver_id,
  'accepted'
from public.conversations c
join public.conversation_members a on a.conversation_id = c.id
join public.conversation_members b
  on b.conversation_id = c.id and b.user_id > a.user_id
where c.type = 'direct'
  and not exists (
    select 1
    from public.friend_requests fr
    where fr.status in ('pending', 'accepted')
      and (
        (fr.sender_id = a.user_id and fr.receiver_id = b.user_id)
        or (fr.sender_id = b.user_id and fr.receiver_id = a.user_id)
      )
  )
on conflict do nothing;
