import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Проверяет, что запрос пришёл от нашего Telegram-бота (Authorization: Bearer BOT_TOKEN).
 * Используется для эндпоинта погашения кода привязки.
 */
@Injectable()
export class BotTokenGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.config.get<string>("BOT_TOKEN");
    if (!token) throw new UnauthorizedException("Bot token not configured");
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${token}`) throw new UnauthorizedException("Invalid bot token");
    return true;
  }
}
