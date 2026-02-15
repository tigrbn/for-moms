import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; web_app: { url: string } };

@Injectable()
export class TelegramService {
  private readonly log = new Logger(TelegramService.name);

  constructor(private readonly config: ConfigService) {}

  private get botToken() {
    return this.config.get<string>("BOT_TOKEN") ?? null;
  }

  private get webAppUrl() {
    return this.config.get<string>("WEBAPP_URL") ?? null;
  }

  buildWebAppUrl(pathname: string) {
    const base = this.webAppUrl;
    if (!base) return null;
    try {
      const u = new URL(base);
      u.pathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
      return u.toString();
    } catch {
      return null;
    }
  }

  async sendMessage(
    chatId: bigint,
    text: string,
    opts?: { buttons?: InlineKeyboardButton[] },
  ) {
    const token = this.botToken;
    if (!token) {
      this.log.warn("BOT_TOKEN is missing; skipping notification");
      return;
    }

    const payload: any = {
      chat_id: chatId.toString(),
      text,
      disable_web_page_preview: true,
    };

    if (opts?.buttons && opts.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: [opts.buttons],
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.text().catch(() => "");
      if (!res.ok) {
        this.log.warn(`Telegram sendMessage failed: ${res.status} ${body}`);
        return;
      }
      this.log.log(`Telegram message sent to chat ${chatId}`);
    } catch (e: any) {
      this.log.warn(`Telegram sendMessage error: ${e?.message ?? String(e)}`);
    }
  }
}

