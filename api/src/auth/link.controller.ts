import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BotTokenGuard } from "./bot-token.guard";

@Controller("link")
export class LinkController {
  constructor(private prisma: PrismaService) {}

  /**
   * Погашение кода привязки Telegram. Вызывается ботом, когда пользователь отправил /start <code>.
   * Тело: { code: string, telegramId: number }
   */
  @Post("redeem")
  @UseGuards(BotTokenGuard)
  async redeem(@Body() body: { code?: string; telegramId?: number }) {
    const code = body?.code?.trim();
    const telegramId = body?.telegramId;
    if (!code || telegramId == null || !Number.isInteger(Number(telegramId))) {
      throw new BadRequestException("code and telegramId are required");
    }
    const link = await this.prisma.linkCode.findUnique({
      where: { code },
      include: { user: { select: { id: true, telegramId: true } } },
    });
    if (!link) throw new BadRequestException("Код не найден или уже использован");
    if (link.expiresAt < new Date()) {
      await this.prisma.linkCode.delete({ where: { id: link.id } }).catch(() => {});
      throw new BadRequestException("Код истёк");
    }
    if (link.user.telegramId != null) {
      throw new BadRequestException("Аккаунт уже привязан к Telegram");
    }
    const telegramIdBig = BigInt(telegramId);
    const existingByTelegram = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdBig },
      select: { id: true },
    });
    if (existingByTelegram) {
      throw new BadRequestException("Этот Telegram уже привязан к другому аккаунту");
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: link.userId },
        data: { telegramId: telegramIdBig },
      }),
      this.prisma.linkCode.delete({ where: { id: link.id } }),
    ]);
    return { ok: true, message: "Telegram привязан" };
  }
}
