import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FeedController } from "./feed.controller";

@Module({
  imports: [PrismaModule],
  controllers: [FeedController],
})
export class FeedModule {}

