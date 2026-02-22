import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";
import { TelegramService } from "../telegram/telegram.service";

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  private async notifyParentAboutOffer(requestId: bigint, offerId: bigint) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        request: {
          include: {
            parent: { include: { user: true } },
          },
        },
        specialistProfile: { include: { user: true } },
      },
    });
    if (!offer) return;

    const parentChatId = offer.request.parent.user?.telegramId;
    if (parentChatId == null) return; // родитель только в MAX — уведомления в Telegram не отправляем
    const webApp = this.telegram.buildWebAppUrl(`/requests/${offer.requestId.toString()}`);

    const specialistTitle = offer.specialistProfile.displayName ?? offer.specialistProfile.user.username ?? "Специалист";
    const price = offer.priceOffer != null ? `${offer.priceOffer} ₽` : "—";
    const comment = offer.comment?.trim() ? offer.comment.trim() : "—";

    await this.telegram.sendMessage(
      parentChatId,
      [
        "📩 Новый отклик на вашу заявку",
        "",
        `Заявка: ${offer.request.category}`,
        `Исполнитель: ${specialistTitle}`,
        `Цена: ${price}`,
        `Комментарий: ${comment}`,
        "",
        "Чтобы принять отклик и связаться — откройте заявку в Mini App.",
      ].join("\n"),
      {
        buttons: webApp ? [{ text: "Открыть заявку", web_app: { url: webApp } }] : undefined,
      },
    );
  }

  private async notifyBothAboutAcceptedOffer(offerId: bigint) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        request: {
          include: {
            parent: { include: { user: true } },
          },
        },
        specialistProfile: { include: { user: true } },
      },
    });
    if (!offer) return;

    const parent = offer.request.parent;
    const specialist = offer.specialistProfile;

    const webApp = this.telegram.buildWebAppUrl(`/requests/${offer.requestId.toString()}`);

    const parentTitle = parent.displayName ?? parent.user?.username ?? "Мама";
    const specialistTitle = specialist.displayName ?? specialist.user?.username ?? "Специалист";

    const parentTgId = parent.user?.telegramId;
    const specialistTgId = specialist.user?.telegramId;
    const parentChatUrl = parentTgId != null ? `tg://user?id=${parentTgId.toString()}` : null;
    const specialistChatUrl = specialistTgId != null ? `tg://user?id=${specialistTgId.toString()}` : null;

    // Message to parent (только если привязан Telegram)
    if (parentTgId != null) {
      await this.telegram.sendMessage(
        parentTgId,
        [
          "✅ Вы приняли отклик",
          "",
          `Заявка: ${offer.request.category}`,
          `Исполнитель: ${specialistTitle}`,
          "",
          "Теперь можно перейти в личные сообщения и договориться о деталях.",
        ].join("\n"),
        {
          buttons: [
            ...(specialistChatUrl ? [{ text: "Написать исполнителю", url: specialistChatUrl } as const] : []),
            ...(webApp ? [{ text: "Открыть заявку", web_app: { url: webApp } } as const] : []),
          ],
        },
      );
    }

    // Message to specialist (только если привязан Telegram)
    if (specialistTgId != null) {
      await this.telegram.sendMessage(
        specialistTgId,
        [
          "🎉 Ваш отклик принят!",
          "",
          `Заявка: ${offer.request.category}`,
          `Заказчик: ${parentTitle}`,
          "",
          "Напишите заказчику в личку, чтобы согласовать время и детали.",
        ].join("\n"),
        {
          buttons: [
            ...(parentChatUrl ? [{ text: "Написать заказчику", url: parentChatUrl } as const] : []),
            ...(webApp ? [{ text: "Открыть заявку", web_app: { url: webApp } } as const] : []),
          ],
        },
      );
    }
  }

  async createForRequest(userId: bigint, requestId: bigint, dto: { priceOffer?: number | null; comment?: string | null }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "specialist" && active.type !== "company") throw new BadRequestException("Active profile is not specialist or company");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "active") throw new BadRequestException("Request is not active");

    const comment = dto?.comment?.trim();
    if (!comment) throw new BadRequestException("Напишите комментарий к отклику");
    if (comment.length < 10) throw new BadRequestException("Комментарий должен быть не короче 10 символов");

    const price = dto?.priceOffer;
    if (price == null || price === undefined) throw new BadRequestException("Укажите цену");
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) throw new BadRequestException("Укажите корректную цену (0 или больше)");

    let createdOrUpdated = null as any;
    try {
      createdOrUpdated = await this.prisma.offer.create({
        data: {
          requestId,
          specialistProfileId: active.id,
          priceOffer: priceNum,
          comment,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        // Offer already exists for (requestId, specialistProfileId). Instead of failing,
        // update it so the specialist can adjust price/comment or resend after rejection.
        const existing = await this.prisma.offer.findFirst({
          where: { requestId, specialistProfileId: active.id },
        });
        if (!existing) throw e;

        createdOrUpdated = await this.prisma.offer.update({
          where: { id: existing.id },
          data: {
            priceOffer: priceNum,
            comment,
            // Allow "resend" after reject/cancel by moving back to pending
            status: existing.status === "rejected" || existing.status === "cancelled" ? "pending" : undefined,
          },
        });
      } else {
        throw e;
      }
    }

    // Notify parent in bot (best-effort; do not block request)
    void this.notifyParentAboutOffer(requestId, BigInt(createdOrUpdated.id));

    return createdOrUpdated;
  }

  async mine(userId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "specialist" && active.type !== "company") throw new BadRequestException("Active profile is not specialist or company");

    return this.prisma.offer.findMany({
      where: { specialistProfileId: active.id },
      orderBy: { createdAt: "desc" },
      include: { request: true },
    });
  }

  async accept(userId: bigint, offerId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const updated = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { request: true },
      });
      if (!offer) throw new NotFoundException("Offer not found");
      if (offer.request.parentProfileId !== active.id) throw new NotFoundException("Offer not found");

      // Prevent accepting multiple offers: after first acceptance request becomes in_progress.
      if (offer.status === "accepted") return offer;
      if (offer.request.status !== "active") {
        throw new BadRequestException("Request is not active");
      }

      const updated = await tx.offer.update({
        where: { id: offerId },
        data: { status: "accepted" },
      });

      await tx.offer.updateMany({
        where: { requestId: offer.requestId, id: { not: offerId }, status: { in: ["pending", "accepted"] } },
        data: { status: "rejected" },
      });

      await tx.request.update({
        where: { id: offer.requestId },
        data: { status: "in_progress" },
      });

      return updated;
    });

    // Notify both sides (best-effort; do not block acceptance)
    void this.notifyBothAboutAcceptedOffer(BigInt(updated.id));

    return updated;
  }

  async reject(userId: bigint, offerId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: true },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.request.parentProfileId !== active.id) throw new NotFoundException("Offer not found");

    return this.prisma.offer.update({ where: { id: offerId }, data: { status: "rejected" } });
  }
}

