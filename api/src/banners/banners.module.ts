import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BannersController } from "./banners.controller";

@Module({
  imports: [PrismaModule],
  controllers: [BannersController],
})
export class BannersModule {}

