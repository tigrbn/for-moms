import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { isAdminUser } from "../common/admin";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "./analytics.service";

@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("dashboard")
  async getDashboard(
    @Req() req: Request,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const admin = await isAdminUser(this.prisma, userId);
    if (!admin) throw new ForbiddenException("Access denied");

    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    const validYear = y !== undefined && !Number.isNaN(y);
    const validMonth = m !== undefined && !Number.isNaN(m) && m >= 1 && m <= 12;
    return this.analytics.getDashboard(
      validYear ? y : undefined,
      validMonth ? m : undefined,
    );
  }
}
