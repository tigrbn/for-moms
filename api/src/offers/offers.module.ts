import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TelegramModule } from "../telegram/telegram.module";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [OffersController],
  providers: [OffersService, JwtAuthGuard],
  exports: [OffersService],
})
export class OffersModule {}

