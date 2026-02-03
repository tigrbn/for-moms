import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { getActiveProfileOrThrow } from "../common/active-profile";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("feed")
export class FeedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getFeed(
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
      take: 5,
    });

    const bannerItems = banners.map((b) => ({
      kind: "banner" as const,
      id: b.id.toString(),
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl ?? null,
    }));

    if (active.type === "specialist") {
      const where: any = { status: "active" };
      if (district?.trim()) {
        where.district = { equals: district.trim(), mode: "insensitive" };
      }
      if (category?.trim()) {
        where.category = { contains: category.trim(), mode: "insensitive" };
      }
      const requests = await this.prisma.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const requestItems = requests.map((r) => ({
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
      }));
      return {
        role: "specialist" as const,
        items: [...bannerItems, ...requestItems],
      };
    }

    // parent or shop: show specialist profiles
    const profileWhere: any = { type: "specialist", isActive: true };
    if (district?.trim()) {
      profileWhere.district = { equals: district.trim(), mode: "insensitive" };
    }
    const specialists = await this.prisma.profile.findMany({
      where: profileWhere,
      include: {
        user: { select: { username: true } },
        specialistProfile: true,
      },
      orderBy: [{ promotedUntil: "desc" }, { ratingAvg: "desc" }],
      take: 50,
    });
    const specialistItems = specialists.map((p) => ({
      kind: "specialist_profile" as const,
      isPromoted: Boolean(p.promotedUntil && p.promotedUntil > now),
      profile: {
        id: p.id.toString(),
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        city: p.city,
        district: p.district,
        ratingAvg: p.ratingAvg.toString(),
        ratingCount: p.ratingCount,
        pricePerHour: p.specialistProfile?.pricePerHour ?? null,
      },
    }));
    return {
      role: "parent" as const,
      items: [...bannerItems, ...specialistItems],
    };
  }
}
