# Запросы API для Postman

## Настройки

### Base URL

- **Локально (без nginx):** `http://localhost:3000`
- **Через nginx (продакшен):** `https://ВАШ_ДОМЕН/api` (со слэшем в конце не обязательно)

В Postman создайте переменную окружения:
- `baseUrl` = `http://localhost:3000` или `https://ваш-сервер.ru/api`

### Как получить токен (JWT)

Почти все запросы требуют заголовок: **Authorization: Bearer &lt;token&gt;**

Токен выдаётся только после авторизации через Telegram Mini App.

**Шаг 1.** Откройте приложение в Telegram (Mini App).  
**Шаг 2.** В браузере/десктопе откройте DevTools (F12) → Console.  
**Шаг 3.** Введите и выполните:
```js
window.Telegram?.WebApp?.initData || ''
```
Скопируйте выведенную строку (initData).

**Шаг 4.** В Postman выполните запрос:

| Метод | URL | Тело (raw JSON) |
|-------|-----|-----------------|
| **POST** | `{{baseUrl}}/auth/session` | `{"initData": "ВСТАВЬТЕ_СЮДА_СКОПИРОВАННУЮ_СТРОКУ"}` |

В ответе будет поле **`accessToken`** — это и есть JWT.

**Шаг 5.** В коллекции уже включён Bearer Token из переменной `{{token}}`. Если импортируете коллекцию — после успешного вызова **Session** в тестах запроса токен автоматически пишется в переменную коллекции `token`. Иначе вручную скопируйте `accessToken` из ответа и в коллекции (Edit collection → Variables) вставьте в значение переменной `token`.

---

## Список запросов

### Без авторизации

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `{{baseUrl}}/health` | Проверка работы API |
| GET | `{{baseUrl}}/health/db` | Проверка БД |
| GET | `{{baseUrl}}/profiles/{{profileId}}` | Публичный профиль (без Bearer) |
| GET | `{{baseUrl}}/profiles/{{profileId}}/reviews` | Отзывы по профилю (без Bearer) |

### Авторизация

| Метод | URL | Body (JSON) |
|-------|-----|-------------|
| POST | `{{baseUrl}}/auth/session` | `{"initData": "<строка из Telegram WebApp>"}` |

Ответ: `{ "accessToken": "...", "user": {...}, "profiles": [...], "activeProfileId": "..." }`

---

### Me (с Bearer)

| Метод | URL | Body |
|-------|-----|------|
| GET | `{{baseUrl}}/me` | — |
| POST | `{{baseUrl}}/me/active-profile` | `{"profileId": "2"}` |

---

### Профили (с Bearer)

Подставьте свой `profileId` (например `2`).

| Метод | URL | Body (JSON) |
|-------|-----|-------------|
| POST | `{{baseUrl}}/profiles` | `{"type": "parent"}` или `"specialist"` или `"shop"` |
| GET | `{{baseUrl}}/profiles/{{profileId}}` | — |
| **PATCH** | `{{baseUrl}}/profiles/{{profileId}}` | `{"displayName": "Имя", "city": "Москва", "district": "ЦАО"}` |
| **PATCH** | `{{baseUrl}}/profiles/{{profileId}}/parent` | `{"childrenAges": [2,5], "specialWishes": "Текст"}` |
| **PATCH** | `{{baseUrl}}/profiles/{{profileId}}/specialist` | `{"pricePerHour": 500, "about": "О себе"}` |
| **PATCH** | `{{baseUrl}}/profiles/{{profileId}}/shop` | `{"shopName": "Магазин", "address": "ул. Ленина 1", "workHours": "9-18", "description": "Описание"}` |
| POST | `{{baseUrl}}/profiles/{{profileId}}/activate` | `{}` |
| POST | `{{baseUrl}}/profiles/{{profileId}}/deactivate` | `{}` |
| DELETE | `{{baseUrl}}/profiles/{{profileId}}` | — |

**Магазин — акции и товары:**

