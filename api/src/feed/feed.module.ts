import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FeedController } from "./feed.controller";

@Module({
  imports: [PrismaModule],
  controllers: [FeedController],
  providers: [JwtAuthGuard],
})
export class FeedModule {}

