import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadController } from "./upload.controller";

@Module({
  controllers: [UploadController],
  providers: [JwtAuthGuard],
})
export class UploadModule {}
