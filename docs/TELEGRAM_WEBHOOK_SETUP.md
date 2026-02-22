# Настройка webhook для привязки MAX → Telegram

Чтобы привязка профиля MAX к Telegram работала, Telegram должен отправлять обновления (сообщения боту) на наш сервер.

## Один раз: зарегистрировать webhook

Выполните команду (подставьте свой `BOT_TOKEN` и публичный URL API):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-api-domain.com/webhook/telegram"
```

**Важно:** URL должен быть HTTPS и доступен из интернета. Если API за nginx с префиксом `/api`, используйте `https://domain.com/api/webhook/telegram`.

Пример:
```bash
curl -X POST "https://api.telegram.org/bot123456:ABC-DEF.../setWebhook?url=https://formoms-ykt.ru/api/webhook/telegram"
```

После этого Telegram будет отправлять все сообщения боту на этот URL. Наш API обрабатывает `/start CODE` и погашает код привязки.

## Проверка

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## Сброс webhook (если нужно отключить)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```
