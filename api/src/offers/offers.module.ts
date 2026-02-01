import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";

@Module({
  imports: [PrismaModule],
  controllers: [OffersController],
  providers: [OffersService, JwtAuthGuard],
})
export class OffersModule {}

