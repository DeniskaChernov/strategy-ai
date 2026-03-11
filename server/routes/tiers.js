const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Конфигурация тарифов (должна совпадать с фронтендом)
const TIERS = {
  free: {
    label: 'Free',
    price: 0,
    currency: 'USD',
    maps: 1,
    projects: 1,
    members: 1,
    scenarios: 0,
    ai_messages: 0,
    features: ['3 стратегии в месяц', 'Базовый анализ ниши', 'Базовая маркетинговая стратегия', 'Экспорт в текст'],
  },
  starter: {
    label: 'Starter',
    price: 9,
    currency: 'USD',
    stripe_price_id: process.env.STRIPE_PRICE_STARTER,
    maps: 3,
    projects: 3,
    members: 3,
    scenarios: 1,
    ai_messages: 1500,
    features: [
      'Unlimited стратегии',
      'До 1500 AI сообщений/мес',
      'Глубокий анализ ниши',
      'Стратегия продвижения',
      'Маркетинговая воронка',
      'Контент-стратегия',
      'Экспорт стратегии',
    ],
  },
  pro: {
    label: 'Pro',
    price: 29,
    currency: 'USD',
    stripe_price_id: process.env.STRIPE_PRICE_PRO,
    maps: 5,
    projects: 10,
    members: 5,
    scenarios: 3,
    ai_messages: 8000,
    features: [
      'Unlimited стратегии',
      'До 8000 AI сообщений/мес',
      'Расширенный анализ рынка',
      'Анализ конкурентов',
      'Воронки продаж',
      'Рекламные стратегии',
      'Генерация маркетинговых гипотез',
      'Приоритетная скорость',
    ],
  },
  team: {
    label: 'Team',
    price: 59,
    currency: 'USD',
    stripe_price_id: process.env.STRIPE_PRICE_TEAM,
    maps: 15,
    projects: 25,
    members: 10,
    scenarios: 10,
    ai_messages: 25000,
    features: [
      'Unlimited стратегии',
      'До 25000 AI сообщений/мес',
      'До 10 пользователей',
      'Совместная работа',
      'Сохранение стратегий',
      'Приоритетная поддержка',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price: 149,
    currency: 'USD',
    stripe_price_id: process.env.STRIPE_PRICE_ENTERPRISE,
    maps: 999999,
    projects: 999999,
    members: 999999,
    scenarios: 999999,
    ai_messages: 999999,
    features: [
      'Unlimited всё',
      'Индивидуальные лимиты',
      'API доступ',
      'Кастомные модели',
      'Персональная поддержка',
    ],
  },
};

// GET /api/tiers — список всех тарифов (публичный)
router.get('/', (req, res) => {
  const list = Object.entries(TIERS).map(([key, t]) => ({
    key,
    ...t,
    stripe_price_id: undefined, // скрываем от клиента
  }));
  res.json({ tiers: list });
});

// GET /api/tiers/usage — текущее использование (требует авторизации)
router.get('/usage', requireAuth, async (req, res, next) => {
  try {
    const email = req.user.email;
    const tier = req.user.tier || 'free';
    const monthKey = new Date().toISOString().slice(0, 7); // "2026-03"

    // AI сообщений за текущий месяц
    const { rows: aiRows } = await pool.query(
      'SELECT count FROM ai_usage WHERE user_email = $1 AND month_key = $2',
      [email, monthKey]
    );
    const aiUsed = aiRows[0]?.count || 0;

    // Проекты
    const { rows: projRows } = await pool.query(
      'SELECT count(*) FROM projects WHERE owner_email = $1',
      [email]
    );
    const projectsUsed = parseInt(projRows[0].count);

    // Карты
    const { rows: mapRows } = await pool.query(
      `SELECT count(*) FROM maps WHERE project_id IN
         (SELECT id FROM projects WHERE owner_email = $1)
       AND is_scenario = false`,
      [email]
    );
    const mapsUsed = parseInt(mapRows[0].count);

    const tierConfig = TIERS[tier] || TIERS.free;
    res.json({
      tier,
      tierConfig,
      usage: {
        ai_messages: { used: aiUsed, limit: tierConfig.ai_messages },
        projects: { used: projectsUsed, limit: tierConfig.projects },
        maps: { used: mapsUsed, limit: tierConfig.maps },
      },
    });
  } catch (err) { next(err); }
});

module.exports = { router, TIERS };
