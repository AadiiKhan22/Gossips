import { compressImage } from "@/lib/media/compress-image";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils/generate-id";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB

export interface ChatAttachment {
  url: string;
  type: string;
  name: string;
  durationSeconds?: number;
}

export async function uploadChatMedia(
  file: File,
  conversationId: string,
  durationSeconds?: number,
): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("File must be 25MB or smaller.");
  }

  const supabase = createClient();
  const optimizedFile = await compressImage(file, { maxDimension: 1600, quality: 0.82 });
  const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const safeName = generateId() + (extension ? `.${extension}` : "");
  const path = `${conversationId}/${safeName}`;

  const { error } = await supabase.storage.from("chat-media").upload(path, optimizedFile, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Bucket is private: use a signed URL, valid for a year, so message
  // history keeps working without re-signing on every render.
  const { data, error: signError } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !data) {
    throw new Error(signError?.message ?? "Failed to create attachment link.");
  }

  return {
    url: data.signedUrl,
    type: optimizedFile.type || file.type || "application/octet-stream",
    name: file.name,
    durationSeconds,
  };
}
