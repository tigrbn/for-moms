import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async createForRequest(userId: bigint, requestId: bigint, dto: { priceOffer?: number | null; comment?: string | null }) {
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    if (active.type !== "specialist") throw new BadRequestException("Active profile is not specialist");

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "active") throw new BadRequestException("Request is not active");

    try {
      return await this.prisma.offer.create({
        data: {
          requestId,
          specialistProfileId: active.id,
          priceOffer: dto.priceOffer ?? null,
          comment: dto.comment ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw new BadRequestException("You already sent an offer for this request");
      }
      throw e;
    }
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

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { request: true },
      });
      if (!offer) throw new NotFoundException("Offer not found");
      if (offer.request.parentProfileId !== active.id) throw new NotFoundException("Offer not found");

      const updated = await tx.offer.update({
        where: { id: offerId },
        data: { status: "accepted" },
      });

      await tx.offer.updateMany({
        where: { requestId: offer.requestId, id: { not: offerId }, status: { in: ["pending"] } },
        data: { status: "rejected" },
      });

      await tx.request.update({
        where: { id: offer.requestId },
        data: { status: "in_progress" },
      });

      return updated;
    });
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

