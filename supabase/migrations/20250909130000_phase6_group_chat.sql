-- Gossips Phase 6: Group chat
-- Adds a display name for group conversations and a security-definer
-- function to create a group with friends only.

alter table public.conversations
  add column if not exists name text;

alter table public.conversations
  add constraint conversations_group_name_required
  check (type = 'direct' or (type = 'group' and coalesce(trim(name), '') <> ''));

create or replace function public.create_group_conversation(
  p_name text,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  conv_id uuid;
  member_id uuid;
  trimmed_name text := trim(p_name);
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if trimmed_name = '' then
    raise exception 'Group name is required';
  end if;

  if p_member_ids is null or array_length(p_member_ids, 1) is null then
    raise exception 'Select at least one friend to add to the group';
  end if;

  foreach member_id in array p_member_ids loop
    if member_id = current_user_id then
      continue;
    end if;

    if not exists (select 1 from public.profiles where id = member_id) then
      raise exception 'One of the selected users no longer exists';
    end if;

    if not public.are_friends(current_user_id, member_id) then
      raise exception 'You can only add friends to a group';
    end if;
  end loop;

  insert into public.conversations (type, name)
  values ('group', trimmed_name)
  returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (conv_id, current_user_id);

  foreach member_id in array p_member_ids loop
    if member_id = current_user_id then
      continue;
    end if;

    insert into public.conversation_members (conversation_id, user_id)
    values (conv_id, member_id)
    on conflict do nothing;
  end loop;

  return conv_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

comment on function public.create_group_conversation(text, uuid[]) is
  'Creates a group conversation with the caller plus the given friend user ids';
