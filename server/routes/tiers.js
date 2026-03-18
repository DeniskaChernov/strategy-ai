const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Единый источник правды: shared/tiers.json
let TIERS_RAW = null;
function loadTiers() {
  if (TIERS_RAW) return TIERS_RAW;
  try {
    const p = path.join(__dirname, '../../shared/tiers.json');
    const data = fs.readFileSync(p, 'utf8');
    TIERS_RAW = JSON.parse(data);
    return TIERS_RAW;
  } catch (e) {
    console.warn('shared/tiers.json not found, using fallback:', e.message);
    const fallbackPath = path.join(__dirname, 'tiers.fallback.json');
    TIERS_RAW = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    return TIERS_RAW;
  }
}

const TIERS = (() => {
  const raw = loadTiers();
  const tierKeys = {
    starter: 'STRIPE_PRICE_STARTER',
    pro: 'STRIPE_PRICE_PRO',
    team: 'STRIPE_PRICE_TEAM',
    enterprise: 'STRIPE_PRICE_ENTERPRISE',
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = {
      ...v,
      stripe_price_id: tierKeys[k] ? process.env[tierKeys[k]] : undefined,
    };
  }
  return out;
})();

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

    // Карты (не сценарии)
    const { rows: mapRows } = await pool.query(
      `SELECT count(*) FROM maps WHERE project_id IN
         (SELECT id FROM projects WHERE owner_email = $1)
       AND is_scenario = false`,
      [email]
    );
    const mapsUsed = parseInt(mapRows[0].count);

    // Сценарии
    const { rows: scenarioRows } = await pool.query(
      `SELECT count(*) FROM maps WHERE project_id IN
         (SELECT id FROM projects WHERE owner_email = $1)
       AND is_scenario = true`,
      [email]
    );
    const scenariosUsed = parseInt(scenarioRows[0].count);

    const tierConfig = TIERS[tier] || TIERS.free;
    res.json({
      tier,
      tierConfig,
      usage: {
        ai_messages: { used: aiUsed, limit: tierConfig.ai_messages },
        projects: { used: projectsUsed, limit: tierConfig.projects },
        maps: { used: mapsUsed, limit: tierConfig.maps },
        scenarios: { used: scenariosUsed, limit: tierConfig.scenarios },
      },
    });
  } catch (err) { next(err); }
});

module.exports = { router, TIERS };