| Метод | URL | Body (JSON) |
|-------|-----|-------------|
| POST | `{{baseUrl}}/profiles/{{profileId}}/shop/promotions` | `{"imageUrl": "https://example.com/1.jpg", "title": "Акция", "text": "Текст"}` |
| PATCH | `{{baseUrl}}/profiles/{{profileId}}/shop/promotions/{{promoId}}` | `{"imageUrl": "...", "title": "...", "text": "..."}` |
| DELETE | `{{baseUrl}}/profiles/{{profileId}}/shop/promotions/{{promoId}}` | — |
| POST | `{{baseUrl}}/profiles/{{profileId}}/shop/products` | `{"title": "Товар", "description": "Описание", "price": 1000, "category": "Одежда", "imageUrls": ["https://..."]}` |
| PATCH | `{{baseUrl}}/profiles/{{profileId}}/shop/products/{{productId}}` | `{"title": "...", "description": "...", "price": 500, "imageUrls": ["..."]}` |
| DELETE | `{{baseUrl}}/profiles/{{profileId}}/shop/products/{{productId}}` | — |

---

### Загрузка файла (с Bearer)

| Метод | URL | Тип тела |
|-------|-----|----------|
| POST | `{{baseUrl}}/upload` | **form-data**, ключ `file`, тип File — выберите файл изображения |

Ответ: `{"url": "/uploads/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg"}`  
Полный URL картинки для подстановки в акцию/товар: `{{baseUrl}}/uploads/имя_файла` (если фронт ходит через /api, то подставляйте тот же baseUrl + путь из ответа).

---

### Заявки (с Bearer)

| Метод | URL | Body (JSON) |
|-------|-----|-------------|
| POST | `{{baseUrl}}/requests` | `{"category": "Няня", "childAge": 3, "description": "Нужна няня", "budget": 500, "district": "САО"}` |
| GET | `{{baseUrl}}/requests/mine` | — |
| GET | `{{baseUrl}}/requests/{{requestId}}` | — |
| PATCH | `{{baseUrl}}/requests/{{requestId}}` | `{"status": "active", "description": "..."}` (по необходимости) |
| DELETE | `{{baseUrl}}/requests/{{requestId}}` | — |
| POST | `{{baseUrl}}/requests/{{requestId}}/offers` | `{"priceOffer": 400, "comment": "Готова выйти"}` |
| POST | `{{baseUrl}}/requests/{{requestId}}/complete` | `{}` |

---

### Отклики (с Bearer)

| Метод | URL | Body |
|-------|-----|------|
| GET | `{{baseUrl}}/offers/mine` | — |
| POST | `{{baseUrl}}/offers/{{offerId}}/accept` | `{}` |
| POST | `{{baseUrl}}/offers/{{offerId}}/reject` | `{}` |

---

### Отзывы (с Bearer)

| Метод | URL | Body (JSON) |
|-------|-----|-------------|
| POST | `{{baseUrl}}/reviews` | `{"toProfileId": "2", "requestId": "1", "rating": 5, "text": "Отлично"}` |

---

### Лента и баннеры

| Метод | URL | Заголовки / примечание |
|-------|-----|-------------------------|
| GET | `{{baseUrl}}/feed` | Bearer. Можно query: `?district=САО&category=Няня` |
| GET | `{{baseUrl}}/banners` | без Bearer |

---

## Важно про сохранение профиля

- Обновление **базовых полей** (имя, город, район): **PATCH** `{{baseUrl}}/profiles/{{profileId}}` (не POST).
- Обновление **роли мама**: **PATCH** `.../profiles/{{profileId}}/parent`.
- Обновление **роли специалист**: **PATCH** `.../profiles/{{profileId}}/specialist`.
- Обновление **роли магазин**: **PATCH** `.../profiles/{{profileId}}/shop`.

Во всех запросах с Bearer в **Headers** должно быть:
- **Authorization**: `Bearer <ваш accessToken>`
- Для JSON: **Content-Type**: `application/json`
