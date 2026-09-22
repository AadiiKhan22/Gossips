-- Gossips Phase 15: prevent duplicate friend_requests between the same pair.
-- Without this, re-sending a request (e.g. from a stale UI state) creates a
-- second row, and code reading "the" relationship between two users can pick
-- the wrong one (e.g. a stray pending row instead of an existing accepted one).

create or replace function public.prevent_duplicate_friend_request()
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
    raise exception 'A friend request or friendship already exists between these users.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists friend_requests_prevent_duplicate on public.friend_requests;
create trigger friend_requests_prevent_duplicate
before insert on public.friend_requests
for each row
execute function public.prevent_duplicate_friend_request();

-- One-off cleanup: if a pair already has both an 'accepted' row and a stray
-- 'pending'/'rejected' row from before this fix, drop the non-accepted ones.
delete from public.friend_requests fr
where fr.status <> 'accepted'
  and exists (
    select 1
    from public.friend_requests accepted
    where accepted.status = 'accepted'
      and (
        (accepted.sender_id = fr.sender_id and accepted.receiver_id = fr.receiver_id)
        or (accepted.sender_id = fr.receiver_id and accepted.receiver_id = fr.sender_id)
      )
      and accepted.id <> fr.id
  );
