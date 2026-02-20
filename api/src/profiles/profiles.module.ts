import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard, JwtAuthOptionalGuard } from "../auth/jwt-auth.guard";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, JwtAuthGuard, JwtAuthOptionalGuard],
})
export class ProfilesModule {}

