const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications — список уведомлений
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_email = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.email]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unread });
  } catch (err) { next(err); }
});

// POST /api/notifications/read-all — прочитать все
router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_email = $1`,
      [req.user.email]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_email = $2`,
      [req.params.id, req.user.email]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_email = $2`,
      [req.params.id, req.user.email]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Хелпер: создать уведомление (используется внутри других роутов)
async function createNotification(userEmail, { type = 'info', title, body, link = '' }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_email, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userEmail, type, title, body, link]
    );
  } catch (e) {
    console.error('createNotification error:', e.message);
  }
}

module.exports = { router, createNotification };
