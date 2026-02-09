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
  user: { username: string | null; firstName: string | null; lastName: string | null; photoUrl: string | null };
  specialist: { category: string | null; pricePerHour: number | null; about: string | null } | null;
  parent: { childrenAges: number[] | null; specialWishes: string | null } | null;
};

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: bigint, type: ProfileType) {
    if (type !== "parent" && type !== "specialist") {
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

  async getOwnedProfileOrThrow(userId: bigint, profileId: bigint) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) throw new NotFoundException("Profile not found");
    return profile;
  }

  async updateBase(
    userId: bigint,
    profileId: bigint,
    data: { displayName?: string | null; avatarUrl?: string | null; gender?: string | null; age?: number | null; city?: string | null; district?: string | null },
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
    },
  ) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "specialist") throw new BadRequestException("Not a specialist profile");

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

    return this.prisma.specialistProfile.upsert({
      where: { profileId },
      create: {
        profileId,
        skills: skillsJson,
        experienceYears,
        ageGroups,
        pricePerHour,
        workDistricts,
        about,
      },
      update: {
        skills: skillsJson,
        experienceYears,
        ageGroups,
        pricePerHour,
        workDistricts,
        about,
      },
    });
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
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        skills: unknown;
        price_per_hour: number | null;
        about: string | null;
        children_ages: unknown;
        special_wishes: string | null;
      }>
    >(Prisma.sql`
      SELECT p.id, p.type, p.is_active, p.display_name, p.avatar_url, p.gender, p.age, p.city, p.district,
             p.rating_avg::text AS rating_avg, p.rating_count,
             u.username, u.first_name, u.last_name, u.photo_url,
             sp.skills, sp.price_per_hour, sp.about,
             pp.children_ages, pp.special_wishes
      FROM profiles p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN specialist_profiles sp ON sp.profile_id = p.id
      LEFT JOIN parent_profiles pp ON pp.profile_id = p.id
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
      user: {
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        photoUrl: row.photo_url,
      },
      specialist:
        profileType === "specialist"
          ? (() => {
              const skills = row.skills;
              const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
              const category = arr.length > 0 ? String(arr[0]) : null;
              return { category, pricePerHour: row.price_per_hour, about: row.about };
            })()
          : null,
      parent:
        profileType === "parent"
          ? { childrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null, specialWishes: row.special_wishes }
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
        parentProfile: true,
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
      user: {
        username: p.user?.username ?? null,
        firstName: p.user?.firstName ?? null,
        lastName: p.user?.lastName ?? null,
        photoUrl: p.user?.photoUrl ?? null,
      },
      specialist:
        typeStr === "specialist" && p.specialistProfile
          ? (() => {
              const skills = p.specialistProfile.skills;
              const arr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
              const category = arr.length > 0 ? String(arr[0]) : null;
              return {
                category,
                pricePerHour: p.specialistProfile.pricePerHour ?? null,
                about: p.specialistProfile.about ?? null,
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
    };
  }
}

