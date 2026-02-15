import type { PrismaClient } from "@prisma/client";

/** Telegram username пользователя с админскими правами (удаление любых заявок и объявлений). */
export const ADMIN_USERNAME = "tigrbn";

export async function isAdminUser(prisma: PrismaClient, userId: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return user?.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();
}
