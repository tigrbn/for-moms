import { Controller, Logger, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { LinkService } from "../auth/link.service";
import { TelegramService } from "./telegram.service";

/** Telegram Update: https://core.telegram.org/bots/api#update */
interface TelegramUpdate {
  message?: {
    text?: string;
    from?: { id: number };
    chat?: { id: number };
  };
}

/**
 * Webhook для Telegram Bot API.
 * Принимает обновления от Telegram. Обрабатывает /start CODE — погашение кода привязки MAX→Telegram.
 *
 * Настройка (один раз): curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-api.com/webhook/telegram"
 */
@Controller("webhook")
export class TelegramWebhookController {
  private readonly log = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly linkService: LinkService,
    private readonly telegram: TelegramService,
  ) {}

  @Post("telegram")
  async handle(@Req() req: Request, @Res() res: Response) {
    const body = req.body as TelegramUpdate;
    const message = body?.message;
    const text = message?.text?.trim();
    const fromId = message?.from?.id;
    const chatId = message?.chat?.id;

    if (!message || fromId == null || chatId == null) {
      res.status(200).json({ ok: true });
      return;
    }

    // /start CODE — привязка MAX к Telegram
    if (text?.startsWith("/start ")) {
      const code = text.slice(7).trim();
      if (code) {
        try {
          await this.linkService.redeem(code, fromId);
          await this.telegram.sendMessage(BigInt(chatId), "✅ Профиль MAX привязан к Telegram. Теперь вы можете заходить в приложение и из MAX, и из Telegram — данные будут общими.");
          this.log.log(`Link redeemed: code=${code} telegramId=${fromId}`);
        } catch (e: any) {
          const msg = e?.message ?? "Ошибка привязки";
          await this.telegram.sendMessage(BigInt(chatId), `❌ ${msg}\n\nКод мог истечь (действует 15 минут). Получите новый код в приложении MAX.`);
          this.log.warn(`Link redeem failed: ${msg}`);
        }
      } else {
        await this.telegram.sendMessage(BigInt(chatId), "Привет! Чтобы привязать профиль MAX, откройте приложение в MAX → Профиль → «Получить код привязки» → нажмите «Открыть в Telegram».");
      }
    }

    res.status(200).json({ ok: true });
  }
}
