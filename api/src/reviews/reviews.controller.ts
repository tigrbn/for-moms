import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReviewsService } from "./reviews.service";

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("reviews")
  async create(
    @Req() req: Request,
    @Body()
    body: {
      toProfileId: string;
      requestId: string;
      rating: number;
      text?: string | null;
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const created = await this.reviews.create(userId, body);
    return { id: created.id.toString() };
  }

  @Get("profiles/:id/reviews")
  async list(@Param("id") id: string) {
    const items = await this.reviews.listForProfile(BigInt(id));
    return items.map((r) => {
      const authorDeleted = r.fromProfile.user?.deletedAt != null;
      return {
        id: r.id.toString(),
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
        requestCategory: r.request?.category ?? null,
        fromProfile: authorDeleted
          ? null
          : {
              id: r.fromProfile.id.toString(),
              type: r.fromProfile.type,
              displayName: r.fromProfile.displayName ?? null,
              avatarUrl: r.fromProfile.avatarUrl ?? null,
              photoUrl: r.fromProfile.user?.photoUrl ?? null,
              gender: r.fromProfile.gender ?? null,
              firstName: r.fromProfile.user?.firstName ?? null,
              lastName: r.fromProfile.user?.lastName ?? null,
            },
      };
    });
  }
}

