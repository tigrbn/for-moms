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
          include: { specialistProfile: true, parentProfile: true },
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
        if (p.type === "specialist") {
          if (!p.specialistProfile) {
            return { ...base, specialist: { skills: [], pricePerHour: null, about: null } };
          }
          let raw = p.specialistProfile.skills;
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw) as unknown;
              raw = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? [parsed] : [];
            } catch {
              raw = raw ? [raw] : [];
            }
          }
          let skillsArr: string[] = [];
          if (Array.isArray(raw)) {
            skillsArr = raw.filter((s): s is string => typeof s === "string");
          } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            skillsArr = Object.values(raw).filter((s): s is string => typeof s === "string");
          } else if (typeof raw === "string") {
            skillsArr = raw ? [raw] : [];
          }
          return { ...base, specialist: { skills: skillsArr, pricePerHour: p.specialistProfile.pricePerHour, about: p.specialistProfile.about } };
        }
        if (p.type === "parent") {
          return {
            ...base,
            parent: {
              childrenAges: p.parentProfile?.childrenAges ?? null,
              specialWishes: p.parentProfile?.specialWishes ?? null,
            },
          };
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

