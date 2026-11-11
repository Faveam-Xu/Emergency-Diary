// Re-encoding a photo through a canvas drops its original byte stream -
// including EXIF/GPS tags - keeping only the pixel data (Section 2.1.2).
export async function stripImageMetadata(
  file: Blob,
  mimeTypeHint?: string,
): Promise<Blob> {
  const type = mimeTypeHint ?? file.type;
  if (!type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);

    const outputType = type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, 0.92),
    );

    return blob ?? file;
  } catch (e) {
    console.warn("Could not strip image metadata, uploading as-is:", e);
    return file;
  }
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

// Random, content-free file names so a photo's original file name (which can
// itself leak identifying information) is never stored on the Pod.
export function randomEvidenceFileName(mimeType: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${extensionForMimeType(mimeType || "image/jpeg")}`;
}
