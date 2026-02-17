import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ProfileType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type PublicProfileDto = {
  id: string;
  type: string;
  isActive: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  district: string | null;
  ratingAvg: string;
  ratingCount: number;
  /** Только для специалиста/компании и только если разрешил показ в анкете */
  contactPhone?: string | null;
  user: { username: string | null; firstName: string | null; lastName: string | null; photoUrl: string | null };
  specialist: { category: string | null; pricePerHour: number | null; about: string | null; portfolioImageUrls?: string[] } | null;
  parent: { childrenAges: number[] | null; specialWishes: string | null } | null;
  company: { companyName: string; inn: string | null; legalAddress: string | null } | null;
};

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: bigint, type: ProfileType) {
    if (type !== "parent" && type !== "specialist" && type !== "company") {
      throw new BadRequestException("Invalid profile type");
    }

    try {
      const profile = await this.prisma.$transaction(async (tx) => {
        const created = await tx.profile.create({
          data: {
            userId,
            type,
            isActive: true,
            ...(type === "parent" ? { parentProfile: { create: {} } } : {}),
            ...(type === "specialist" ? { specialistProfile: { create: {} } } : {}),
            ...(type === "company" ? { specialistProfile: { create: {} }, companyProfile: { create: { companyName: "Компания" } } } : {}),
          },
        });

        // если у пользователя ещё не выбран активный профиль — выберем первый созданный
        await tx.user.updateMany({
          where: { id: userId, activeProfileId: null },
          data: { activeProfileId: created.id },
        });

        return created;
      });

      return profile;
    } catch (e: any) {
      // Unique constraint (userId,type) -> profile already exists
      if (e?.code === "P2002") {
        const existing = await this.prisma.profile.findUnique({
          where: { userId_type: { userId, type } },
        });
        if (!existing) throw e;

        // if user has no active profile, set it
        await this.prisma.user.updateMany({
          where: { id: userId, activeProfileId: null },
          data: { activeProfileId: existing.id },
        });

        return existing;
      }

      // Schema mismatch / missing columns or tables
      if (e?.code === "P2021" || e?.code === "P2022") {
        throw new BadRequestException("Database schema is not up to date. Run: npx prisma migrate deploy");
      }

      throw e;
    }
  }

  /** Создание профиля с заполненными данными (для первого входа: без пустого профиля в БД). */
  async createProfileWithData(
    userId: bigint,
    dto: {
      type: "parent" | "specialist" | "company";
      displayName?: string | null;
      gender?: string | null;
      age?: number | null;
      city?: string | null;
      district?: string | null;
      contactPhone?: string | null;
      showContactPhonePublicly?: boolean;
      parent?: { childrenAges?: number[] | null; specialWishes?: string | null };
      specialist?: { skills?: string[] | null; pricePerHour?: number | null; about?: string | null };
      company?: { companyName?: string | null; inn?: string | null; legalAddress?: string | null };
    },
  ) {
    const { type } = dto;
    if (type !== "parent" && type !== "specialist" && type !== "company") {
      throw new BadRequestException("Invalid profile type");
    }

    const isProvider = type === "specialist" || type === "company";
    if (isProvider) {
      const spec = dto.specialist;
      const skills = spec && Array.isArray(spec.skills) ? spec.skills : spec?.skills ? [spec.skills] : [];
      const hasCategory = skills.length > 0 && skills.some((s) => String(s).trim().length > 0);
      const priceOk =
        spec?.pricePerHour != null &&
        Number.isFinite(Number(spec.pricePerHour)) &&
        Number(spec.pricePerHour) > 0;
      const aboutOk = typeof spec?.about === "string" && spec.about.trim().length > 0;
      if (!hasCategory || !priceOk || !aboutOk) {
        const parts: string[] = [];
        if (!hasCategory) parts.push("категория");
        if (!priceOk) parts.push("цена за час");
        if (!aboutOk) parts.push("о себе");
        throw new BadRequestException(
          `Для профиля ${type === "company" ? "компании" : "специалиста"} обязательны: ${parts.join(", ")}`,
        );
      }
    }
    if (type === "company") {
      const companyName = dto.company?.companyName?.trim();
      if (!companyName) {
        throw new BadRequestException("Укажите название компании");
      }
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          userId,
          type,
          isActive: true,
          displayName: dto.displayName?.trim() || null,
          gender: type === "company" ? null : (dto.gender === "male" || dto.gender === "female" ? dto.gender : null),
          age: type === "company" ? null : dto.age ?? null,
          city: dto.city?.trim() || null,
          district: dto.district?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          showContactPhonePublicly: isProvider ? Boolean(dto.showContactPhonePublicly) : false,
          ...(type === "parent" ? { parentProfile: { create: {} } } : {}),
          ...(type === "specialist" ? { specialistProfile: { create: {} } } : {}),
          ...(type === "company"
            ? {
                specialistProfile: { create: {} },
                companyProfile: {
                  create: {
                    companyName: dto.company!.companyName!.trim(),
                    inn: dto.company!.inn?.trim() || null,
                    legalAddress: dto.company!.legalAddress?.trim() || null,
                  },
                },
              }
            : {}),
        },
      });

      if (type === "parent" && dto.parent) {
        const childrenAges = Array.isArray(dto.parent.childrenAges) ? dto.parent.childrenAges : null;
        const specialWishes = dto.parent.specialWishes?.trim() || null;
        await tx.parentProfile.update({
          where: { profileId: created.id },
          data: { childrenAges: childrenAges ?? Prisma.JsonNull, specialWishes },
        });
      }
      if (isProvider && dto.specialist) {
        const skills = Array.isArray(dto.specialist.skills) ? dto.specialist.skills : dto.specialist.skills ? [dto.specialist.skills] : [];
        await tx.specialistProfile.update({
          where: { profileId: created.id },
          data: {
            skills: skills.length ? (skills as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            pricePerHour: dto.specialist.pricePerHour ?? null,
            about: dto.specialist.about?.trim() || null,
          },
        });
      }

      await tx.user.updateMany({
        where: { id: userId, activeProfileId: null },
        data: { activeProfileId: created.id },
      });

      return created;
    });

    return profile;
  }

  async getOwnedProfileOrThrow(userId: bigint, profileId: bigint) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) throw new NotFoundException("Profile not found");
    return profile;
  }

  async updateBase(
    userId: bigint,
    profileId: bigint,
    data: { displayName?: string | null; avatarUrl?: string | null; gender?: string | null; age?: number | null; city?: string | null; district?: string | null; contactPhone?: string | null; showContactPhonePublicly?: boolean },
  ) {
    await this.getOwnedProfileOrThrow(userId, profileId);

    const updateData: Prisma.ProfileUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(data, "displayName")) {
      updateData.displayName = data.displayName;
    }
    if (Object.prototype.hasOwnProperty.call(data, "avatarUrl")) {
      updateData.avatarUrl = data.avatarUrl;
    }
    if (Object.prototype.hasOwnProperty.call(data, "gender")) {
      updateData.gender = data.gender === "male" || data.gender === "female" ? data.gender : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, "age")) {
      updateData.age = data.age;
    }
    if (Object.prototype.hasOwnProperty.call(data, "city")) {
      updateData.city = data.city;
    }
    if (Object.prototype.hasOwnProperty.call(data, "district")) {
      updateData.district = data.district;
    }
    if (Object.prototype.hasOwnProperty.call(data, "contactPhone")) {
      const v = data.contactPhone;
      updateData.contactPhone = typeof v === "string" && v.trim() === "" ? null : (v ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(data, "showContactPhonePublicly")) {
      updateData.showContactPhonePublicly = Boolean(data.showContactPhonePublicly);
    }

    this.logger.log(`updateBase profileId=${profileId} keys=${Object.keys(updateData).join(",")} gender=${(updateData as { gender?: string | null }).gender ?? "n/a"}`);

    if (Object.keys(updateData).length === 0) {
      return this.prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    }

    return this.prisma.profile.update({
      where: { id: profileId },
      data: updateData,
    });
  }

  async updateParent(userId: bigint, profileId: bigint, data: { childrenAges?: number[] | null; specialWishes?: string | null }) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "parent") throw new BadRequestException("Not a parent profile");

    const childrenAges =
      data.childrenAges === undefined ? undefined : (data.childrenAges === null ? Prisma.JsonNull : data.childrenAges) as Prisma.InputJsonValue | undefined;
    const specialWishes = data.specialWishes !== undefined ? data.specialWishes : undefined;
    return this.prisma.parentProfile.upsert({
      where: { profileId },
      create: { profileId, childrenAges, specialWishes },
      update: { childrenAges, specialWishes },
    });
  }

  async updateCompany(
    userId: bigint,
    profileId: bigint,
    data: { companyName?: string | null; inn?: string | null; legalAddress?: string | null },
  ) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "company") throw new BadRequestException("Not a company profile");

    const companyName = data.companyName !== undefined ? (data.companyName?.trim() || "Компания") : undefined;
    const inn = data.inn !== undefined ? data.inn : undefined;
    const legalAddress = data.legalAddress !== undefined ? data.legalAddress : undefined;

    const company = await this.prisma.companyProfile.upsert({
      where: { profileId },
      create: {
        profileId,
        companyName: companyName ?? "Компания",
        inn: inn ?? null,
        legalAddress: legalAddress ?? null,
      },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(inn !== undefined && { inn }),
        ...(legalAddress !== undefined && { legalAddress }),
      },
    });
    return company;
  }

  async updateSpecialist(
    userId: bigint,
    profileId: bigint,
    data: {
      skills?: string[] | null;
      experienceYears?: number | null;
      ageGroups?: string[] | null;
      pricePerHour?: number | null;
      workDistricts?: string[] | null;
      about?: string | null;
      notifyNewRequestsInCategory?: boolean;
      portfolioImageUrls?: string[];
    },
  ) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "specialist" && profile.type !== "company") throw new BadRequestException("Not a specialist or company profile");

    const skillsJson = (() => {
      const s = data.skills;
      if (s === undefined) return undefined;
      if (s === null) return Prisma.JsonNull;
      if (Array.isArray(s)) return s.filter((x): x is string => typeof x === "string") as unknown as Prisma.InputJsonValue;
      if (typeof s === "string") return [s] as unknown as Prisma.InputJsonValue;
      return undefined;
    })();
    const experienceYears = data.experienceYears !== undefined ? data.experienceYears : undefined;
    const ageGroups =
      data.ageGroups === undefined ? undefined : (data.ageGroups === null ? Prisma.JsonNull : data.ageGroups) as Prisma.InputJsonValue | undefined;
    const pricePerHour = data.pricePerHour !== undefined ? data.pricePerHour : undefined;
    const workDistricts =
      data.workDistricts === undefined ? undefined : (data.workDistricts === null ? Prisma.JsonNull : data.workDistricts) as Prisma.InputJsonValue | undefined;
    const about = data.about !== undefined ? data.about : undefined;
    const notifyNewRequestsInCategory = data.notifyNewRequestsInCategory;

    const specialist = await this.prisma.specialistProfile.upsert({
      where: { profileId },
      create: {
        profileId,
        skills: skillsJson,
        experienceYears,
        ageGroups,
        pricePerHour,
        workDistricts,
        about,
        notifyNewRequestsInCategory: notifyNewRequestsInCategory ?? false,
      },
      update: {
        skills: skillsJson,
        experienceYears,
        ageGroups,
        pricePerHour,
        workDistricts,
        about,
        ...(notifyNewRequestsInCategory !== undefined && { notifyNewRequestsInCategory }),
      },
    });

    if (data.portfolioImageUrls !== undefined) {
      const urls = Array.isArray(data.portfolioImageUrls)
        ? data.portfolioImageUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0).slice(0, 10)
        : [];
      await this.prisma.specialistPortfolio.deleteMany({ where: { profileId } });
      if (urls.length > 0) {
        await this.prisma.specialistPortfolio.createMany({
          data: urls.map((imageUrl, sortOrder) => ({ profileId, imageUrl, sortOrder })),
        });
      }
    }

    return specialist;
  }

  async getPortfolioForProfile(profileId: bigint): Promise<string[]> {
    const rows = await this.prisma.specialistPortfolio.findMany({
      where: { profileId },
      orderBy: { sortOrder: "asc" },
      select: { imageUrl: true },
    });
    return rows.map((r) => r.imageUrl);
  }

  async deleteProfile(userId: bigint, profileId: bigint) {
    await this.getOwnedProfileOrThrow(userId, profileId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, activeProfileId: profileId },
        data: { activeProfileId: null },
      });
      await tx.profile.delete({ where: { id: profileId } });
    });
  }

  async activate(userId: bigint, profileId: bigint) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    return this.prisma.profile.update({ where: { id: profileId }, data: { isActive: true } });
  }

  async deactivate(userId: bigint, profileId: bigint) {
    await this.getOwnedProfileOrThrow(userId, profileId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({ where: { id: profileId }, data: { isActive: false } });
      // если это был активный профиль — сбросим активный профиль у пользователя
      await tx.user.updateMany({ where: { id: userId, activeProfileId: profileId }, data: { activeProfileId: null } });
      return updated;
    });
  }

  /** Публичная анкета по id. Сначала raw SQL; при ошибке — fallback через Prisma с ручной сериализацией. */
  async getPublicProfileOrThrow(profileId: bigint): Promise<PublicProfileDto> {
    try {
      return await this.getPublicProfileRaw(profileId);
    } catch (rawErr: unknown) {
      this.logger.warn(`getPublicProfile raw query failed: ${rawErr instanceof Error ? rawErr.message : String(rawErr)}`);
      return this.getPublicProfilePrismaFallback(profileId);
    }
  }

  private async getPublicProfileRaw(profileId: bigint): Promise<PublicProfileDto> {
    const idNum = Number(profileId);
    const rows = await this.prisma.$queryRaw<
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
        rating_avg: string | number;
        rating_count: number;
        contact_phone: string | null;
        show_contact_phone_publicly: boolean;
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        photo_url: string | null;
        skills: unknown;
        price_per_hour: number | null;
        about: string | null;
        children_ages: unknown;
        special_wishes: string | null;
        company_name: string | null;
        inn: string | null;
        legal_address: string | null;
      }>
    >(Prisma.sql`
      SELECT p.id, p.type, p.is_active, p.display_name, p.avatar_url, p.gender, p.age, p.city, p.district,
             p.rating_avg::text AS rating_avg, p.rating_count, p.contact_phone, p.show_contact_phone_publicly,
             u.username, u.first_name, u.last_name, u.photo_url,
             sp.skills, sp.price_per_hour, sp.about,
             pp.children_ages, pp.special_wishes,
             cp.company_name, cp.inn, cp.legal_address
      FROM profiles p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN specialist_profiles sp ON sp.profile_id = p.id
      LEFT JOIN parent_profiles pp ON pp.profile_id = p.id
      LEFT JOIN company_profiles cp ON cp.profile_id = p.id
      WHERE p.id = ${idNum} AND p.is_active = true
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException("Profile not found");

    const ratingAvg = row.rating_avg != null ? String(row.rating_avg) : "0";
    const childrenAges = (() => {
      const raw = row.children_ages;
      if (Array.isArray(raw)) return raw.filter((n): n is number => typeof n === "number");
      if (raw != null && typeof raw === "object") return Object.values(raw).filter((n): n is number => typeof n === "number");
      return null;
    })();
    const profileType = String(row.type).toLowerCase();

    return {
      id: String(row.id),
      type: row.type,
      isActive: row.is_active,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      gender: row.gender === "male" || row.gender === "female" ? row.gender : null,
      age: row.age != null ? Number(row.age) : null,
      city: row.city,
      district: row.district,
      ratingAvg,
      ratingCount: Number(row.rating_count) || 0,
      ...((profileType === "specialist" || profileType === "company") && row.show_contact_phone_publicly && row.contact_phone
        ? { contactPhone: row.contact_phone }
        : {}),
      user: {
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        photoUrl: row.photo_url,
      },
      specialist:
        (profileType === "specialist" || profileType === "company")
          ? await (async () => {
              const skills = row.skills;
              const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
              const category = arr.length > 0 ? String(arr[0]) : null;
              const portfolioImageUrls = await this.getPortfolioForProfile(profileId);
              return { category, pricePerHour: row.price_per_hour, about: row.about, portfolioImageUrls };
            })()
          : null,
      parent:
        profileType === "parent"
          ? { childrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null, specialWishes: row.special_wishes }
          : null,
      company:
        profileType === "company" && row.company_name
          ? { companyName: row.company_name, inn: row.inn ?? null, legalAddress: row.legal_address ?? null }
          : null,
    };
  }

  /** Fallback: Prisma findUnique + ручная сборка DTO (без Decimal/BigInt в ответе). */
  private async getPublicProfilePrismaFallback(profileId: bigint): Promise<PublicProfileDto> {
    const p = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { username: true, firstName: true, lastName: true, photoUrl: true } },
        specialistProfile: true,
        specialistPortfolio: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
        parentProfile: true,
        companyProfile: true,
      },
    });
    if (!p || !p.isActive) throw new NotFoundException("Profile not found");

    const ratingAvg = p.ratingAvg != null && typeof (p.ratingAvg as { toString?: () => string }).toString === "function"
      ? (p.ratingAvg as { toString: () => string }).toString()
      : "0";
    const typeStr = String(p.type).toLowerCase();
    const childrenAges = p.parentProfile?.childrenAges != null
      ? (Array.isArray(p.parentProfile.childrenAges)
          ? (p.parentProfile.childrenAges as unknown[]).filter((n): n is number => typeof n === "number")
          : [])
      : null;

    return {
      id: String(p.id),
      type: p.type,
      isActive: p.isActive,
      displayName: p.displayName ?? null,
      avatarUrl: p.avatarUrl ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      age: p.age != null ? Number(p.age) : null,
      city: p.city ?? null,
      district: p.district ?? null,
      ratingAvg,
      ratingCount: Number(p.ratingCount) || 0,
      ...((typeStr === "specialist" || typeStr === "company") && p.showContactPhonePublicly && p.contactPhone
        ? { contactPhone: p.contactPhone }
        : {}),
      user: {
        username: p.user?.username ?? null,
        firstName: p.user?.firstName ?? null,
        lastName: p.user?.lastName ?? null,
        photoUrl: p.user?.photoUrl ?? null,
      },
      specialist:
        (typeStr === "specialist" || typeStr === "company") && p.specialistProfile
          ? (() => {
              const skills = p.specialistProfile.skills;
              const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
              const category = arr.length > 0 ? String(arr[0]) : null;
              const portfolioImageUrls = p.specialistPortfolio?.map((i) => i.imageUrl) ?? [];
              return {
                category,
                pricePerHour: p.specialistProfile.pricePerHour ?? null,
                about: p.specialistProfile.about ?? null,
                portfolioImageUrls,
              };
            })()
          : null,
      parent:
        typeStr === "parent"
          ? {
              childrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null,
              specialWishes: p.parentProfile?.specialWishes ?? null,
            }
          : null,
      company:
        typeStr === "company" && p.companyProfile?.companyName
          ? {
              companyName: p.companyProfile.companyName,
              inn: p.companyProfile.inn ?? null,
              legalAddress: p.companyProfile.legalAddress ?? null,
            }
          : null,
    };
  }
}

