-- Gossips Phase 7: Media, file sharing, and avatar uploads
-- Adds two storage buckets and lets messages carry a single attachment.

-- ---------------------------------------------------------------------
-- 1. Storage buckets
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Avatar storage policies
--    Convention: avatars/{user_id}/{filename}
--    Bucket is public, so reads work via the public URL without a
--    policy; writes are still restricted to the user's own folder.
-- ---------------------------------------------------------------------

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------
-- 3. Chat media storage policies
--    Convention: chat-media/{conversation_id}/{filename}
--    Only conversation members can read or write files for that
--    conversation. Reuses the is_conversation_member() helper.
-- ---------------------------------------------------------------------

drop policy if exists "Members can view chat media" on storage.objects;
create policy "Members can view chat media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

drop policy if exists "Members can upload chat media" on storage.objects;
create policy "Members can upload chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- ---------------------------------------------------------------------
-- 4. Messages: allow an attachment with or without text content
-- ---------------------------------------------------------------------

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text;

alter table public.messages
  drop constraint if exists messages_content_not_empty;

alter table public.messages
  add constraint messages_content_or_attachment
  check (char_length(trim(content)) > 0 or attachment_url is not null);

comment on column public.messages.attachment_url is 'Public/signed URL of an uploaded file in the chat-media bucket';
comment on column public.messages.attachment_type is 'MIME type of the attachment, e.g. image/png';
comment on column public.messages.attachment_name is 'Original filename of the attachment';
