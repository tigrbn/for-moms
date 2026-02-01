import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MeController } from "./me.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [JwtAuthGuard],
})
export class MeModule {}

