import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";
import { isAdminUser } from "../common/admin";
import { getParentCategory } from "../categories";
import { TelegramService } from "../telegram/telegram.service";

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async create(userId: bigint, dto: { category: string; childAge?: number | null; description?: string | null; startAt?: string | null; durationMin?: number | null; budget?: number | null; district?: string | null }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");
    if (!dto?.category?.trim()) throw new BadRequestException("Укажите категорию");
    const desc = dto?.description?.trim();
    if (!desc) throw new BadRequestException("Заполните описание заявки");
    if (desc.length < 10) throw new BadRequestException("Описание должно быть не короче 10 символов");
    if (desc.length > 2000) throw new BadRequestException("Описание не должно превышать 2000 символов");

    const request = await this.prisma.request.create({
      data: {
        parentProfileId: active.id,
        category: dto.category,
        childAge: dto.childAge ?? null,
        description: desc,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        durationMin: dto.durationMin ?? null,
        budget: dto.budget ?? null,
        district: dto.district ?? null,
      },
    });

    void this.notifySpecialistsAboutNewRequest(request.id, dto.category);
    return request;
  }

  /** Отправить в Telegram специалистам с подпиской на новые заявки по этой категории */
  private async notifySpecialistsAboutNewRequest(requestId: bigint, category: string) {
    const categoryTrim = category?.trim();
    if (!categoryTrim) return;

    const specialists = await this.prisma.profile.findMany({
      where: { type: "specialist" },
      include: {
        specialistProfile: true,
        user: { select: { telegramId: true } },
      },
    });

    const parentCategory = getParentCategory(categoryTrim)?.trim().toLowerCase() ?? categoryTrim.toLowerCase();
    const skillsIncludesCategory = (skills: unknown): boolean => {
      if (skills == null) return false;
      const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
      return arr.some((s) => {
        const skillNorm = String(s).trim().toLowerCase();
        return skillNorm === categoryTrim.toLowerCase() || skillNorm === parentCategory;
      });
    };

    const webAppUrl = this.telegram.buildWebAppUrl(`/requests/${requestId.toString()}`);
    const text = [
      "🆕 Новая заявка по вашей категории",
      "",
      `Категория: ${categoryTrim}`,
      "",
      "Откройте заявку в Mini App, чтобы откликнуться.",
    ].join("\n");

    let sent = 0;
    for (const p of specialists) {
      if (!p.specialistProfile?.notifyNewRequestsInCategory) continue;
      if (!p.user?.telegramId) {
        this.logger.warn(`Specialist profile ${p.id}: no telegramId, skipping notification`);
        continue;
      }
      if (!skillsIncludesCategory(p.specialistProfile.skills)) continue;
      await this.telegram.sendMessage(p.user.telegramId, text, {
        buttons: webAppUrl ? [{ text: "Открыть заявку", web_app: { url: webAppUrl } }] : undefined,
      });
      sent++;
    }
    this.logger.log(`New request ${requestId} category=${categoryTrim} parent=${parentCategory}: notified ${sent} specialist(s)`);
  }

  async mine(userId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const requests = await this.prisma.request.findMany({
      where: { parentProfileId: active.id },
      orderBy: { createdAt: "desc" },
      include: { offers: true },
    });

    const epoch0 = new Date(0);
    return requests.map((r) => {
      const seenAt = r.parentLastSeenAt ?? epoch0;
      const newOffersCount = r.offers.filter((o) => o.createdAt > seenAt).length;
      return {
        ...r,
        offersCount: r.offers.length,
        newOffersCount,
      };
    });
  }

  async newOffersCount(userId: bigint): Promise<number> {
    const items = await this.mine(userId);
    return items.reduce((sum, r) => sum + r.newOffersCount, 0);
  }

  async get(userId: bigint, requestId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        offers: {
          include: {
            specialistProfile: {
              include: {
                user: {
                  select: {
                    username: true,
                    firstName: true,
                    lastName: true,
                    photoUrl: true,
                  },
                },
                specialistProfile: true,
              },
            },
          },
        },
        parent: {
          include: {
            user: {
              select: { username: true, firstName: true, lastName: true, photoUrl: true },
            },
            parentProfile: true,
          },
        },
      },
    });
    if (!request) throw new NotFoundException("Request not found");

    // access rules:
    // - parent owner can view
    // - specialist can view (public feed)
    if (active.type === "parent" && request.parentProfileId !== active.id) {
      throw new NotFoundException("Request not found");
    }

    // Mark offers as seen when parent opens the request
    if (active.type === "parent" && request.parentProfileId === active.id) {
      await this.prisma.request.update({
        where: { id: requestId },
        data: { parentLastSeenAt: new Date() },
      });
      request.parentLastSeenAt = new Date();
    }

    const existingReview = await this.prisma.review.findFirst({
      where: { requestId, fromProfileId: active.id },
      select: { id: true },
    });

    const acceptedOffer = request.offers.find((o) => o.status === "accepted") ?? null;
    const parentProfile = request.parent.parentProfile;
    const childrenAges = parentProfile?.childrenAges != null && Array.isArray(parentProfile.childrenAges)
      ? (parentProfile.childrenAges as unknown[]).filter((n): n is number => typeof n === "number")
      : null;
    const specialWishes = parentProfile?.specialWishes ?? null;
    const showParentPhone =
      request.parent.showContactPhonePublicly ||
      (acceptedOffer != null && acceptedOffer.specialistProfileId === active.id);
    const parentContactPhone = showParentPhone ? (request.parent.contactPhone ?? null) : undefined;

    const parentDto = {
      ...request.parent,
      childrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null,
      specialWishes,
      contactPhone: parentContactPhone,
    };

    return {
      ...request,
      parent: parentDto,
      currentUserHasReviewed: !!existingReview,
    };
  }

  async update(userId: bigint, requestId: bigint, dto: { category?: string; childAge?: number | null; description?: string | null; startAt?: string | null; durationMin?: number | null; budget?: number | null; district?: string | null; status?: "active" | "in_progress" | "done" | "cancelled" }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request || request.parentProfileId !== active.id) throw new NotFoundException("Request not found");

    if (dto.description !== undefined) {
      const desc = dto.description?.trim();
      if (!desc) throw new BadRequestException("Описание не может быть пустым");
      if (desc.length < 10) throw new BadRequestException("Описание должно быть не короче 10 символов");
      if (desc.length > 2000) throw new BadRequestException("Описание не должно превышать 2000 символов");
    }

    const nextStatus = dto.status;
    const completedAt = nextStatus === "done" ? new Date() : undefined;

    return this.prisma.request.update({
      where: { id: requestId },
      data: {
        category: dto.category ?? undefined,
        childAge: dto.childAge ?? undefined,
        description: dto.description !== undefined ? (dto.description?.trim() || null) : undefined,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        durationMin: dto.durationMin ?? undefined,
        budget: dto.budget ?? undefined,
        district: dto.district ?? undefined,
        status: nextStatus ?? undefined,
        completedAt,
      },
    });
  }

  async delete(userId: bigint, requestId: bigint) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");

    const admin = await isAdminUser(this.prisma, userId);
    if (!admin) {
      const active = await getActiveProfileOrThrow(this.prisma, userId);
      if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");
      if (request.parentProfileId !== active.id) throw new NotFoundException("Request not found");
    }

    await this.prisma.request.delete({ where: { id: requestId } });
  }

  async complete(userId: bigint, requestId: bigint) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { offers: true },
    });
    if (!request || request.parentProfileId !== active.id) throw new NotFoundException("Request not found");

    if (request.status === "done") return request;
    if (request.status !== "in_progress") throw new BadRequestException("Request must be in_progress to complete");

    const accepted = request.offers.find((o) => o.status === "accepted") ?? null;
    if (!accepted) throw new BadRequestException("You must accept an offer before completing the request");

    return this.prisma.request.update({
      where: { id: requestId },
      data: { status: "done", completedAt: new Date() },
    });
  }
}

