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

    const parentChatId = offer.request.parent.user.telegramId;
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

    const parentTitle = parent.displayName ?? parent.user.username ?? "Мама";
    const specialistTitle = specialist.displayName ?? specialist.user.username ?? "Специалист";

    const parentChatUrl = `tg://user?id=${parent.user.telegramId.toString()}`;
    const specialistChatUrl = `tg://user?id=${specialist.user.telegramId.toString()}`;

    // Message to parent
    await this.telegram.sendMessage(
      parent.user.telegramId,
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
          { text: "Написать исполнителю", url: specialistChatUrl },
          ...(webApp ? [{ text: "Открыть заявку", web_app: { url: webApp } } as const] : []),
        ],
      },
    );

    // Message to specialist
    await this.telegram.sendMessage(
      specialist.user.telegramId,
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
          { text: "Написать заказчику", url: parentChatUrl },
          ...(webApp ? [{ text: "Открыть заявку", web_app: { url: webApp } } as const] : []),
        ],
      },
    );
  }

  async createForRequest(userId: bigint, requestId: bigint, dto: { priceOffer?: number | null; comment?: string | null }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "specialist") throw new BadRequestException("Active profile is not specialist");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "active") throw new BadRequestException("Request is not active");

    let createdOrUpdated = null as any;
    try {
      createdOrUpdated = await this.prisma.offer.create({
        data: {
          requestId,
          specialistProfileId: active.id,
          priceOffer: dto.priceOffer ?? null,
          comment: dto.comment ?? null,
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
            priceOffer: dto.priceOffer ?? null,
            comment: dto.comment ?? null,
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
    if (active.type !== "specialist") throw new BadRequestException("Active profile is not specialist");

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

