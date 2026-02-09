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
        include: {
          parent: {
            include: {
              user: { select: { photoUrl: true } },
            },
          },
        },
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
          parent: {
            displayName: r.parent.displayName ?? null,
            avatarUrl: r.parent.avatarUrl ?? null,
            photoUrl: r.parent.user?.photoUrl ?? null,
            gender: r.parent.gender ?? null,
          },
        },
      }));
      return {
        role: "specialist" as const,
        items: [...bannerItems, ...requestItems],
      };
    }

    // parent: show specialist profiles (filter by category = skills match)
    const profileWhere: any = { type: "specialist", isActive: true };
    if (district?.trim()) {
      profileWhere.district = { equals: district.trim(), mode: "insensitive" };
    }
    let specialists = await this.prisma.profile.findMany({
      where: profileWhere,
      include: {
        user: { select: { username: true, photoUrl: true } },
        specialistProfile: true,
      },
      orderBy: [{ promotedUntil: "desc" }, { ratingAvg: "desc" }],
      take: 100,
    });
    if (category?.trim()) {
      const cat = category.trim().toLowerCase();
      specialists = specialists.filter((p) => {
        const skills = p.specialistProfile?.skills;
        if (!skills) return false;
        const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
        return arr.some((s: unknown) => String(s).toLowerCase().includes(cat));
      });
    }
    const specialistItems = specialists.slice(0, 50).map((p) => {
      const skills = p.specialistProfile?.skills;
      const skillArr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
      const category = skillArr.length > 0 ? String(skillArr[0]) : null;
      return {
        kind: "specialist_profile" as const,
        isPromoted: Boolean(p.promotedUntil && p.promotedUntil > now),
        profile: {
          id: p.id.toString(),
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          gender: p.gender ?? null,
          photoUrl: p.user?.photoUrl ?? null,
          category,
          city: p.city,
          district: p.district,
          ratingAvg: p.ratingAvg.toString(),
          ratingCount: p.ratingCount,
          pricePerHour: p.specialistProfile?.pricePerHour ?? null,
        },
      };
    });
    return {
      role: "parent" as const,
      items: [...bannerItems, ...specialistItems],
    };
  }
}
