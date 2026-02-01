import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProfileType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: bigint, type: ProfileType) {
    if (type !== "parent" && type !== "specialist" && type !== "shop") {
      throw new BadRequestException("Invalid profile type");
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          userId,
          type,
          isActive: true,
          ...(type === "parent" ? { parentProfile: { create: {} } } : {}),
          ...(type === "specialist" ? { specialistProfile: { create: {} } } : {}),
          ...(type === "shop" ? { shopProfile: { create: {} } } : {}),
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
  }

  async getOwnedProfileOrThrow(userId: bigint, profileId: bigint) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) throw new NotFoundException("Profile not found");
    return profile;
  }

  async updateBase(userId: bigint, profileId: bigint, data: { displayName?: string | null; avatarUrl?: string | null; city?: string | null; district?: string | null }) {
    await this.getOwnedProfileOrThrow(userId, profileId);

    return this.prisma.profile.update({
      where: { id: profileId },
      data: {
        displayName: data.displayName ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
        city: data.city ?? undefined,
        district: data.district ?? undefined,
      },
    });
  }

  async updateParent(userId: bigint, profileId: bigint, data: { childrenAges?: number[] | null; specialWishes?: string | null }) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "parent") throw new BadRequestException("Not a parent profile");

    return this.prisma.parentProfile.upsert({
      where: { profileId },
      create: { profileId, childrenAges: data.childrenAges ?? undefined, specialWishes: data.specialWishes ?? undefined },
      update: { childrenAges: data.childrenAges ?? undefined, specialWishes: data.specialWishes ?? undefined },
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

    return this.prisma.specialistProfile.upsert({
      where: { profileId },
      create: {
        profileId,
        skills: data.skills ?? undefined,
        experienceYears: data.experienceYears ?? undefined,
        ageGroups: data.ageGroups ?? undefined,
        pricePerHour: data.pricePerHour ?? undefined,
        workDistricts: data.workDistricts ?? undefined,
        about: data.about ?? undefined,
      },
      update: {
        skills: data.skills ?? undefined,
        experienceYears: data.experienceYears ?? undefined,
        ageGroups: data.ageGroups ?? undefined,
        pricePerHour: data.pricePerHour ?? undefined,
        workDistricts: data.workDistricts ?? undefined,
        about: data.about ?? undefined,
      },
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
}

