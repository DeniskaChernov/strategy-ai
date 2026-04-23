# Strategy AI

> Визуальное стратегическое планирование с AI-советником уровня McKinsey

**Strategy AI** — веб-приложение для предпринимателей, команд и топ-менеджеров. Визуализируй бизнес-стратегию в виде интерактивной карты, отслеживай прогресс и получай советы от встроенного AI-консультанта.

---

## Возможности

- 🗺 **Визуальный редактор** — drag & drop карта с узлами, связями, зумом и панорамированием
- ✦ **AI-советник** — чат в контексте вашей карты (Anthropic Claude)
- 📊 **Gantt / Список** — несколько режимов отображения
- ⎇ **Сценарии** — симуляция стратегий (оптимистичный / реалистичный / стрессовый)
- 👥 **Совместная работа** — реальное время через WebSocket
- 📋 **37+ шаблонов** — готовые стратегии для разных ниш
- ⬇ **Экспорт** — PDF, PPTX, JSON, PNG
- 🔔 **Уведомления** — дедлайны, брифинг, изменения
- 🌐 **3 языка** — Русский, English, O'zbekcha
- 💳 **Stripe** — подписки с триальным периодом

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React (TSX), `client/api.ts`, `client/i18n/`, `lib/util.ts`, CSS → `public/`, Socket.IO |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (Railway) |
| AI | Anthropic Claude API |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Deploy | Railway |

---

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/YOUR_USERNAME/strategy-ai.git
cd strategy-ai
```

### 2. Установить зависимости сервера

```bash
cd server
npm install
```

### 3. Настроить переменные окружения

```bash
cp server/.env.example server/.env
# Заполни значения в server/.env
```

### 4. Запустить сервер

```bash
cd server
npm start
# Сервер запустится на http://localhost:4000
```

### 5. Открыть фронтенд

Открой `strategy-ai-full.tsx` в [CodeSandbox](https://codesandbox.io) или [StackBlitz](https://stackblitz.com), либо подключи к Vite/CRA проекту.

---

## Переменные окружения

Смотри [`server/.env.example`](./server/.env.example) — там все переменные с комментариями.

Обязательные для продакшена:
- `DATABASE_URL` — PostgreSQL строка подключения
- `JWT_SECRET` + `JWT_REFRESH_SECRET`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

---

## Деплой на Railway

Подробная инструкция: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

---

## Для разработчиков фронта

- [`docs/STRATEGY_AI_DESIGN_SYSTEM.md`](./docs/STRATEGY_AI_DESIGN_SYSTEM.md) — токены, типографика, компоненты DS
- [`docs/UI_PATTERNS.md`](./docs/UI_PATTERNS.md) — shared primitives, классы, a11y/i18n/motion чек-лист

---

## Тарифы

| Тариф | Цена | AI сообщений |
|-------|------|-------------|
| Free | Бесплатно | 3 стратегии/мес |
| Starter | $9/мес | 1 500 |
| Pro | $29/мес | 8 000 |
| Team | $59/мес | 25 000 |
| Enterprise | $149+/мес | Безлимит |

> Все новые пользователи получают **7 дней Starter бесплатно**

---

## Лицензия

MIT © 2026 Strategy AI
