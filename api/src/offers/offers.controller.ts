import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OffersService } from "./offers.service";

@UseGuards(JwtAuthGuard)
@Controller("offers")
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Get("mine")
  async mine(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const items = await this.offers.mine(userId);
    return items.map((o) => ({
      id: o.id.toString(),
      requestId: o.requestId.toString(),
      status: o.status,
      priceOffer: o.priceOffer,
      comment: o.comment,
      createdAt: o.createdAt.toISOString(),
      request: {
        id: o.request.id.toString(),
        status: o.request.status,
        category: o.request.category,
        district: o.request.district,
        budget: o.request.budget,
        createdAt: o.request.createdAt.toISOString(),
      },
    }));
  }

  @Post(":id/accept")
  async accept(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const updated = await this.offers.accept(userId, BigInt(id));
    return { id: updated.id.toString(), status: updated.status };
  }

  @Post(":id/reject")
  async reject(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const updated = await this.offers.reject(userId, BigInt(id));
    return { id: updated.id.toString(), status: updated.status };
  }
}
