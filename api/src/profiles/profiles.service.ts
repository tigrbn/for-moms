import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProfileType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: bigint, type: ProfileType) {
    if (type !== "parent" && type !== "specialist" && type !== "shop") {
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

  async updateShop(
    userId: bigint,
    profileId: bigint,
    data: { shopName?: string | null; description?: string | null; address?: string | null; workHours?: string | null },
  ) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "shop") throw new BadRequestException("Not a shop profile");

    return this.prisma.shopProfile.upsert({
      where: { profileId },
      create: {
        profileId,
        shopName: data.shopName ?? undefined,
        description: data.description ?? undefined,
        address: data.address ?? undefined,
        workHours: data.workHours ?? undefined,
      },
      update: {
        shopName: data.shopName ?? undefined,
        description: data.description ?? undefined,
        address: data.address ?? undefined,
        workHours: data.workHours ?? undefined,
      },
    });
  }

  async createShopPromotion(userId: bigint, profileId: bigint, data: { imageUrl: string; title?: string | null; text?: string | null }) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, include: { shopPromotions: true } });
    if (!profile || profile.type !== "shop") throw new BadRequestException("Not a shop profile");
    if (!data.imageUrl?.trim()) throw new BadRequestException("imageUrl is required");
    return this.prisma.shopPromotion.create({
      data: {
        profileId,
        imageUrl: data.imageUrl.trim(),
        title: data.title?.trim() ?? null,
        text: data.text?.trim() ?? null,
        sortOrder: profile.shopPromotions.length,
      },
    });
  }

  async updateShopPromotion(userId: bigint, profileId: bigint, promotionId: bigint, data: { imageUrl?: string; title?: string | null; text?: string | null }) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const promo = await this.prisma.shopPromotion.findFirst({ where: { id: promotionId, profileId } });
    if (!promo) throw new NotFoundException("Promotion not found");
    return this.prisma.shopPromotion.update({
      where: { id: promotionId },
      data: {
        imageUrl: data.imageUrl?.trim() ?? undefined,
        title: data.title !== undefined ? (data.title?.trim() ?? null) : undefined,
        text: data.text !== undefined ? (data.text?.trim() ?? null) : undefined,
      },
    });
  }

  async deleteShopPromotion(userId: bigint, profileId: bigint, promotionId: bigint) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const promo = await this.prisma.shopPromotion.findFirst({ where: { id: promotionId, profileId } });
    if (!promo) throw new NotFoundException("Promotion not found");
    await this.prisma.shopPromotion.delete({ where: { id: promotionId } });
  }

  async createShopProduct(userId: bigint, profileId: bigint, data: { title: string; description?: string | null; price?: number | null; category?: string | null; imageUrls?: string[] | null }) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, include: { shopProducts: true } });
    if (!profile || profile.type !== "shop") throw new BadRequestException("Not a shop profile");
    if (!data.title?.trim()) throw new BadRequestException("title is required");
    if (profile.shopProducts.length >= 6) throw new BadRequestException("Maximum 6 products allowed");
    return this.prisma.shopProduct.create({
      data: {
        profileId,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        price: data.price ?? null,
        category: data.category?.trim() ?? null,
        imageUrls: data.imageUrls == null ? Prisma.JsonNull : data.imageUrls,
      },
    });
  }

  async updateShopProduct(userId: bigint, profileId: bigint, productId: bigint, data: { title?: string; description?: string | null; price?: number | null; category?: string | null; imageUrls?: string[] | null; isActive?: boolean }) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const prod = await this.prisma.shopProduct.findFirst({ where: { id: productId, profileId } });
    if (!prod) throw new NotFoundException("Product not found");
    return this.prisma.shopProduct.update({
      where: { id: productId },
      data: {
        title: data.title?.trim() ?? undefined,
        description: data.description !== undefined ? (data.description?.trim() ?? null) : undefined,
        price: data.price !== undefined ? data.price : undefined,
        category: data.category !== undefined ? (data.category?.trim() ?? null) : undefined,
        imageUrls: data.imageUrls ?? undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async deleteShopProduct(userId: bigint, profileId: bigint, productId: bigint) {
    await this.getOwnedProfileOrThrow(userId, profileId);
    const prod = await this.prisma.shopProduct.findFirst({ where: { id: productId, profileId } });
    if (!prod) throw new NotFoundException("Product not found");
    await this.prisma.shopProduct.delete({ where: { id: productId } });
  }

  async deleteProfile(userId: bigint, profileId: bigint) {
    const profile = await this.getOwnedProfileOrThrow(userId, profileId);
    if (profile.type !== "shop") throw new BadRequestException("Only shop profile can be deleted via this endpoint");

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
        shopProfile: true,
        shopProducts: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
        shopPromotions: { orderBy: { sortOrder: "asc", createdAt: "asc" } },
      },
    });
    if (!profile || !profile.isActive) throw new NotFoundException("Profile not found");
    return profile;
  }
}

