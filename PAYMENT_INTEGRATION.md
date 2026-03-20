# Оплата и Stripe (Strategy AI)

## Текущее состояние

В проекте уже есть **реальная интеграция со Stripe** (не только симуляция):

- **POST `/api/payments/checkout`** — создаёт Stripe Checkout Session (подписка), возвращает `checkoutUrl` и `sessionId`. Требуется JWT (`requireAuth`).
- **POST `/api/payments/portal`** — ссылка в Stripe Customer Portal для смены карты / отмены.
- **POST `/api/webhooks/stripe`** — подпись Stripe, идемпотентность по `event.id` (таблица `stripe_webhook_events`), обработка подписок и инвойсов.

Фронтенд: редирект на `checkoutUrl`, после успеха — query `?payment=success` и опрос `/api/auth/me` до совпадения тарифа (см. `strategy-ai-full.tsx`).

Для **dev-аккаунта** (например email из `DEV_EMAIL` / специальная логика в UI) может оставаться мгновенная смена тарифа без редиректа — это отдельная ветка в клиенте.

---

## Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `STRIPE_SECRET_KEY` | Secret key Stripe; без неё сервер стартует, но платежи отдают **503**. |
| `STRIPE_WEBHOOK_SECRET` | Подпись вебхука из Dashboard → Webhooks. |
| `APP_URL` | Базовый URL приложения для `success_url` / `cancel_url` и портала (по умолчанию `http://localhost:3000`). |
| Цены тарифов | Задаются в `server/routes/tiers.js` как `stripe_price_id` для каждого платного тарифа. |
| `STRIPE_WEBHOOK_EVENTS_RETENTION_DAYS` | Опционально: сколько дней хранить `stripe_webhook_events` для идемпотентности (по умолчанию **90**, мин. 30, макс. 365). Раз в сутки + при старте сервера выполняется очистка. |

Дополнительно: `SENTRY_DSN`, `JWT_SECRET` (обязателен в **production**), `DATABASE_URL`.

---

## Webhook в Stripe Dashboard

1. Endpoint: `https://<ваш-домен>/api/webhooks/stripe`.
2. События (минимум): `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed` — см. фактический `switch` в `server/routes/webhooks.js`.
3. Скопировать **Signing secret** в `STRIPE_WEBHOOK_SECRET`.

Важно: для этого роута в `server/index.js` должен передаваться **raw body** (как сейчас настроено для пути вебхука).

---

## Health / деплой (Railway и аналоги)

- **`GET /api/health`** — JSON с полем `database`: `ok` | `error`, `status`: `ok` | `degraded`. По умолчанию **HTTP 200**, чтобы простой health-check платформы не падал при временных сбоях БД.
- Для **readiness** (Kubernetes / строгая проверка): **`GET /api/health?readiness=1`** или **`?strict=1`** — при ошибке БД ответ **503**.

---

## PCI и поля карты на фронте

Данные карты не должны отправляться на ваш бэкенд: пользователь платит на странице Stripe Checkout (или Payment Element, если позже добавите). Поля карты в профиле при живой оплате — только UI-наследие; не прокидывайте их в API.

---

## История документа

Ранее здесь было описание «только симуляция». Сейчас документ отражает **фактическую** схему с Checkout, webhooks и очисткой `stripe_webhook_events`.
