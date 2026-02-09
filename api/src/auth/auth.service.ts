import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { verifyTelegramInitData } from "./telegram-initdata";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async createSession(initData: string) {
    const botToken = this.config.get<string>("BOT_TOKEN");
    const jwtSecret = this.config.get<string>("JWT_SECRET");

    if (!botToken || !jwtSecret) {
      throw new Error("BOT_TOKEN or JWT_SECRET is missing in .env");
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified.ok) throw new UnauthorizedException("Invalid Telegram initData");

    const tg = verified.user as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };

    const hasPhotoFromInit = tg.photo_url != null && String(tg.photo_url).trim() !== "";

    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(tg.id) },
      create: {
        telegramId: BigInt(tg.id),
        firstName: tg.first_name ?? null,
        lastName: tg.last_name ?? null,
        username: tg.username ?? null,
        photoUrl: tg.photo_url ?? null,
      },
      update: {
        firstName: tg.first_name ?? null,
        lastName: tg.last_name ?? null,
        username: tg.username ?? null,
        ...(hasPhotoFromInit ? { photoUrl: tg.photo_url! } : {}),
      },
      include: { profiles: true },
    });

    if (botToken) {
      try {
        const photosRes = await fetch(
          `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${tg.id}&limit=1`,
        );
        const photosData = (await photosRes.json()) as {
          ok?: boolean;
          result?: { total_count?: number; photos?: Array<Array<{ file_id: string }>> };
        };
        if (photosData?.ok && photosData.result?.photos?.length > 0) {
          const sizes = photosData.result.photos[0];
          const largest = sizes[sizes.length - 1];
          const fileRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(largest.file_id)}`,
          );
          const fileData = (await fileRes.json()) as { ok?: boolean; result?: { file_path?: string } };
          if (fileData?.ok && fileData.result?.file_path) {
            const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            await this.prisma.user.update({
              where: { id: user.id },
              data: { photoUrl },
            });
            (user as { photoUrl: string | null }).photoUrl = photoUrl;
          }
        }
      } catch (e) {
        this.logger.warn("Failed to fetch Telegram profile photo", e);
      }
    }

    const accessToken = jwt.sign(
      { sub: user.id.toString(), telegramId: user.telegramId.toString() },
      jwtSecret,
      { expiresIn: "15m" },
    );

    return {
      accessToken,
      user: {
        id: user.id.toString(),
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
      },
      profiles: user.profiles.map((p) => ({
        id: p.id.toString(),
        type: p.type,
        isActive: p.isActive,
        displayName: p.displayName,
        city: p.city,
        district: p.district,
      })),
      activeProfileId: user.activeProfileId ? user.activeProfileId.toString() : null,
    };
  }
}
