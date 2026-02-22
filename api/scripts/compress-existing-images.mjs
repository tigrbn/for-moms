#!/usr/bin/env node
/**
 * Сжимает все изображения в uploads/ (макс. 1200px).
 * Сохраняет в том же формате, имя файла не меняется — URL в БД остаются рабочими.
 * Запуск из каталога api: node scripts/compress-existing-images.mjs
 */

import sharp from "sharp";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "uploads");
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 82;

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

if (!existsSync(UPLOAD_DIR)) {
  console.log("Каталог uploads не найден");
  process.exit(0);
}

const files = readdirSync(UPLOAD_DIR).filter((f) => IMAGE_EXT.test(f));
console.log(`Найдено ${files.length} изображений`);

let compressed = 0;
for (const file of files) {
  const filepath = join(UPLOAD_DIR, file);
  const ext = file.toLowerCase().slice(file.lastIndexOf("."));

  try {
    const fs = await import("fs");
    const { size: origSize } = await fs.promises.stat(filepath);
    const meta = await sharp(filepath).metadata();
    const isLarge = origSize > 150 * 1024 || (meta.width ?? 0) > MAX_WIDTH || (meta.height ?? 0) > MAX_HEIGHT;

    if (!isLarge) continue;

    const tmpPath = join(UPLOAD_DIR, `${file}.tmp`);
    let pipeline = sharp(filepath)
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true });

    if (ext === ".png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality: 80 });
    } else if (ext === ".gif") {
      pipeline = pipeline.gif();
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    }

    await pipeline.toFile(tmpPath);
    await fs.promises.rename(tmpPath, filepath);
    const { size: newSize } = await fs.promises.stat(filepath);
    compressed++;
    const saved = ((1 - newSize / origSize) * 100).toFixed(0);
    console.log(`  ${file}: ${(origSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (-${saved}%)`);
  } catch (e) {
    console.error(`  ${file}: ошибка`, e.message);
  }
}

console.log(`Сжато: ${compressed} из ${files.length}`);
