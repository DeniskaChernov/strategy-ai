const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Создание всех таблиц ──────────────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Пользователи
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email           TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        name            TEXT NOT NULL DEFAULT '',
        bio             TEXT NOT NULL DEFAULT '',
        tier            TEXT NOT NULL DEFAULT 'free',
        trial_ends_at   TIMESTAMPTZ,
        ai_lang         TEXT NOT NULL DEFAULT 'ru',
        notif_email     BOOLEAN NOT NULL DEFAULT true,
        notif_push      BOOLEAN NOT NULL DEFAULT true,
        auto_save       BOOLEAN NOT NULL DEFAULT true,
        compact_mode    BOOLEAN NOT NULL DEFAULT false,
        default_view    TEXT NOT NULL DEFAULT 'canvas',
        stripe_customer_id      TEXT,
        stripe_subscription_id  TEXT,
        tier_valid_until         TIMESTAMPTZ,
        reset_token              TEXT,
        reset_token_expires      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Сессии (JWT revocation list, если понадобится)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Проекты
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
        name        TEXT NOT NULL DEFAULT 'Мой проект',
        members     JSONB NOT NULL DEFAULT '[]',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Карты / Стратегии
    await client.query(`
      CREATE TABLE IF NOT EXISTS maps (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name        TEXT NOT NULL DEFAULT 'Стратегия',
        nodes       JSONB NOT NULL DEFAULT '[]',
        edges       JSONB NOT NULL DEFAULT '[]',
        ctx         TEXT NOT NULL DEFAULT '',
        is_scenario BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Публичные ссылки (read-only шаринг)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        share_id     TEXT UNIQUE NOT NULL,
        map_id       UUID REFERENCES maps(id) ON DELETE CASCADE,
        project_name TEXT NOT NULL DEFAULT '',
        snapshot     JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Счётчик AI-сообщений по месяцам
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
        month_key   TEXT NOT NULL,
        count       INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_email, month_key)
      )
    `);

    // История версий карты
    await client.query(`
      CREATE TABLE IF NOT EXISTS map_versions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        map_id      UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        user_email  TEXT NOT NULL,
        label       TEXT NOT NULL DEFAULT '',
        nodes       JSONB NOT NULL DEFAULT '[]',
        edges       JSONB NOT NULL DEFAULT '[]',
        ctx         TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // In-app уведомления
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
        type        TEXT NOT NULL DEFAULT 'info',
        title       TEXT NOT NULL DEFAULT '',
        body        TEXT NOT NULL DEFAULT '',
        link        TEXT NOT NULL DEFAULT '',
        is_read     BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Индексы
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_owner   ON projects(owner_email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_maps_project     ON maps(project_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_user    ON ai_usage(user_email, month_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shares_sid       ON shares(share_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_map_versions_map ON map_versions(map_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_email, is_read)`);
    // Полнотекстовый поиск по картам
    await client.query(`CREATE INDEX IF NOT EXISTS idx_maps_search ON maps USING gin(to_tsvector('russian', name || ' ' || ctx))`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_maps_nodes_search ON maps USING gin(nodes)`);

    // Миграция: добавляем новые колонки если их нет (для уже существующих БД)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`);

    await client.query('COMMIT');
    console.log('✅ Database initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ DB init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
