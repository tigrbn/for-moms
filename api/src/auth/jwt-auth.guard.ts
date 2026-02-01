import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import type { Request as ExpressRequest } from "express";

export type AuthContext = {
  userId: bigint;
  telegramId?: string;
};

export type AuthedRequest = ExpressRequest & { auth?: AuthContext };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const header = (req as any)?.headers?.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const jwtSecret = this.config.get<string>("JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET is missing in .env");

    try {
      const payload = jwt.verify(token, jwtSecret) as any;
      const sub = payload?.sub;
      if (!sub) throw new UnauthorizedException("Invalid token");

      req.auth = {
        userId: BigInt(String(sub)),
        telegramId: payload?.telegramId ? String(payload.telegramId) : undefined,
      };
      return true;
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

