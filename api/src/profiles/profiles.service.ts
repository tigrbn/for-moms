import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProfileType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfilesService {
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

    return this.prisma.profile.update({
      where: { id: profileId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.district !== undefined && { district: data.district }),
      },
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

  async getPublicProfileOrThrow(profileId: bigint) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { username: true, firstName: true, lastName: true } },
        specialistProfile: true,
        parentProfile: true,
      },
    });
    if (!profile || !profile.isActive) throw new NotFoundException("Profile not found");
    return profile;
  }
}

