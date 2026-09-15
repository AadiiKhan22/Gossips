-- Gossips Phase 8: Voice messages
-- Voice messages reuse the chat-media bucket and attachment_* columns
-- from Phase 7 (attachment_type will be an audio/* mime type). This
-- just adds a duration so the UI can show "0:15" instead of guessing.

alter table public.messages
  add column if not exists attachment_duration_seconds integer;

alter table public.messages
  add constraint messages_attachment_duration_non_negative
  check (attachment_duration_seconds is null or attachment_duration_seconds >= 0);

comment on column public.messages.attachment_duration_seconds is
  'Duration in seconds for audio/video attachments (e.g. voice messages)';
