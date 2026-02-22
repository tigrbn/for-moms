import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MeController } from "./me.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MeController],
  providers: [JwtAuthGuard],
})
export class MeModule {}

