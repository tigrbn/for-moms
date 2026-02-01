import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("banners")
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("placement") placement?: string) {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // простая фильтрация по placements (если задано)
    const filtered = placement
      ? banners.filter((b) => {
          const p = b.placements as any;
          if (!p) return true;
          if (Array.isArray(p)) return p.includes(placement);
          if (typeof p === "object") return Boolean(p[placement]);
          return true;
        })
      : banners;

    return filtered.map((b) => ({
      id: b.id.toString(),
      title: b.title,
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl,
      placements: b.placements,
    }));
  }
}

