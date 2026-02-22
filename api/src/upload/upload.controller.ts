import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { memoryStorage } from "multer";
import { extname, join } from "path";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { compressAndSaveImage } from "./image-compress";

const UPLOAD_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const multerConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: unknown, file: MulterFile, cb: (err: Error | null, acceptFile: boolean) => void) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(ok ? null : new BadRequestException("Только изображения (JPEG, PNG, GIF, WebP)"), ok);
  },
};

@UseGuards(JwtAuthGuard)
@Controller("upload")
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor("file", multerConfig))
  async upload(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException("Файл не загружен");
    const ext = extname(file.originalname) || ".jpg";
    const safe = /^[a-zA-Z0-9.]+$/.test(ext) ? ext : ".jpg";
    const baseFilename = `${randomUUID()}${safe}`;
    const filename = await compressAndSaveImage(file.buffer, UPLOAD_DIR, baseFilename);
    return { url: `/uploads/${filename}` };
  }
}
