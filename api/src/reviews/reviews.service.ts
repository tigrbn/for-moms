import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "../telegram/telegram.service";
import { getActiveProfileOrThrow } from "../common/active-profile";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async create(
    userId: bigint,
    dto: {
      toProfileId: string;
      requestId: string;
      rating: number;
      text?: string | null;
    },
  ) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent" && active.type !== "specialist") {
      throw new BadRequestException("Active profile must be parent or specialist");
    }

    if (!dto?.toProfileId) throw new BadRequestException("toProfileId is required");
    if (!dto?.requestId) throw new BadRequestException("requestId is required");
    if (!dto?.rating || dto.rating < 1 || dto.rating > 5) throw new BadRequestException("rating must be 1..5");

    const toProfileId = BigInt(dto.toProfileId);
    const requestId = BigInt(dto.requestId);

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { offers: true },
    });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "done" || !request.completedAt) throw new BadRequestException("Request is not completed");

    const accepted = request.offers.find((o) => o.status === "accepted") ?? null;
    if (!accepted) throw new BadRequestException("Request has no accepted offer");

    // Access + allowed recipient:
    // - parent can review the accepted specialist
    // - specialist can review the parent
    if (active.type === "parent") {
      if (request.parentProfileId !== active.id) throw new NotFoundException("Request not found");
      if (toProfileId !== accepted.specialistProfileId) throw new BadRequestException("Invalid toProfileId for this request");
    } else {
      // specialist
      if (active.id !== accepted.specialistProfileId) throw new NotFoundException("Request not found");
      if (toProfileId !== request.parentProfileId) throw new BadRequestException("Invalid toProfileId for this request");
    }

    const existing = await this.prisma.review.findFirst({
      where: { fromProfileId: active.id, requestId },
      select: { id: true },
    });
    if (existing) throw new BadRequestException("Review already exists for this request");

    const created = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          fromProfileId: active.id,
          toProfileId,
          requestId,
          rating: dto.rating,
          text: dto.text ?? null,
        },
      });

      const agg = await tx.review.aggregate({
        where: { toProfileId, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avg = agg._avg.rating ?? 0;
      const cnt = agg._count.rating ?? 0;

      await tx.profile.update({
        where: { id: toProfileId },
        data: {
          // Prisma accepts string for Decimal fields
          ratingAvg: Number(avg).toFixed(1),
          ratingCount: cnt,
        },
      });

      return review;
    });

    void this.notifyAboutNewReview(toProfileId, active.displayName ?? "Кто-то", dto.rating);
    return created;
  }

  private async notifyAboutNewReview(toProfileId: bigint, fromDisplayName: string, rating: number) {
    const toProfile = await this.prisma.profile.findUnique({
      where: { id: toProfileId },
      include: { user: { select: { telegramId: true } } },
    });
    if (!toProfile?.user?.telegramId) return;

    const stars = "⭐".repeat(rating);
    const webAppUrl = this.telegram.buildWebAppUrl(`/profile`);
    const isParent = toProfile.type === "parent";
    const title = isParent
      ? "💬 Специалист оставил отзыв о работе с вами"
      : "💬 Вам оставили отзыв";
    const text = [
      title,
      "",
      `${fromDisplayName} поставил(а) оценку: ${stars} (${rating}/5)`,
      "",
      "Посмотреть отзыв можно в своём профиле.",
    ].join("\n");

    await this.telegram.sendMessage(toProfile.user.telegramId, text, {
      buttons: webAppUrl ? [{ text: "Открыть профиль", web_app: { url: webAppUrl } }] : undefined,
    });
  }

  async listForProfile(profileId: bigint) {
    return this.prisma.review.findMany({
      where: { toProfileId: profileId, isHidden: false },
      orderBy: { createdAt: "desc" },
      include: {
        fromProfile: {
          select: {
            id: true,
            type: true,
            displayName: true,
            avatarUrl: true,
            gender: true,
            user: { select: { photoUrl: true, firstName: true, lastName: true, deletedAt: true } },
          },
        },
        request: { select: { category: true } },
      },
    });
  }
}

