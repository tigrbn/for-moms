import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OffersService } from "../offers/offers.service";
import { RequestsService } from "./requests.service";

@UseGuards(JwtAuthGuard)
@Controller("requests")
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly offers: OffersService,
  ) {}

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      category: string;
      childAge?: number | null;
      description?: string | null;
      startAt?: string | null;
      durationMin?: number | null;
      budget?: number | null;
      district?: string | null;
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const created = await this.requests.create(userId, body);
    return { id: created.id.toString() };
  }

  @Get("mine")
  async mine(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const items = await this.requests.mine(userId);
    return items.map((r) => ({
      id: r.id.toString(),
      status: r.status,
      category: r.category,
      childAge: r.childAge,
      description: r.description,
      startAt: r.startAt?.toISOString() ?? null,
      durationMin: r.durationMin,
      budget: r.budget,
      district: r.district,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      offersCount: r.offersCount,
      newOffersCount: r.newOffersCount,
    }));
  }

  @Get("new-offers-count")
  async newOffersCount(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const count = await this.requests.newOffersCount(userId);
    return { count };
  }

  @Post(":id/offers")
  async createOffer(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { priceOffer?: number | null; comment?: string | null },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const created = await this.offers.createForRequest(userId, BigInt(id), body ?? {});
    return {
      id: created.id.toString(),
      status: created.status,
      priceOffer: created.priceOffer,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    };
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const r = await this.requests.get(userId, BigInt(id));
    return {
      id: r.id.toString(),
      currentUserHasReviewed: r.currentUserHasReviewed,
      status: r.status,
      category: r.category,
      childAge: r.childAge,
      description: r.description,
      startAt: r.startAt?.toISOString() ?? null,
      durationMin: r.durationMin,
      budget: r.budget,
      district: r.district,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      parent: {
        profileId: r.parent.id.toString(),
        displayName: r.parent.displayName,
        avatarUrl: r.parent.avatarUrl ?? null,
        photoUrl: r.parent.user?.photoUrl ?? null,
        gender: r.parent.gender ?? null,
        city: r.parent.city,
        district: r.parent.district,
        username: r.parent.user?.username ?? null,
        firstName: r.parent.user?.firstName ?? null,
        lastName: r.parent.user?.lastName ?? null,
      },
      offers: r.offers.map((o) => ({
        id: o.id.toString(),
        specialistProfileId: o.specialistProfileId.toString(),
        priceOffer: o.priceOffer,
        comment: o.comment,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        specialist: {
          profileId: o.specialistProfile.id.toString(),
          displayName: o.specialistProfile.displayName,
          avatarUrl: o.specialistProfile.avatarUrl ?? null,
          gender: o.specialistProfile.gender ?? null,
          age: o.specialistProfile.age ?? null,
          photoUrl: o.specialistProfile.user?.photoUrl ?? null,
          city: o.specialistProfile.city,
          district: o.specialistProfile.district,
          username: o.specialistProfile.user?.username ?? null,
          firstName: o.specialistProfile.user?.firstName ?? null,
          lastName: o.specialistProfile.user?.lastName ?? null,
          pricePerHour: o.specialistProfile.specialistProfile?.pricePerHour ?? null,
          contactPhone:
            o.status === "accepted" || o.specialistProfile.showContactPhonePublicly
              ? (o.specialistProfile.contactPhone ?? null)
              : undefined,
        },
      })),
    };
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: {
      category?: string;
      childAge?: number | null;
      description?: string | null;
      startAt?: string | null;
      durationMin?: number | null;
      budget?: number | null;
      district?: string | null;
      status?: "active" | "in_progress" | "done" | "cancelled";
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const updated = await this.requests.update(userId, BigInt(id), body ?? {});
    return { id: updated.id.toString(), status: updated.status };
  }

  @Delete(":id")
  async delete(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    await this.requests.delete(userId, BigInt(id));
    return { ok: true };
  }

  @Post(":id/complete")
  async complete(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const updated = await this.requests.complete(userId, BigInt(id));
    return {
      id: updated.id.toString(),
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
    };
  }
}

