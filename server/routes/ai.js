const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Лимиты AI сообщений по тарифу (в месяц)
const AI_LIMITS = {
  free:       0,
  starter:    1500,
  pro:        8000,
  team:       25000,
  enterprise: 999999,
};

// POST /api/ai/chat — проксирование запроса к Anthropic с проверкой лимита
router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const email = req.user.email;
    const tier = req.user.tier || 'free';
    const monthKey = new Date().toISOString().slice(0, 7);
    const limit = AI_LIMITS[tier] ?? 0;

    // Получаем текущий счётчик
    const { rows: usageRows } = await pool.query(
      'SELECT count FROM ai_usage WHERE user_email = $1 AND month_key = $2',
      [email, monthKey]
    );
    const used = usageRows[0]?.count || 0;

    if (limit === 0) {
      return res.status(403).json({
        error: 'AI-чат недоступен на бесплатном тарифе. Улучшите до Starter.',
        code: 'AI_LIMIT_FREE',
      });
    }
    if (used >= limit) {
      return res.status(403).json({
        error: `Исчерпан лимит AI сообщений (${limit} в месяц). Улучшите тариф.`,
        code: 'AI_LIMIT_REACHED',
        used,
        limit,
      });
    }

    const { messages, system, maxTokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages обязателен (массив)' });
    }

    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI временно недоступен (не настроен API ключ)' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: maxTokens || 1200,
        system: system || '',
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(502).json({ error: 'Ошибка AI сервиса. Попробуйте позже.' });
    }

    const data = await response.json();

    // Увеличиваем счётчик
    await pool.query(
      `INSERT INTO ai_usage (user_email, month_key, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_email, month_key)
       DO UPDATE SET count = ai_usage.count + 1`,
      [email, monthKey]
    );

    const newUsed = used + 1;
    res.json({
      content: data.content,
      usage: { used: newUsed, limit, remaining: limit - newUsed },
    });
  } catch (err) { next(err); }
});

// GET /api/ai/usage — текущий лимит
router.get('/usage', requireAuth, async (req, res, next) => {
  try {
    const email = req.user.email;
    const tier = req.user.tier || 'free';
    const monthKey = new Date().toISOString().slice(0, 7);
    const limit = AI_LIMITS[tier] ?? 0;

    const { rows } = await pool.query(
      'SELECT count FROM ai_usage WHERE user_email = $1 AND month_key = $2',
      [email, monthKey]
    );
    const used = rows[0]?.count || 0;
    res.json({ used, limit, remaining: Math.max(0, limit - used), tier });
  } catch (err) { next(err); }
});

module.exports = router;
