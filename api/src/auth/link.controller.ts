import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { BotTokenGuard } from "./bot-token.guard";
import { LinkService } from "./link.service";

@Controller("link")
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  /**
   * Погашение кода привязки Telegram. Вызывается ботом, когда пользователь отправил /start <code>.
   * Тело: { code: string, telegramId: number }
   */
  @Post("redeem")
  @UseGuards(BotTokenGuard)
  async redeem(@Body() body: { code?: string; telegramId?: number }) {
    await this.linkService.redeem(body?.code ?? "", body?.telegramId ?? 0);
    return { ok: true, message: "Telegram привязан" };
  }
}
