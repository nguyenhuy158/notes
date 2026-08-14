const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 300_000;

/**
 * Resize/nén ảnh qua canvas trước khi upload. Ảnh chụp điện thoại thường vài
 * MB, không nén thì tốn băng thông + dung lượng R2 vô ích cho 1 ghi chú.
 * Bỏ qua GIF (mất animation nếu vẽ lại qua canvas) và ảnh đã đủ nhỏ.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.size < SKIP_BELOW_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
