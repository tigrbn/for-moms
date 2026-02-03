import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & {
  auth?: { userId: bigint };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }
    const token = authHeader.slice(7);
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) {
      throw new UnauthorizedException("Server misconfiguration");
    }
    try {
      const payload = jwt.verify(token, secret) as { sub?: string };
      if (!payload?.sub) {
        throw new UnauthorizedException("Invalid token payload");
      }
      (req as AuthedRequest).auth = { userId: BigInt(payload.sub) };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
