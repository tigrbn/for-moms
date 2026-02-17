import { BadRequestException, Body, Controller, Delete, Get, Logger, NotFoundException, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ProfileType } from "@prisma/client";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProfilesService } from "./profiles.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles")
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private readonly profiles: ProfilesService) {}

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

  @Get(":id")
  async get(@Param("id") id: string) {
    const idTrim = id?.trim();
    if (!idTrim || !/^\d+$/.test(idTrim)) {
      throw new BadRequestException("Invalid profile id");
    }
    try {
      return await this.profiles.getPublicProfileOrThrow(BigInt(idTrim));
    } catch (e: unknown) {
      if (e instanceof NotFoundException) throw e;
      this.logger.error(`GET /profiles/${id} failed`, e instanceof Error ? e : String(e));
      throw e;
    }
  }

  @Post("with-data")
  async createWithData(
    @Req() req: Request,
    @Body()
    body: {
      type: "parent" | "specialist" | "company";
      displayName?: string | null;
      gender?: string | null;
      age?: number | null;
      city?: string | null;
      district?: string | null;
      contactPhone?: string | null;
      showContactPhonePublicly?: boolean;
      parent?: { childrenAges?: number[] | null; specialWishes?: string | null };
      specialist?: { skills?: string[] | null; pricePerHour?: number | null; about?: string | null; portfolioImageUrls?: string[] };
      company?: { companyName?: string | null; inn?: string | null; legalAddress?: string | null };
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    if (!body?.type) throw new BadRequestException("type is required");
    const profile = await this.profiles.createProfileWithData(userId, body);
    return {
      id: profile.id.toString(),
      type: profile.type,
      isActive: profile.isActive,
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
  async updateBase(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { displayName?: string | null; avatarUrl?: string | null; gender?: string | null; age?: number | null; city?: string | null; district?: string | null; contactPhone?: string | null; showContactPhonePublicly?: boolean },
  ) {
    this.logger.log(`PATCH /profiles/${id} (base) body=${JSON.stringify(body)}`);
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profile = await this.profiles.updateBase(userId, BigInt(id), body ?? {});
    this.logger.log(`PATCH /profiles/${id} (base) result age=${profile.age} displayName=${profile.displayName} gender=${profile.gender ?? "null"}`);
    return {
      id: profile.id.toString(),
      type: profile.type,
      isActive: profile.isActive,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      gender: profile.gender ?? null,
      age: profile.age,
      city: profile.city,
      district: profile.district,
      contactPhone: profile.contactPhone ?? null,
      showContactPhonePublicly: profile.showContactPhonePublicly ?? false,
    };
  }

  @Patch(":id/parent")
  async updateParent(@Req() req: Request, @Param("id") id: string, @Body() body: { childrenAges?: number[] | null; specialWishes?: string | null }) {
    this.logger.log(`PATCH /profiles/${id}/parent body=${JSON.stringify(body)}`);
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const parent = await this.profiles.updateParent(userId, BigInt(id), body ?? {});
    this.logger.log(`PATCH /profiles/${id}/parent result childrenAges=${JSON.stringify(parent.childrenAges)} specialWishes=${parent.specialWishes != null ? "set" : "null"}`);
    return {
      profileId: parent.profileId.toString(),
      childrenAges: parent.childrenAges,
      specialWishes: parent.specialWishes,
    };
  }

  @Patch(":id/company")
  async updateCompany(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { companyName?: string | null; inn?: string | null; legalAddress?: string | null },
  ) {
    this.logger.log(`PATCH /profiles/${id}/company body=${JSON.stringify(body)}`);
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const company = await this.profiles.updateCompany(userId, BigInt(id), body ?? {});
    return {
      profileId: id,
      companyName: company.companyName,
      inn: company.inn,
      legalAddress: company.legalAddress,
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
      notifyNewRequestsInCategory?: boolean;
      portfolioImageUrls?: string[];
    },
  ) {
    this.logger.log(`PATCH /profiles/${id}/specialist body=${JSON.stringify(body)}`);
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const specialist = await this.profiles.updateSpecialist(userId, BigInt(id), body ?? {});
    this.logger.log(`PATCH /profiles/${id}/specialist result pricePerHour=${specialist.pricePerHour} about=${specialist.about != null ? "set" : "null"} skills=${JSON.stringify(specialist.skills)}`);
    const portfolio = await this.profiles.getPortfolioForProfile(specialist.profileId);
    return {
      profileId: specialist.profileId.toString(),
      skills: specialist.skills,
      experienceYears: specialist.experienceYears,
      ageGroups: specialist.ageGroups,
      pricePerHour: specialist.pricePerHour,
      workDistricts: specialist.workDistricts,
      about: specialist.about,
      notifyNewRequestsInCategory: specialist.notifyNewRequestsInCategory,
      portfolioImageUrls: portfolio,
    };
  }

  @Delete(":id")
  async delete(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    await this.profiles.deleteProfile(userId, BigInt(id));
    return { ok: true };
  }
}

