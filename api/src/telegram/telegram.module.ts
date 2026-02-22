import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TelegramService } from "./telegram.service";
import { TelegramWebhookController } from "./telegram-webhook.controller";

@Module({
  imports: [AuthModule],
  controllers: [TelegramWebhookController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

