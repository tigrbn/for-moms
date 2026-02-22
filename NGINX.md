# Настройка nginx для приложения

## Только обновить фронт (на сервере)

После `git pull` выполните на сервере:

**1. Сборка:**
```bash
cd /root/formoms/web
npm ci
npm run build
```

**2. Если nginx раздаёт фронт из `/var/www/formoms`** (а не из `web/dist`), скопируйте собранные файлы с sudo:
```bash
sudo cp -r /root/formoms/web/dist/* /var/www/formoms/
```
(или `sudo rsync -av --delete /root/formoms/web/dist/ /var/www/formoms/` — тогда лишние старые файлы удалятся.)

**3. Перезагрузить nginx** (если меняли конфиг или чтобы применить отдачу новых файлов):
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Кратко: сборка в `web`, копирование в каталог nginx через `sudo`, при необходимости `sudo systemctl reload nginx`.

---

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
npx prisma migrate deploy   # применить новые миграции БД (если есть)
npm run build
pm2 restart formoms-api --update-env

# 2. Фронтенд (обязательно — иначе интерфейс не изменится)
cd /root/formoms/web
npm ci
npm run build
```

После этого nginx должен раздавать содержимое каталога **`/root/formoms/web/dist`** (в конфиге nginx для сайта должен быть указан `root /root/formoms/web/dist;` или `alias` на этот путь). Если у вас фронт отдаётся из другого места — скопируйте содержимое `web/dist` туда или поменяйте `root` в nginx.

**Если после обновления всё равно видите старый интерфейс:** сделайте жёсткое обновление страницы (Ctrl+F5 или Cmd+Shift+R) или откройте приложение в режиме инкогнито — браузер мог закешировать старые JS/CSS.

**Лента из браузера (без авторизации):** чтобы при открытии сайта в обычном браузере лента загружалась без 401, на API должен быть задеплоен код с опциональной авторизацией для `GET /feed`. После `git pull` обязательно выполните `npm run build` и `pm2 restart formoms-api --update-env` в каталоге `api`.

**Смена домена (например на formoms-ykt.ru):** в BotFather обновите URL мини-приложения на новый домен. В файле с секретами API (например `api.env`) задайте `WEBAPP_URL=https://formoms-ykt.ru` (без слеша в конце), затем `pm2 restart formoms-api --update-env`. Если после смены URL в Telegram всё ещё открывается старый адрес — закройте чат с ботом, очистите кэш Telegram и откройте бота заново.

---

## Без кэша для Telegram Mini App (всегда свежая версия)

Чтобы в Telegram мини-приложении всегда подгружалась новая версия (без кэша), в nginx для раздачи фронта добавьте заголовки, запрещающие кэширование.

**Вариант 1 — отключить кэш для всего каталога приложения** (проще всего):

В конфиге сайта найдите блок `location`, который раздаёт статику (например `root /var/www/formoms;` или `root /root/formoms/web/dist;`). Добавьте в этот блок `location` строки:

```nginx
location / {
    root /var/www/formoms;   # или /root/formoms/web/dist
    index index.html;
    try_files $uri $uri/ /index.html;

    # Разрешить отображение в Telegram и в MAX
    add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://web.max.ru";
    add_header X-Frame-Options "ALLOW-FROM https://web.max.ru";

    # Не кэшировать — Telegram Mini App всегда получит свежую версию
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
}
```

**Вариант 2 — не кэшировать только `index.html`** (скрипты с хешами в имени можно кэшировать):

```nginx
location / {
    root /var/www/formoms;
    index index.html;
    try_files $uri $uri/ /index.html;
}

location = /index.html {
    root /var/www/formoms;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
}
```

После правок:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

После этого при каждом открытии мини-приложения в Telegram будет запрашиваться актуальная версия.

---

## Заголовки для отображения в MAX

Чтобы сайт открывался внутри приложения MAX (в iframe), nginx должен отдавать заголовки, разрешающие встраивание с домена MAX.

Добавьте в блок **`location /`**, который раздаёт фронт (статику приложения), строки:

```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://web.max.ru";
add_header X-Frame-Options "ALLOW-FROM https://web.max.ru";
```

(В CSP нужны оба домена: **web.telegram.org** — для открытия в Telegram, **web.max.ru** — для открытия в MAX.)

Полный пример блока (с кэшем, Telegram и MAX):

```nginx
location / {
    root /root/formoms/web/dist;   # или /var/www/formoms
    index index.html;
    try_files $uri $uri/ /index.html;

    # Telegram и MAX: разрешить отображение внутри приложений
    add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://web.max.ru";
    add_header X-Frame-Options "ALLOW-FROM https://web.max.ru";

    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
}
```

После правок:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

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

---

## Кэш для картинок (ускорение в Telegram/MAX)

Картинки в Telegram и MAX грузятся медленнее, чем в браузере. Чтобы ускорить загрузку, включите кэширование для `/api/uploads/`.

**На сервере выполните:**

1. **Откройте конфиг nginx** (обычно `/etc/nginx/sites-available/formoms-ykt` или `/etc/nginx/conf.d/formoms.conf`):
   ```bash
   sudo nano /etc/nginx/sites-available/formoms-ykt
   ```
   (путь может отличаться — проверьте `ls /etc/nginx/sites-available/`)

2. **Найдите блок `location /api/`** — он проксирует запросы на бэкенд.

3. **Добавьте блок `location /api/uploads/` ПЕРЕД `location /api/`** (более специфичный location должен быть выше):

   ```nginx
   location ^~ /api/uploads/ {
       proxy_pass http://127.0.0.1:3000/uploads/;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       add_header Cache-Control "public, max-age=86400";   # кэш на сутки
   }
   ```

   location /api/ {
       client_max_body_size 10M;
       proxy_pass http://127.0.0.1:3000/;
       # ... остальные proxy_set_header
   }
   ```

   **Важно:** модификатор `^~` обязателен, если у вас есть `location ~* \.(jpg|png|...)$` — иначе regex перехватит `/api/uploads/xxx.jpg` и вернёт 404.

4. **Проверьте конфиг и перезагрузите nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

**Важно:** `proxy_pass` должен заканчиваться на `/uploads/`, чтобы путь `/api/uploads/файл.jpg` корректно превращался в `/uploads/файл.jpg` на бэкенде.
