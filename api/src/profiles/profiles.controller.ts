import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ProfileType } from "@prisma/client";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProfilesService } from "./profiles.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get(":id")
  async get(@Param("id") id: string) {
    const p = await this.profiles.getPublicProfileOrThrow(BigInt(id));
    return {
      id: p.id.toString(),
      type: p.type,
      isActive: p.isActive,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      city: p.city,
      district: p.district,
      ratingAvg: p.ratingAvg.toString(),
      ratingCount: p.ratingCount,
      user: {
        username: p.user?.username ?? null,
        firstName: p.user?.firstName ?? null,
        lastName: p.user?.lastName ?? null,
      },
      specialist: p.type === "specialist"
        ? {
            pricePerHour: p.specialistProfile?.pricePerHour ?? null,
            about: p.specialistProfile?.about ?? null,
          }
        : null,
      parent: p.type === "parent"
        ? {
            childrenAges: p.parentProfile?.childrenAges ?? null,
            specialWishes: p.parentProfile?.specialWishes ?? null,
          }
        : null,
      shop: p.type === "shop" && p.shopProfile
        ? {
            shopName: p.shopProfile.shopName ?? null,
            logoUrl: p.shopProfile.logoUrl ?? null,
            description: p.shopProfile.description ?? null,
            address: p.shopProfile.address ?? null,
            workHours: p.shopProfile.workHours ?? null,
            products: Array.isArray((p as { shopProducts?: unknown[] }).shopProducts)
              ? (p as { shopProducts: { id: bigint; title: string; description: string | null; price: number | null; category: string | null; imageUrls: unknown }[] }).shopProducts.map((prod) => ({
                  id: prod.id.toString(),
                  title: prod.title,
                  description: prod.description ?? null,
                  price: prod.price ?? null,
                  category: prod.category ?? null,
                  imageUrls: prod.imageUrls ?? null,
                }))
              : [],
            promotions: Array.isArray((p as { shopPromotions?: unknown[] }).shopPromotions)
              ? (p as { shopPromotions: { id: bigint; imageUrl: string; title: string | null; text: string | null }[] }).shopPromotions.map((pr) => ({
                  id: pr.id.toString(),
                  imageUrl: pr.imageUrl,
                  title: pr.title ?? null,
                  text: pr.text ?? null,
                }))
              : [],
          }
        : null,
    };
  }

  @Post()
  async create(@Req() req: Request, @Body() body: { type: ProfileType }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    if (!body?.type) throw new BadRequestException("type is required");
    const profile = await this.profiles.createProfile(userId, body?.type);
    return {
      id: profile.id.toString(),
      type: profile.type,
      isActive: profile.isActive,
      displayName: profile.displayName,
      city: profile.city,
      district: profile.district,
    };
  }

  @Patch(":id")
  async updateBase(@Req() req: Request, @Param("id") id: string, @Body() body: { displayName?: string | null; avatarUrl?: string | null; city?: string | null; district?: string | null }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profile = await this.profiles.updateBase(userId, BigInt(id), body ?? {});
    return {
      id: profile.id.toString(),
      type: profile.type,
      isActive: profile.isActive,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      district: profile.district,
    };
  }

  @Patch(":id/parent")
  async updateParent(@Req() req: Request, @Param("id") id: string, @Body() body: { childrenAges?: number[] | null; specialWishes?: string | null }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const parent = await this.profiles.updateParent(userId, BigInt(id), body ?? {});
    return {
      profileId: parent.profileId.toString(),
      childrenAges: parent.childrenAges,
      specialWishes: parent.specialWishes,
    };
  }

  @Patch(":id/specialist")
  async updateSpecialist(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: {
      skills?: string[] | null;
      experienceYears?: number | null;
      ageGroups?: string[] | null;
      pricePerHour?: number | null;
      workDistricts?: string[] | null;
      about?: string | null;
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const specialist = await this.profiles.updateSpecialist(userId, BigInt(id), body ?? {});
    return {
      profileId: specialist.profileId.toString(),
      skills: specialist.skills,
      experienceYears: specialist.experienceYears,
      ageGroups: specialist.ageGroups,
      pricePerHour: specialist.pricePerHour,
      workDistricts: specialist.workDistricts,
      about: specialist.about,
    };
  }

  @Patch(":id/shop")
  async updateShop(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: { shopName?: string | null; description?: string | null; address?: string | null; workHours?: string | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const shop = await this.profiles.updateShop(userId, BigInt(id), body ?? {});
    return {
      profileId: shop.profileId.toString(),
      shopName: shop.shopName,
      description: shop.description,
      address: shop.address,
      workHours: shop.workHours,
    };
  }

  @Delete(":id")
  async delete(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    await this.profiles.deleteProfile(userId, BigInt(id));
    return { ok: true };
  }

  @Post(":id/activate")
  async activate(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profile = await this.profiles.activate(userId, BigInt(id));
    return { id: profile.id.toString(), isActive: profile.isActive };
  }

  @Post(":id/deactivate")
  async deactivate(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profile = await this.profiles.deactivate(userId, BigInt(id));
    return { id: profile.id.toString(), isActive: profile.isActive };
  }

  @Post(":id/shop/promotions")
  async createShopPromotion(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { imageUrl: string; title?: string | null; text?: string | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const promo = await this.profiles.createShopPromotion(userId, BigInt(id), body ?? { imageUrl: "" });
    return { id: promo.id.toString(), imageUrl: promo.imageUrl, title: promo.title, text: promo.text };
  }

  @Patch(":id/shop/promotions/:promoId")
  async updateShopPromotion(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("promoId") promoId: string,
    @Body() body: { imageUrl?: string; title?: string | null; text?: string | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const promo = await this.profiles.updateShopPromotion(userId, BigInt(id), BigInt(promoId), body ?? {});
    return { id: promo.id.toString(), imageUrl: promo.imageUrl, title: promo.title, text: promo.text };
  }

  @Delete(":id/shop/promotions/:promoId")
  async deleteShopPromotion(@Req() req: Request, @Param("id") id: string, @Param("promoId") promoId: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    await this.profiles.deleteShopPromotion(userId, BigInt(id), BigInt(promoId));
    return { ok: true };
  }

  @Post(":id/shop/products")
  async createShopProduct(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: { title: string; description?: string | null; price?: number | null; category?: string | null; imageUrls?: string[] | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const prod = await this.profiles.createShopProduct(userId, BigInt(id), body ?? { title: "" });
    return {
      id: prod.id.toString(),
      title: prod.title,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      imageUrls: prod.imageUrls,
    };
  }

  @Patch(":id/shop/products/:productId")
  async updateShopProduct(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Body()
    body: { title?: string; description?: string | null; price?: number | null; category?: string | null; imageUrls?: string[] | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const prod = await this.profiles.updateShopProduct(userId, BigInt(id), BigInt(productId), body ?? {});
    return {
      id: prod.id.toString(),
      title: prod.title,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      imageUrls: prod.imageUrls,
    };
  }

  @Delete(":id/shop/products/:productId")
  async deleteShopProduct(@Req() req: Request, @Param("id") id: string, @Param("productId") productId: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    await this.profiles.deleteShopProduct(userId, BigInt(id), BigInt(productId));
    return { ok: true };
  }
}

