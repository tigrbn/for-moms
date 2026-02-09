import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: bigint, dto: { category: string; childAge?: number | null; description?: string | null; startAt?: string | null; durationMin?: number | null; budget?: number | null; district?: string | null }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");
    if (!dto?.category) throw new BadRequestException("category is required");

    return this.prisma.request.create({
      data: {
        parentProfileId: active.id,
        category: dto.category,
        childAge: dto.childAge ?? null,
        description: dto.description ?? null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        durationMin: dto.durationMin ?? null,
        budget: dto.budget ?? null,
        district: dto.district ?? null,
      },
    });
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

    return { ...request, currentUserHasReviewed: !!existingReview };
  }

  async update(userId: bigint, requestId: bigint, dto: { category?: string; childAge?: number | null; description?: string | null; startAt?: string | null; durationMin?: number | null; budget?: number | null; district?: string | null; status?: "active" | "in_progress" | "done" | "cancelled" }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request || request.parentProfileId !== active.id) throw new NotFoundException("Request not found");

    const nextStatus = dto.status;
    const completedAt = nextStatus === "done" ? new Date() : undefined;

    return this.prisma.request.update({
      where: { id: requestId },
      data: {
        category: dto.category ?? undefined,
        childAge: dto.childAge ?? undefined,
        description: dto.description ?? undefined,
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
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "parent") throw new BadRequestException("Active profile is not parent");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request || request.parentProfileId !== active.id) throw new NotFoundException("Request not found");

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

