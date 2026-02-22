import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LinkController } from "./link.controller";
import { LinkService } from "./link.service";
import { BotTokenGuard } from "./bot-token.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AuthController, LinkController],
  providers: [AuthService, LinkService, BotTokenGuard],
  exports: [AuthService, LinkService],
})
export class AuthModule {}
