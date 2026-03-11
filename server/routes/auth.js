const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { signToken, signRefreshToken, requireAuth } = require('../middleware/auth');
const { sendEmail, welcomeEmail, resetPasswordEmail } = require('./email');

// Вспомогательная функция: пользователь без пароля
function safeUser(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const emailLower = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 12);
    const displayName = name?.trim() || emailLower.split('@')[0];

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       RETURNING id, email, name, bio, tier, ai_lang, notif_email, notif_push, auto_save, compact_mode, default_view, created_at`,
      [emailLower, hash, displayName]
    );

    const user = rows[0];
    // Создаём дефолтный проект
    await pool.query(
      `INSERT INTO projects (owner_email, name, members)
       VALUES ($1, 'Моя стратегия', $2)`,
      [emailLower, JSON.stringify([{ email: emailLower, role: 'owner' }])]
    );

    // Триальный период: 7 дней Pro бесплатно
    const trialDays = parseInt(process.env.TRIAL_DAYS || '7');
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET tier = 'starter', trial_ends_at = $1 WHERE email = $2`,
      [trialEndsAt.toISOString(), emailLower]
    );

    const token = signToken({ email: user.email, id: user.id });
    const refreshToken = signRefreshToken({ email: user.email, id: user.id });

    // Отправляем welcome email асинхронно
    const { subject, html } = welcomeEmail(displayName);
    sendEmail({ to: emailLower, subject, html }).catch(() => {});

    // Обновляем пользователя с trial-тарифом
    const { rows: trialUser } = await pool.query(
      'SELECT id, email, name, bio, tier, ai_lang, notif_email, notif_push, auto_save, compact_mode, default_view, trial_ends_at, created_at FROM users WHERE email = $1',
      [emailLower]
    );
    res.status(201).json({ token, refreshToken, user: safeUser(trialUser[0] || user), isNew: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

    const emailLower = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [emailLower]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = signToken({ email: user.email, id: user.id });
    const refreshToken = signRefreshToken({ email: user.email, id: user.id });
    res.json({ token, refreshToken, user: safeUser(user), isNew: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — получить текущего пользователя по токену
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/profile — обновить профиль
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, bio, ai_lang, notif_email, notif_push, auto_save, compact_mode, default_view } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET
        name         = COALESCE($1, name),
        bio          = COALESCE($2, bio),
        ai_lang      = COALESCE($3, ai_lang),
        notif_email  = COALESCE($4, notif_email),
        notif_push   = COALESCE($5, notif_push),
        auto_save    = COALESCE($6, auto_save),
        compact_mode = COALESCE($7, compact_mode),
        default_view = COALESCE($8, default_view),
        updated_at   = now()
       WHERE email = $9
       RETURNING id, email, name, bio, tier, ai_lang, notif_email, notif_push, auto_save, compact_mode, default_view, created_at`,
      [name, bio, ai_lang, notif_email, notif_push, auto_save, compact_mode, default_view, req.user.email]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Заполните все поля' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль минимум 6 символов' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [req.user.email]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Неверный текущий пароль' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE email = $2', [hash, req.user.email]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh — обновить access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken обязателен' });
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    let decoded;
    try { decoded = jwt.verify(refreshToken, secret); }
    catch { return res.status(401).json({ error: 'Refresh token истёк или недействителен' }); }

    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [decoded.email]);
    if (!rows[0]) return res.status(401).json({ error: 'Пользователь не найден' });

    const { signToken: st, signRefreshToken: srt } = require('../middleware/auth');
    const token = st({ email: rows[0].email, id: rows[0].id });
    const newRefresh = srt({ email: rows[0].email, id: rows[0].id });
    res.json({ token, refreshToken: newRefresh });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен' });
    const emailLower = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT name FROM users WHERE email = $1', [emailLower]);
    // Не раскрываем существование аккаунта — всегда отвечаем success
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 час
      await pool.query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3`,
        [token, expires, emailLower]
      );
      const { subject, html } = resetPasswordEmail(rows[0].name, token);
      sendEmail({ to: emailLower, subject, html }).catch(() => {});
    }
    res.json({ ok: true, message: 'Если email зарегистрирован — письмо отправлено' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'token и newPassword обязательны' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const { rows } = await pool.query(
      `SELECT email FROM users WHERE reset_token = $1 AND reset_token_expires > now()`,
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Ссылка недействительна или истекла' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = now()
       WHERE email = $2`,
      [hash, rows[0].email]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/auth/account — удалить аккаунт
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM users WHERE email = $1', [req.user.email]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
