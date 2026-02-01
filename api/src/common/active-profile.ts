import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export async function getActiveProfileOrThrow(prisma: PrismaService, userId: bigint) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) {
    throw new BadRequestException("Active profile is not set");
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.activeProfileId } });
  if (!profile) throw new BadRequestException("Active profile not found");
  if (!profile.isActive) throw new BadRequestException("Active profile is inactive");

  return profile;
}

