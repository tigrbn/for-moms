import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LinkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Погасить код привязки MAX→Telegram: связать User (из MAX) с telegramId.
   * Вызывается из TelegramWebhookController при /start CODE.
   */
  async redeem(code: string, telegramId: number): Promise<{ ok: true }> {
    const codeTrimmed = code?.trim();
    const telegramIdNum = Number(telegramId);
    if (!codeTrimmed || !Number.isInteger(telegramIdNum)) {
      throw new BadRequestException("code and telegramId are required");
    }
    const link = await this.prisma.linkCode.findUnique({
      where: { code: codeTrimmed },
      include: { user: { select: { id: true, telegramId: true } } },
    });
    if (!link) throw new BadRequestException("Код не найден или уже использован");
    if (link.linkType !== "telegram") {
      throw new BadRequestException("Этот код для привязки MAX. Используйте его в приложении MAX.");
    }
    if (link.expiresAt < new Date()) {
      await this.prisma.linkCode.delete({ where: { id: link.id } }).catch(() => {});
      throw new BadRequestException("Код истёк");
    }
    if (link.user.telegramId != null) {
      throw new BadRequestException("Аккаунт уже привязан к Telegram");
    }
    const telegramIdBig = BigInt(telegramIdNum);
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
    return { ok: true };
  }

  /**
   * Погасить код привязки Telegram→MAX: связать User (из Telegram) с maxId.
   * Вызывается из MeController при POST /me/link-max-redeem.
   * Объединяет MAX-аккаунт (maxUserId) с Telegram-аккаунтом (владелец кода).
   * Возвращает id объединённого пользователя (Telegram-аккаунт).
   */
  async redeemMax(code: string, maxUserId: bigint): Promise<{ joinedUserId: bigint }> {
    const codeTrimmed = code?.trim();
    if (!codeTrimmed) throw new BadRequestException("Код обязателен");

    const link = await this.prisma.linkCode.findUnique({
      where: { code: codeTrimmed },
      include: { user: { select: { id: true, telegramId: true, maxId: true } } },
    });
    if (!link) throw new BadRequestException("Код не найден или уже использован");
    if (link.linkType !== "max") {
      throw new BadRequestException("Этот код для привязки Telegram. Откройте бота в Telegram и отправьте /start КОД.");
    }
    if (link.expiresAt < new Date()) {
      await this.prisma.linkCode.delete({ where: { id: link.id } }).catch(() => {});
      throw new BadRequestException("Код истёк");
    }
    if (link.user.maxId != null) {
      throw new BadRequestException("Аккаунт уже привязан к MAX");
    }
    if (link.user.telegramId == null) {
      throw new BadRequestException("Неверный код привязки");
    }

    const maxUser = await this.prisma.user.findUnique({
      where: { id: maxUserId },
      select: { id: true, maxId: true },
    });
    if (!maxUser || maxUser.maxId == null) {
      throw new BadRequestException("Войдите в приложение через MAX");
    }
    if (maxUserId === link.userId) {
      throw new BadRequestException("Этот код создан для другого аккаунта");
    }

    const maxIdVal = maxUser.maxId;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: maxUserId },
        data: { maxId: null },
      });
      await tx.profile.updateMany({
        where: { userId: maxUserId },
        data: { userId: link.userId },
      });
      await tx.consentLog.updateMany({
        where: { userId: maxUserId },
        data: { userId: link.userId },
      });
      await tx.profileView.updateMany({
        where: { userId: maxUserId },
        data: { userId: link.userId },
      });
      await tx.appOpen.updateMany({
        where: { userId: maxUserId },
        data: { userId: link.userId },
      });
      await tx.linkCode.deleteMany({ where: { userId: maxUserId } });
      await tx.user.update({
        where: { id: link.userId },
        data: { maxId: maxIdVal },
      });
      await tx.linkCode.delete({ where: { id: link.id } });
      await tx.user.delete({ where: { id: maxUserId } });
    });

    return { joinedUserId: link.userId };
  }
}
