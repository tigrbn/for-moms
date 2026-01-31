import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  ok() {
    return { ok: true };
  }

  @Get("db")
  async db() {
    // просто проверка соединения: посчитаем пользователей
    const usersCount = await this.prisma.user.count();
    return { ok: true, usersCount };
  }
}
