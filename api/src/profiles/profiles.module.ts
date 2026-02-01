import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, JwtAuthGuard],
})
export class ProfilesModule {}

