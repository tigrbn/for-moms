import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { verifyTelegramInitData } from "./telegram-initdata";

@Injectable()
export class AuthService {
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

    // upsert user
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
        photoUrl: tg.photo_url ?? null,
      },
      include: { profiles: true },
    });

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
