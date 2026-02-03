import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OffersModule } from "../offers/offers.module";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [PrismaModule, OffersModule],
  controllers: [RequestsController],
  providers: [RequestsService, JwtAuthGuard],
})
export class RequestsModule {}

