import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { Request } from "express";

@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async me(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profiles: {
          include: { specialistProfile: true },
        },
      },
    });

    if (!user) {
      // теоретически не должно случаться если токен валиден
      throw new NotFoundException("User not found");
    }

    return {
      user: {
        id: user.id.toString(),
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
      },
      profiles: user.profiles.map((p) => {
        const base = {
          id: p.id.toString(),
          type: p.type,
          isActive: p.isActive,
          displayName: p.displayName,
          city: p.city,
          district: p.district,
        };
        if (p.type === "specialist" && p.specialistProfile) {
          const skills = p.specialistProfile.skills;
          const skillsArr = Array.isArray(skills) ? skills : typeof skills === "string" ? [skills] : [];
          return { ...base, specialist: { skills: skillsArr, pricePerHour: p.specialistProfile.pricePerHour, about: p.specialistProfile.about } };
        }
        return base;
      }),
      activeProfileId: user.activeProfileId ? user.activeProfileId.toString() : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("active-profile")
  async setActiveProfile(@Req() req: Request, @Body() body: { profileId: string }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const profileId = body?.profileId;
    if (!profileId) throw new BadRequestException("profileId is required");

    const profile = await this.prisma.profile.findUnique({
      where: { id: BigInt(profileId) },
      select: { id: true, userId: true, isActive: true },
    });

    if (!profile || profile.userId !== userId) throw new NotFoundException("Profile not found");
    if (!profile.isActive) throw new BadRequestException("Profile is inactive");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeProfileId: profile.id },
      select: { activeProfileId: true },
    });

    return { activeProfileId: updated.activeProfileId?.toString() ?? null };
  }
}

