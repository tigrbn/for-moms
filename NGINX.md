# Настройка nginx для приложения

## Обновление приложения на сервере (после git pull)

Чтобы изменения в интерфейсе (дизайн, кнопки, меню) появились у пользователей, нужно **пересобрать фронтенд** и отдавать новые файлы.

**На сервере выполните:**

```bash
cd /root/formoms
git pull

# 1. API
cd api
npm ci
npx prisma generate
npm run build
pm2 restart formoms-api --update-env

# 2. Фронтенд (обязательно — иначе интерфейс не изменится)
cd /root/formoms/web
npm ci
npm run build
```

После этого nginx должен раздавать содержимое каталога **`/root/formoms/web/dist`** (в конфиге nginx для сайта должен быть указан `root /root/formoms/web/dist;` или `alias` на этот путь). Если у вас фронт отдаётся из другого места — скопируйте содержимое `web/dist` туда или поменяйте `root` в nginx.

**Если после обновления всё равно видите старый интерфейс:** сделайте жёсткое обновление страницы (Ctrl+F5 или Cmd+Shift+R) или откройте приложение в режиме инкогнито — браузер мог закешировать старые JS/CSS.

---

## Ошибка 502 Bad Gateway

502 значит: nginx не получает ответ от бэкенда (приложение на порту 3000). Чаще всего **бэкенд не запущен или упал**.

**На сервере выполните:**

1. **Проверить, запущен ли API (PM2):**
   ```bash
   pm2 status
   ```
   Должна быть запись `formoms-api` в статусе `online`. Если `errored` или `stopped` — смотреть логи:
   ```bash
   pm2 logs formoms-api
   ```

2. **Проверить, отвечает ли приложение локально:**
   ```bash
   curl -s http://127.0.0.1:3000/health
   ```
   Должен вернуться ответ (например `{"status":"ok"}`). Если «Connection refused» — приложение не слушает порт 3000.

3. **Запустить или перезапустить API:**
   ```bash
   cd /root/formoms
   git pull
   cd api
   npm ci          # после установки автоматически выполнится prisma generate
   npm run build
   pm2 restart formoms-api --update-env
   # или при первом запуске:
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

4. **Проверить переменные окружения:** в `ecosystem.config.cjs` указан `env_file: "/root/formoms-secrets/api.env"`. Убедитесь, что файл существует и в нём есть нужные переменные (БД, JWT и т.д.). Без них приложение может падать при старте.

5. **Проверить порт в nginx:** в конфиге должно быть `proxy_pass http://127.0.0.1:3000/;` (как в примере ниже).

6. **Ошибки сборки «Property 'user' does not exist on type 'PrismaService'» / «has no exported member 'PrismaClient'»:** не сгенерирован Prisma Client. На сервере в каталоге `api` выполните:
   ```bash
   npx prisma generate
   npm run build
   ```
   После обновления репозитория при `npm ci` запускается `prisma generate` автоматически (postinstall).

---

## Ошибка 413 Request Entity Too Large

При загрузке фото nginx по умолчанию ограничивает размер тела запроса (~1 MB). Нужно увеличить лимит.

**Сделайте на сервере:**

1. Откройте конфиг сайта (например `/etc/nginx/sites-available/your-site` или в `http { }`).
2. В блок **`location /api/`** (или тот, куда проксируется API) добавьте одну строку:
   ```nginx
   client_max_body_size 10M;
   ```
3. Проверка и перезагрузка:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

**Пример блока location для API:**

Бэкенд ожидает пути **без** префикса `/api` (например `/profiles/2`, `/upload`). Обычно nginx подменяет `/api/` на `/`:

```nginx
location /api/ {
    client_max_body_size 10M;
    proxy_pass http://127.0.0.1:3000/;   # слэш в конце — запрос /api/profiles/2 уходит на бэкенд как /profiles/2
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Запросы к загрузкам идут как `/api/uploads/файл` → nginx переводит в `/uploads/файл` → бэкенд отдаёт файл.
