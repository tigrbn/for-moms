import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, JwtAuthGuard],
})
export class ReviewsModule {}

