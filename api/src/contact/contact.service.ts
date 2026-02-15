import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TelegramService } from "../telegram/telegram.service";

export type ContactCategory = "bug" | "order";

export type ContactDto = {
  category: ContactCategory;
  message: string;
  contactEmail?: string;
  contactPhone?: string;
};

@Injectable()
export class ContactService {
  private readonly log = new Logger(ContactService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
  ) {}

  private get devChatId(): bigint | null {
    const raw = this.config.get<string>("TELEGRAM_DEV_CHAT_ID");
    if (!raw) return null;
    try {
      return BigInt(raw.trim());
    } catch {
      return null;
    }
  }

  async sendToDeveloper(
    dto: ContactDto,
    senderInfo: { telegramId?: string; firstName?: string; username?: string },
  ): Promise<void> {
    const chatId = this.devChatId;
    if (!chatId) {
      this.log.warn("TELEGRAM_DEV_CHAT_ID is not set or invalid; contact message not sent");
      return;
    }
    this.log.log(`Sending contact message to developer chat ${chatId}`);

    const categoryLabel =
      dto.category === "bug" ? "Сообщить об ошибке" : "Заказать разработку";
    const lines: string[] = [
      "\u{1F4E9} Новое обращение: " + categoryLabel,
      "",
      dto.message,
    ];
    if (dto.contactEmail || dto.contactPhone) {
      lines.push("");
      lines.push("Контакты для связи:");
      if (dto.contactEmail) lines.push("  Email: " + dto.contactEmail);
      if (dto.contactPhone) lines.push("  Телефон: " + dto.contactPhone);
    }
    lines.push("");
    const fromPart = [senderInfo.firstName, senderInfo.username ? "@" + senderInfo.username : senderInfo.telegramId].filter(Boolean).join(" ") || "—";
    lines.push("От: " + fromPart);

    const text = lines.join("\n");
    await this.telegram.sendMessage(chatId, text);
  }
}
