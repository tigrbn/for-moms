import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { getActiveProfileOrThrow } from "../common/active-profile";

@UseGuards(JwtAuthGuard)
@Controller("feed")
export class FeedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async feed(
    @Req() req: Request,
    @Query("district") district?: string,
    @Query("category") category?: string,
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const active = await getActiveProfileOrThrow(this.prisma, userId);

    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    if (active.type === "parent") {
      const specialists = await this.prisma.profile.findMany({
        where: {
          type: "specialist",
          isActive: true,
          ...(district ? { district } : {}),
        },
        orderBy: [{ promotedUntil: "desc" }, { createdAt: "desc" }],
        take: 30,
      });

      return {
        role: "parent" as const,
        items: [
          ...banners.map((b) => ({
            kind: "banner" as const,
            id: b.id.toString(),
            imageUrl: b.imageUrl,
            targetUrl: b.targetUrl,
          })),
          ...specialists.map((p) => ({
            kind: "specialist_profile" as const,
            isPromoted: p.promotedUntil ? p.promotedUntil.getTime() > Date.now() : false,
            profile: {
              id: p.id.toString(),
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              city: p.city,
              district: p.district,
              ratingAvg: p.ratingAvg.toString(),
              ratingCount: p.ratingCount,
            },
          })),
        ],
      };
    }

    if (active.type === "specialist") {
      const requests = await this.prisma.request.findMany({
        where: {
          status: "active",
          ...(district ? { district } : {}),
          ...(category ? { category } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      return {
        role: "specialist" as const,
        items: [
          ...banners.map((b) => ({
            kind: "banner" as const,
            id: b.id.toString(),
            imageUrl: b.imageUrl,
            targetUrl: b.targetUrl,
          })),
          ...requests.map((r) => ({
            kind: "request" as const,
            request: {
              id: r.id.toString(),
              category: r.category,
              childAge: r.childAge,
              description: r.description,
              startAt: r.startAt?.toISOString() ?? null,
              durationMin: r.durationMin,
              budget: r.budget,
              district: r.district,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
            },
          })),
        ],
      };
    }

    throw new BadRequestException("Feed is not implemented for this profile type");
  }
}

