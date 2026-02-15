import { Module } from "@nestjs/common";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { TelegramModule } from "../telegram/telegram.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [TelegramModule, PrismaModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
