-- Gossips Phase 13.1: "X blocked you" notice
-- Lets a user check whether a specific other user has blocked *them*,
-- without exposing that other user's full block list (the existing
-- "view your own block list" policy already prevents that). This is
-- safe to expose narrowly because the caller already knows who the
-- other party is (e.g. from a shared conversation) -- it does not let
-- them enumerate who blocked them in general.

create or replace function public.is_blocked_by(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_users bu
    where bu.blocker_id = p_other_user_id
      and bu.blocked_id = auth.uid()
  );
$$;

revoke all on function public.is_blocked_by(uuid) from public;
grant execute on function public.is_blocked_by(uuid) to authenticated;

comment on function public.is_blocked_by(uuid) is
  'True if the given user has blocked the caller; used to show "X blocked you" in chat';
