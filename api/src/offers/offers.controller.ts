import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OffersService } from "./offers.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Post("requests/:id/offers")
  async createForRequest(@Req() req: Request, @Param("id") id: string, @Body() body: { priceOffer?: number | null; comment?: string | null }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const offer = await this.offers.createForRequest(userId, BigInt(id), body ?? {});
    return { id: offer.id.toString(), status: offer.status };
  }

  @Get("offers/mine")
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
    }));
  }

  @Post("offers/:id/accept")
  async accept(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const o = await this.offers.accept(userId, BigInt(id));
    return { id: o.id.toString(), status: o.status };
  }

  @Post("offers/:id/reject")
  async reject(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const o = await this.offers.reject(userId, BigInt(id));
    return { id: o.id.toString(), status: o.status };
  }
}

