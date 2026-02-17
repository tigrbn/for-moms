import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { isAdminUser } from "../common/admin";
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

    const consentLogs = await this.prisma.consentLog.findMany({
      where: { userId },
      select: { consentType: true },
    });
    const consentTypes = new Set(consentLogs.map((c) => c.consentType));
    const consentedUserAgreement = consentTypes.has("user_agreement");
    const consentedPolicy = consentTypes.has("policy");

    // Raw query гарантирует получение всех колонок (age, district и т.д.) независимо от версии Prisma Client
    const profilesRaw = await this.prisma.$queryRaw<
      Array<{
        id: bigint;
        type: string;
        is_active: boolean;
        display_name: string | null;
        avatar_url: string | null;
        gender: string | null;
        age: number | null;
        city: string | null;
        district: string | null;
        contact_phone: string | null;
        show_contact_phone_publicly: boolean;
      }>
    >`SELECT id, type, is_active, display_name, avatar_url, gender, age, city, district, contact_phone, show_contact_phone_publicly FROM profiles WHERE user_id = ${userId}`;

    const profileIds = profilesRaw.map((r) => r.id);
    // Числа для IN: BigInt в raw-запросах Prisma может ломать привязку параметров
    const profileIdsNum = profileIds.map((id) => Number(id));

    type SpecialistRow = { profile_id: bigint; skills: unknown; price_per_hour: number | null; about: string | null; notify_new_requests_in_category: boolean };
    type ParentRow = { profile_id: bigint; children_ages: unknown; special_wishes: string | null };

    const specialists: SpecialistRow[] =
      profileIdsNum.length > 0
        ? await this.prisma.$queryRaw<SpecialistRow[]>(
            Prisma.sql`SELECT profile_id, skills, price_per_hour, about, COALESCE(notify_new_requests_in_category, false) AS notify_new_requests_in_category FROM specialist_profiles WHERE profile_id IN (${Prisma.join(profileIdsNum)})`,
          )
        : [];
    const parents: ParentRow[] =
      profileIdsNum.length > 0
        ? await this.prisma.$queryRaw<ParentRow[]>(
            Prisma.sql`SELECT profile_id, children_ages, special_wishes FROM parent_profiles WHERE profile_id IN (${Prisma.join(profileIdsNum)})`,
          )
        : [];

    const specialistByProfileId = new Map(specialists.map((s) => [String(Number(s.profile_id)), s]));
    const parentByProfileId = new Map(parents.map((p) => [String(Number(p.profile_id)), p]));

    const portfolioRows =
      profileIdsNum.length > 0
        ? await this.prisma.specialistPortfolio.findMany({
            where: { profileId: { in: profileIds } },
            orderBy: { sortOrder: "asc" },
            select: { profileId: true, imageUrl: true },
          })
        : [];
    const portfolioByProfileId = new Map<string, string[]>();
    for (const row of portfolioRows) {
      const key = String(Number(row.profileId));
      if (!portfolioByProfileId.has(key)) portfolioByProfileId.set(key, []);
      portfolioByProfileId.get(key)!.push(row.imageUrl);
    }

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
      const profileType = (typeof p.type === "string" ? p.type.toLowerCase() : String(p.type)) as "parent" | "specialist" | "shop";
      const base = {
        id: p.id.toString(),
        type: profileType,
        isActive: p.is_active,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
        age: p.age,
        city: p.city,
        district: p.district,
        contactPhone: (p as { contact_phone?: string | null }).contact_phone ?? null,
        showContactPhonePublicly: (p as { show_contact_phone_publicly?: boolean }).show_contact_phone_publicly ?? false,
      };
      const profileIdKey = base.id;
      if (profileType === "specialist") {
        const spec = specialistByProfileId.get(profileIdKey);
        const portfolioImageUrls = portfolioByProfileId.get(profileIdKey) ?? [];
        return {
          ...base,
          specialist: {
            skills: spec ? parseSkills(spec.skills) : [],
            pricePerHour: spec?.price_per_hour ?? null,
            about: spec?.about ?? null,
            notifyNewRequestsInCategory: spec?.notify_new_requests_in_category ?? false,
            portfolioImageUrls,
          },
        };
      }
      if (profileType === "parent") {
        const par = parentByProfileId.get(profileIdKey);
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

    const isAdmin = await isAdminUser(this.prisma, userId);

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
      consentedUserAgreement,
      consentedPolicy,
      isAdmin,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("consent")
  async recordConsent(
    @Req() req: Request,
    @Body() body: { userAgreement?: boolean; policy?: boolean; version?: string },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const version = (body?.version ?? "v1.0").toString();
    const toCreate: { userId: bigint; consentType: string; documentVersion: string }[] = [];
    if (body?.userAgreement) toCreate.push({ userId, consentType: "user_agreement", documentVersion: version });
    if (body?.policy) toCreate.push({ userId, consentType: "policy", documentVersion: version });
    if (toCreate.length === 0) throw new BadRequestException("At least one of userAgreement or policy must be true");
    await this.prisma.consentLog.createMany({ data: toCreate });
    return { ok: true };
  }

  /** Записать визит родителя (для метрики Conversion Parent → Order). Вызывать при входе в ленту. */
  @UseGuards(JwtAuthGuard)
  @Post("visit")
  async recordVisit(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });
    if (!user?.activeProfileId) return { ok: true };
    const profile = await this.prisma.profile.findUnique({
      where: { id: user.activeProfileId },
      select: { id: true, type: true },
    });
    if (!profile || profile.type !== "parent") return { ok: true };
    await this.prisma.parentVisit.create({
      data: { parentProfileId: profile.id },
    });
    return { ok: true };
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

