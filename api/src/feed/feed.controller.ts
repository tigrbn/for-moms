import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { getActiveProfileOrThrow } from "../common/active-profile";
import { PrismaService } from "../prisma/prisma.service";

/** Родительская категория → список значений навыка (родитель + все подкатегории). Совпадает с деревом на фронте. */
const PARENT_CATEGORY_SKILLS: Record<string, string[]> = {
  Няня: [
    "Няня",
    "Няня на час",
    "Няня на полный день",
    "Няня с проживанием",
    "Выходного дня",
    "Сиделка для ребенка",
    "Водитель-няня",
  ],
  Репетитор: [
    "Репетитор",
    "Начальная школа",
    "Иностранные языки",
    "Подготовка к школе",
    "ОГЭ/ЕГЭ",
    "Спорт и танцы",
    "Музыка и творчество",
  ],
  Досуг: [
    "Досуг",
    "Аниматоры на праздник",
    "Мастер-классы",
    "Квесты для детей",
    "Походы в музеи/театр",
    "Организация Дня Рождения",
    "Детские лагеря",
  ],
};

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

    async function getOtherPostItems() {
      const posts = await this.prisma.feedPost.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          profile: {
            include: {
              user: { select: { username: true, photoUrl: true } },
            },
          },
        },
      });
      return posts.map((post) => {
        const p = post.profile;
        const images = Array.isArray(post.images)
          ? (post.images as string[])
          : typeof post.images === "string"
            ? [post.images]
            : [];
        return {
          kind: "other_post" as const,
          post: {
            id: post.id.toString(),
            content: post.content,
            images,
            createdAt: post.createdAt.toISOString(),
            author: {
              displayName: p.displayName ?? "Пользователь",
              avatarUrl: p.avatarUrl ?? null,
              photoUrl: p.user?.photoUrl ?? null,
              username: p.user?.username ?? null,
            },
          },
        };
      });
    }

    const categoryNorm = category?.trim() ?? "";
    if (categoryNorm === "Объявления") {
      const postItems = await getOtherPostItems.call(this);
      return {
        role: active.type as "parent" | "specialist",
        items: [...bannerItems, ...postItems],
      };
    }

    const isCategoryAll = categoryNorm === "";

    /** Карточки специалистов в ленте (и родители, и специалисты видят других специалистов для связи). */
    async function getSpecialistProfileItems(): Promise<
      Array<{ kind: "specialist_profile"; isPromoted: boolean; profile: Record<string, unknown> }
    > {
      const profileWhere: any = { type: "specialist", isActive: true };
      if (district?.trim()) {
        profileWhere.district = { equals: district.trim(), mode: "insensitive" };
      }
      let specialists = await this.prisma.profile.findMany({
        where: profileWhere,
        include: {
          user: { select: { username: true, photoUrl: true } },
          specialistProfile: true,
          specialistPortfolio: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
        },
        orderBy: [{ promotedUntil: "desc" }, { ratingAvg: "desc" }],
        take: 100,
      });
      if (category?.trim()) {
        const catTrim = category.trim();
        const allowedSkills = PARENT_CATEGORY_SKILLS[catTrim];
        specialists = specialists.filter((p) => {
          const skills = p.specialistProfile?.skills;
          if (!skills) return false;
          const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
          if (allowedSkills) {
            return arr.some((s: unknown) => allowedSkills.includes(String(s).trim()));
          }
          const cat = catTrim.toLowerCase();
          return arr.some((s: unknown) => String(s).toLowerCase().includes(cat));
        });
      }
      specialists = specialists.filter((p) => {
        const name = p.displayName?.trim();
        if (!name) return false;
        const skills = p.specialistProfile?.skills;
        if (!skills) return false;
        const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
        return arr.some((s: unknown) => String(s).trim() !== "");
      });
      return specialists.slice(0, 50).map((p) => {
        const skills = p.specialistProfile?.skills;
        const skillArr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
        const cat = skillArr.length > 0 ? String(skillArr[0]) : null;
        const portfolioImageUrls = p.specialistPortfolio?.map((i) => i.imageUrl) ?? [];
        return {
          kind: "specialist_profile" as const,
          isPromoted: Boolean(p.promotedUntil && p.promotedUntil > now),
          profile: {
            id: p.id.toString(),
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            gender: p.gender ?? null,
            photoUrl: p.user?.photoUrl ?? null,
            category: cat,
            city: p.city,
            district: p.district,
            ratingAvg: p.ratingAvg.toString(),
            ratingCount: p.ratingCount,
            pricePerHour: p.specialistProfile?.pricePerHour ?? null,
            portfolioImageUrls,
          },
        };
      });
    }

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
      const toImages = (raw: unknown): string[] => {
        if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string");
        if (typeof raw === "string") return [raw];
        return [];
      };
      const requestItems = requests.map((r) => ({
        kind: "request" as const,
        request: {
          id: r.id.toString(),
          category: r.category,
          childAge: r.childAge,
          description: r.description,
          images: toImages((r as { images?: unknown }).images),
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
            ratingAvg: r.parent.ratingAvg != null ? String(r.parent.ratingAvg) : "0",
            ratingCount: r.parent.ratingCount ?? 0,
          },
        },
      }));
      const specialistItems = await getSpecialistProfileItems.call(this);
      if (isCategoryAll) {
        const postItems = await getOtherPostItems.call(this);
        return {
          role: "specialist" as const,
          items: [...bannerItems, ...requestItems, ...specialistItems, ...postItems],
        };
      }
      return {
        role: "specialist" as const,
        items: [...bannerItems, ...requestItems, ...specialistItems],
      };
    }

    // parent: show specialist profiles (тот же набор карточек, что и для специалистов)
    const specialistItems = await getSpecialistProfileItems.call(this);
    if (isCategoryAll) {
      const postItems = await getOtherPostItems.call(this);
      return {
        role: "parent" as const,
        items: [...bannerItems, ...specialistItems, ...postItems],
      };
    }
    return {
      role: "parent" as const,
      items: [...bannerItems, ...specialistItems],
    };
  }
}
