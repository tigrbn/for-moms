# Настройка nginx для приложения

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
