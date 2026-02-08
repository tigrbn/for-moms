import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { Request } from "express";

@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async me(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        photoUrl: true,
        activeProfileId: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Raw query гарантирует получение всех колонок (age, district и т.д.) независимо от версии Prisma Client
    const profilesRaw = await this.prisma.$queryRaw<
      Array<{
        id: bigint;
        type: string;
        is_active: boolean;
        display_name: string | null;
        avatar_url: string | null;
        age: number | null;
        city: string | null;
        district: string | null;
      }>
    >`SELECT id, type, is_active, display_name, avatar_url, age, city, district FROM profiles WHERE user_id = ${userId}`;

    const profileIds = profilesRaw.map((r) => r.id);

    type SpecialistRow = { profile_id: bigint; skills: unknown; price_per_hour: number | null; about: string | null };
    type ParentRow = { profile_id: bigint; children_ages: unknown; special_wishes: string | null };

    const specialists: SpecialistRow[] =
      profileIds.length > 0
        ? await this.prisma.$queryRaw<SpecialistRow[]>(
            Prisma.sql`SELECT profile_id, skills, price_per_hour, about FROM specialist_profiles WHERE profile_id IN (${Prisma.join(profileIds)})`,
          )
        : [];
    const parents: ParentRow[] =
      profileIds.length > 0
        ? await this.prisma.$queryRaw<ParentRow[]>(
            Prisma.sql`SELECT profile_id, children_ages, special_wishes FROM parent_profiles WHERE profile_id IN (${Prisma.join(profileIds)})`,
          )
        : [];

    const specialistByProfileId = new Map(specialists.map((s) => [s.profile_id.toString(), s]));
    const parentByProfileId = new Map(parents.map((p) => [p.profile_id.toString(), p]));

    function parseSkills(raw: unknown): string[] {
      if (raw == null) return [];
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string");
          if (typeof parsed === "string") return [parsed];
        } catch {
          return raw ? [raw] : [];
        }
        return [];
      }
      if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === "string");
      if (typeof raw === "object" && raw !== null) return Object.values(raw).filter((s): s is string => typeof s === "string");
      return [];
    }

    const profiles = profilesRaw.map((p) => {
      const base = {
        id: p.id.toString(),
        type: p.type as "parent" | "specialist",
        isActive: p.is_active,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        age: p.age,
        city: p.city,
        district: p.district,
      };
      if (p.type === "specialist") {
        const spec = specialistByProfileId.get(base.id);
        return {
          ...base,
          specialist: {
            skills: spec ? parseSkills(spec.skills) : [],
            pricePerHour: spec?.price_per_hour ?? null,
            about: spec?.about ?? null,
          },
        };
      }
      if (p.type === "parent") {
        const par = parentByProfileId.get(base.id);
        const childrenAges = par?.children_ages;
        const arr = Array.isArray(childrenAges) ? childrenAges : childrenAges != null && typeof childrenAges === "object" ? Object.values(childrenAges) : null;
        return {
          ...base,
          parent: {
            childrenAges: arr != null && arr.length > 0 ? (arr.filter((n): n is number => typeof n === "number") as number[]) : null,
            specialWishes: par?.special_wishes ?? null,
          },
        };
      }
      return base;
    });

    return {
      user: {
        id: user.id.toString(),
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
      },
      profiles,
      activeProfileId: user.activeProfileId ? user.activeProfileId.toString() : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("active-profile")
  async setActiveProfile(@Req() req: Request, @Body() body: { profileId: string }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profileId = body?.profileId;
    if (!profileId) throw new BadRequestException("profileId is required");

    const profile = await this.prisma.profile.findUnique({
      where: { id: BigInt(profileId) },
      select: { id: true, userId: true, isActive: true },
    });

    if (!profile || profile.userId !== userId) throw new NotFoundException("Profile not found");
    if (!profile.isActive) throw new BadRequestException("Profile is inactive");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeProfileId: profile.id },
      select: { activeProfileId: true },
    });

    return { activeProfileId: updated.activeProfileId?.toString() ?? null };
  }
}

