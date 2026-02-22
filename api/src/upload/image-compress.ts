import sharp from "sharp";
import { join } from "path";

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 82;

/**
 * Сжимает изображение и сохраняет в JPEG (универсальный формат, хорошее сжатие).
 * Возвращает имя сохранённого файла (всегда .jpg).
 */
export async function compressAndSaveImage(
  buffer: Buffer,
  uploadDir: string,
  baseFilename: string,
): Promise<string> {
  const finalFilename = baseFilename.replace(/\.[a-z]+$/i, ".jpg");
  const filepath = join(uploadDir, finalFilename);

  await sharp(buffer)
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(filepath);

  return finalFilename;
}
