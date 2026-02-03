import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export async function getActiveProfileOrThrow(
  prisma: PrismaService,
  userId: bigint,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activeProfile: true },
  });
  if (!user || !user.activeProfile) {
    throw new BadRequestException("No active profile selected");
  }
  return user.activeProfile;
}
