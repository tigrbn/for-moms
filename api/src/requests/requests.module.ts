import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [PrismaModule],
  controllers: [RequestsController],
  providers: [RequestsService, JwtAuthGuard],
})
export class RequestsModule {}

