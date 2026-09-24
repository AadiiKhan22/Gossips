-- Raise the chat-media storage bucket's max upload size to 50MB, the
-- maximum allowed on Supabase's free tier (was 25MB).
update storage.buckets
set file_size_limit = 50 * 1024 * 1024 -- 50 MB
where id = 'chat-media';
