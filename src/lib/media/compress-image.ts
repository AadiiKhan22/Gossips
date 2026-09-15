/**
 * Resizes and re-compresses an image file in the browser before upload,
 * so we're not sending (and later re-downloading) full-resolution phone
 * camera photos for a chat bubble that renders at a few hundred pixels.
 *
 * No-ops (returns the original file) for non-image files, GIFs (resizing
 * would drop animation), and files already under the target dimensions.
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const { maxDimension = 1600, quality = 0.82 } = options;

  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    if (scale === 1) {
      bitmap.close?.();
      return file;
    }

    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, quality),
    );

    if (!blob || blob.size >= file.size) {
      // Compression didn't actually help (e.g. already-optimized image);
      // keep the original rather than risk a lower-quality no-op result.
      return file;
    }

    const newName = outputType === "image/jpeg" ? renameToJpg(file.name) : file.name;
    return new File([blob], newName, { type: outputType, lastModified: Date.now() });
  } catch {
    // If anything about resizing fails (unsupported format, etc.), fall
    // back to uploading the original file rather than blocking the send.
    return file;
  }
}

function renameToJpg(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? `${name}.jpg` : `${name.slice(0, dot)}.jpg`;
}
