import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ProfileType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type PublicProfileDto = {
  id: string;
  type: string;
  isActive: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  district: string | null;
  ratingAvg: string;
  ratingCount: number;
  user: { username: string | null; firstName: string | null; lastName: string | null };
  specialist: { pricePerHour: number | null; about: string | null } | null;
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
    data: { displayName?: string | null; avatarUrl?: string | null; age?: number | null; city?: string | null; district?: string | null },
  ) {
    await this.getOwnedProfileOrThrow(userId, profileId);

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 0;
    if ("displayName" in data) {
      setClauses.push(`display_name = $${++paramIndex}`);
      values.push(data.displayName);
    }
    if ("avatarUrl" in data) {
      setClauses.push(`avatar_url = $${++paramIndex}`);
      values.push(data.avatarUrl);
    }
    if ("age" in data) {
      setClauses.push(`age = $${++paramIndex}`);
      values.push(data.age);
    }
    if ("city" in data) {
      setClauses.push(`city = $${++paramIndex}`);
      values.push(data.city);
    }
    if ("district" in data) {
      setClauses.push(`district = $${++paramIndex}`);
      values.push(data.district);
    }

    this.logger.log(`updateBase profileId=${profileId} data keys=${Object.keys(data).join(",")}`);

    if (setClauses.length === 0) {
      return this.prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    }

    values.push(profileId);
    const whereParam = paramIndex + 1;
    const sql = `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${whereParam}`;
    await this.prisma.$executeRawUnsafe(sql, ...values);

    const updated = await this.prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    return updated;
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

  /** Публичная анкета по id — через raw SQL, чтобы избежать 500 (Decimal/BigInt при сериализации). */
  async getPublicProfileOrThrow(profileId: bigint): Promise<PublicProfileDto> {
    const idNum = Number(profileId);
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: bigint;
        type: string;
        is_active: boolean;
        display_name: string | null;
        avatar_url: string | null;
        city: string | null;
        district: string | null;
        rating_avg: string | number;
        rating_count: number;
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        price_per_hour: number | null;
        about: string | null;
        children_ages: unknown;
        special_wishes: string | null;
      }>
    >(Prisma.sql`
      SELECT p.id, p.type, p.is_active, p.display_name, p.avatar_url, p.city, p.district,
             p.rating_avg::text AS rating_avg, p.rating_count,
             u.username, u.first_name, u.last_name,
             sp.price_per_hour, sp.about,
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

    return {
      id: String(row.id),
      type: row.type,
      isActive: row.is_active,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      city: row.city,
      district: row.district,
      ratingAvg,
      ratingCount: Number(row.rating_count) || 0,
      user: {
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
      },
      specialist:
        row.type === "specialist"
          ? { pricePerHour: row.price_per_hour, about: row.about }
          : null,
      parent:
        row.type === "parent"
          ? { childrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null, specialWishes: row.special_wishes }
          : null,
    };
  }
}

