import { BadRequestException } from "@nestjs/common";
import { Profile, PrismaClient } from "@prisma/client";

export async function getActiveProfileOrThrow(prisma: PrismaClient, userId: bigint): Promise<Profile> {
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

