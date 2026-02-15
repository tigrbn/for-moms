import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PostsController],
})
export class PostsModule {}
