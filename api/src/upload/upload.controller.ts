import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

const UPLOAD_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

const multerConfig = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname) || ".jpg";
      const safe = /^[a-zA-Z0-9.]+$/.test(ext) ? ext : ".jpg";
      cb(null, `${randomUUID()}${safe}`);
    },
  }),
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
  upload(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException("Файл не загружен");
    return { url: `/uploads/${file.filename}` };
  }
}
