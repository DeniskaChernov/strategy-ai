const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Тарифные лимиты
const TIER_LIMITS = {
  free:       { projects: 1 },
  starter:    { projects: 3 },
  pro:        { projects: 10 },
  team:       { projects: 25 },
  enterprise: { projects: Infinity },
};

// GET /api/projects — все проекты пользователя (owner + member)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM projects
       WHERE owner_email = $1
          OR members @> $2
       ORDER BY updated_at DESC`,
      [req.user.email, JSON.stringify([{ email: req.user.email }])]
    );
    res.json({ projects: rows });
  } catch (err) { next(err); }
});

// POST /api/projects — создать проект
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const tier = req.user.tier || 'free';
    const limit = TIER_LIMITS[tier]?.projects ?? 1;

    const { rows: existing } = await pool.query(
      'SELECT count(*) FROM projects WHERE owner_email = $1',
      [req.user.email]
    );
    if (parseInt(existing[0].count) >= limit) {
      return res.status(403).json({
        error: `Лимит проектов для тарифа ${tier}: ${limit}. Улучшите тариф.`,
        code: 'PROJECT_LIMIT',
      });
    }

    const { name } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO projects (owner_email, name, members)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.email, name || 'Новый проект', JSON.stringify([{ email: req.user.email, role: 'owner' }])]
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/projects/:projectId
router.get('/:projectId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.projectId]);
    if (!rows[0]) return res.status(404).json({ error: 'Проект не найден' });

    const project = rows[0];
    const email = req.user.email;
    const isOwner = project.owner_email === email;
    const isMember = (project.members || []).some(m => m.email === email);
    if (!isOwner && !isMember) return res.status(403).json({ error: 'Нет доступа' });

    res.json({ project });
  } catch (err) { next(err); }
});

// PATCH /api/projects/:projectId — переименовать или обновить members
router.patch('/:projectId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND owner_email = $2',
      [req.params.projectId, req.user.email]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Только владелец может редактировать проект' });

    const { name, members } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(name);
    }
    if (members !== undefined && Array.isArray(members)) {
      updates.push(`members = $${i++}`);
      values.push(JSON.stringify(members));
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Укажите name или members' });

    values.push(req.params.projectId);
    const { rows: updated } = await pool.query(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ project: updated[0] });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_email = $2 RETURNING id',
      [req.params.projectId, req.user.email]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Только владелец может удалить проект' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/members — добавить участника
router.post('/:projectId/members', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND owner_email = $2',
      [req.params.projectId, req.user.email]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Только владелец может добавлять участников' });

    const project = rows[0];
    const tier = req.user.tier || 'free';
    const MEMBER_LIMITS = { free: 1, starter: 3, pro: 5, team: 10, enterprise: Infinity };
    const limit = MEMBER_LIMITS[tier] ?? 1;
    const members = project.members || [];

    if (members.length >= limit) {
      return res.status(403).json({
        error: `Лимит участников для тарифа ${tier}: ${limit}`,
        code: 'MEMBER_LIMIT',
      });
    }

    const { email, role } = req.body;
    if (!email || !['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Укажите email и роль (editor / viewer)' });
    }

    const invitedEmail = email.trim().toLowerCase();
    if (members.some(m => m.email === invitedEmail)) {
      return res.status(409).json({ error: 'Участник уже добавлен' });
    }

    const newMembers = [...members, { email: invitedEmail, role }];
    const { rows: updated } = await pool.query(
      `UPDATE projects SET members = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [JSON.stringify(newMembers), req.params.projectId]
    );
    res.json({ project: updated[0] });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:projectId/members/:memberEmail — удалить участника
router.delete('/:projectId/members/:memberEmail', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND owner_email = $2',
      [req.params.projectId, req.user.email]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Нет доступа' });

    const project = rows[0];
    const newMembers = (project.members || []).filter(
      m => m.email !== req.params.memberEmail
    );
    const { rows: updated } = await pool.query(
      `UPDATE projects SET members = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [JSON.stringify(newMembers), req.params.projectId]
    );
    res.json({ project: updated[0] });
  } catch (err) { next(err); }
});

module.exports = router;
