import type { PrismaClient } from "@prisma/client";

/**
 * Telegram username пользователя с админскими правами:
 * - удаление любых заявок и объявлений;
 * - доступ к дашборду метрик (/profile/analytics).
 * Указывать без @. Задаётся через переменную ADMIN_USERNAME в .env (иначе по умолчанию tigrbn).
 */
export const ADMIN_USERNAME = (process.env.ADMIN_USERNAME ?? "tigrbn").trim().toLowerCase() || "tigrbn";

export async function isAdminUser(prisma: PrismaClient, userId: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return user?.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();
}
