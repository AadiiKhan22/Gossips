-- Gossips Phase 17: case-insensitive unique usernames.
--
-- The app already lowercases usernames before saving (see
-- normalizeUsername() in lib/validations/profile.ts), but the DB constraint
-- was a plain `unique` on `text`, which is case-SENSITIVE in Postgres. That
-- meant "AhadKhan" and "ahadkhan" could both exist if a row was ever written
-- outside the app's normalization path (a fixed bug, a manual edit, a
-- future API). This migration makes the DB itself the source of truth for
-- case-insensitive uniqueness, so duplicates are impossible even under
-- concurrent writes, regardless of what any client does.

-- 1. Normalize any existing usernames to lowercase first, so the new index
--    can be created without failing on pre-existing case variants.
update public.profiles
set username = lower(username)
where username is not null
  and username <> lower(username);

-- 2. If normalizing step 1 happened to produce a collision (e.g. both
--    "AhadKhan" and "ahadkhan" already existed for two different users),
--    keep the older row's username and clear the newer row's, so it doesn't
--    silently disappear behind a duplicate. The affected user will be
--    prompted to choose a new username next time they visit their profile.
with ranked as (
  select
    id,
    username,
    row_number() over (partition by lower(username) order by created_at asc) as rn
  from public.profiles
  where username is not null
)
update public.profiles p
set username = null
from ranked r
where p.id = r.id
  and r.rn > 1;

-- 3. Drop the old case-sensitive unique constraint and its backing index,
--    replacing it with a case-insensitive unique index on lower(username).
alter table public.profiles
  drop constraint if exists profiles_username_key;

drop index if exists profiles_username_idx;

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username));

comment on index profiles_username_lower_unique_idx is
  'Enforces case-insensitive unique usernames (AhadKhan = ahadkhan = AHADKHAN).';
