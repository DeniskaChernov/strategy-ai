/**
 * Seed script — запускать вручную: node server/seed.js
 *
 * Создаёт:
 *  - Таблицы БД (если не существуют)
 *  - Admin-аккаунт (данные берёт из переменных окружения или .env)
 *  - Тестовый проект и карту
 *
 * Использование:
 *   DEV_EMAIL=you@example.com DEV_PASSWORD=secret123 node server/seed.js
 *   или заполни server/.env и запусти: node server/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./db');

const EMAIL    = process.env.DEV_EMAIL;
const PASSWORD = process.env.DEV_PASSWORD;
const NAME     = process.env.DEV_NAME     || 'Admin';
const TIER     = process.env.DEV_TIER     || 'team';

async function seed() {
  if (!EMAIL || !PASSWORD) {
    console.error('❌ Укажи DEV_EMAIL и DEV_PASSWORD в переменных окружения или в server/.env');
    process.exit(1);
  }

  console.log('🔄 Подключение к БД...');
  await initDB();
  console.log('✅ Таблицы созданы');

  // ── Проверяем аккаунт ──
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1', [EMAIL]
  );

  if (existing[0]) {
    // Обновляем тариф если уже существует
    await pool.query(
      `UPDATE users SET tier = $1, trial_ends_at = NULL, updated_at = now() WHERE email = $2`,
      [TIER, EMAIL]
    );
    console.log(`✅ Аккаунт уже существует — тариф обновлён на "${TIER}"`);
    await pool.end();
    return;
  }

  // ── Создаём аккаунт ──
  const hash = await bcrypt.hash(PASSWORD, 12);
  const { rows: user } = await pool.query(
    `INSERT INTO users (email, password_hash, name, tier, trial_ends_at)
     VALUES ($1, $2, $3, $4, NULL)
     RETURNING id`,
    [EMAIL, hash, NAME, TIER]
  );
  console.log(`✅ Аккаунт создан: ${EMAIL}  /  tier: ${TIER}`);

  // ── Создаём проект ──
  const { rows: proj } = await pool.query(
    `INSERT INTO projects (owner_email, name, members)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [EMAIL, 'Мой первый проект', JSON.stringify([{ email: EMAIL, role: 'owner' }])]
  );
  console.log(`✅ Проект создан: "Мой первый проект"`);

  // ── Создаём пример карты ──
  const nodes = [
    {
      id: 'node-1', x: 160, y: 200,
      title: 'Исследование рынка',
      status: 'completed', priority: 'high', progress: 100,
      reason: 'Понять целевую аудиторию и конкурентов',
      metric: 'Отчёт готов', tags: ['research'], comments: [], history: [],
    },
    {
      id: 'node-2', x: 480, y: 200,
      title: 'Запуск продукта',
      status: 'active', priority: 'critical', progress: 40,
      reason: 'Выпустить MVP и привлечь первых пользователей',
      metric: '100 активных пользователей', deadline: '2026-06-01',
      tags: ['product'], comments: [], history: [],
    },
    {
      id: 'node-3', x: 800, y: 200,
      title: 'Маркетинг и рост',
      status: 'planning', priority: 'high', progress: 0,
      reason: 'Масштабировать привлечение клиентов',
      metric: '$5 000 MRR', tags: ['marketing'], comments: [], history: [],
    },
  ];

  const edges = [
    { id: 'edge-1', source: 'node-1', target: 'node-2', from: 'node-1', to: 'node-2', type: 'requires', label: 'Требует' },
    { id: 'edge-2', source: 'node-2', target: 'node-3', from: 'node-2', to: 'node-3', type: 'leads',    label: 'Ведёт к' },
  ];

  await pool.query(
    `INSERT INTO maps (project_id, name, nodes, edges, ctx)
     VALUES ($1, $2, $3, $4, $5)`,
    [proj[0].id, 'Стратегия запуска', JSON.stringify(nodes), JSON.stringify(edges), 'стартап запуск продукт маркетинг']
  );
  console.log(`✅ Карта создана: "Стратегия запуска" (3 шага)`);

  console.log('\n🎉 Seed завершён успешно!');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Тариф:    ${TIER}`);
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed ошибка:', err.message);
  process.exit(1);
});
