import { compressImage } from "@/lib/media/compress-image";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils/generate-id";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }

  const supabase = createClient();
  const optimized = await compressImage(file, { maxDimension: 512, quality: 0.85 });
  const extension = optimized.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg");
  const path = `${userId}/${generateId()}.${extension}`;

  const { error } = await supabase.storage.from("avatars").upload(path, optimized, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
