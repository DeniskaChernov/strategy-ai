const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const MAX_VERSIONS = 20;

// Проверка доступа к проекту/карте — возвращает роль пользователя
async function getMapAccess(projectId, mapId, userEmail) {
  const { rows: pRows } = await pool.query(
    'SELECT id, owner_email, members FROM projects WHERE id = $1',
    [projectId]
  );
  if (!pRows[0]) return null;
  const project = pRows[0];

  let role = null;
  if (project.owner_email === userEmail) role = 'owner';
  else {
    const m = (project.members || []).find(x => x.email === userEmail);
    role = m?.role || null;
  }
  if (!role) return null;

  const { rows: mRows } = await pool.query(
    'SELECT id FROM maps WHERE id = $1 AND project_id = $2',
    [mapId, projectId]
  );
  if (!mRows[0]) return null;

  return role;
}

// GET /api/projects/:projectId/maps/:mapId/versions
router.get('/:projectId/maps/:mapId/versions', requireAuth, async (req, res, next) => {
  try {
    const role = await getMapAccess(req.params.projectId, req.params.mapId, req.user.email);
    if (!role) return res.status(403).json({ error: 'Нет доступа к карте' });

    const { rows } = await pool.query(
      `SELECT id, map_id, user_email, label, created_at FROM map_versions
       WHERE map_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.params.mapId]
    );
    res.json({ versions: rows });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/maps/:mapId/versions — сохранить снимок
router.post('/:projectId/maps/:mapId/versions', requireAuth, async (req, res, next) => {
  try {
    const role = await getMapAccess(req.params.projectId, req.params.mapId, req.user.email);
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Нет прав для сохранения версии' });

    const { label, nodes, edges, ctx } = req.body;
    await pool.query(
      `INSERT INTO map_versions (map_id, user_email, label, nodes, edges, ctx)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.params.mapId,
        req.user.email,
        (label || 'Версия').substring(0, 200),
        JSON.stringify(nodes || []),
        JSON.stringify(edges || []),
        (ctx || '').substring(0, 2000),
      ]
    );
    // Удаляем старые версии сверх лимита
    await pool.query(
      `DELETE FROM map_versions WHERE id IN (
        SELECT id FROM map_versions WHERE map_id = $1
        ORDER BY created_at DESC OFFSET $2
      )`,
      [req.params.mapId, MAX_VERSIONS]
    );
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/projects/:projectId/maps/:mapId/versions/:versionId
router.get('/:projectId/maps/:mapId/versions/:versionId', requireAuth, async (req, res, next) => {
  try {
    const role = await getMapAccess(req.params.projectId, req.params.mapId, req.user.email);
    if (!role) return res.status(403).json({ error: 'Нет доступа к карте' });

    const { rows } = await pool.query(
      `SELECT * FROM map_versions WHERE id = $1 AND map_id = $2`,
      [req.params.versionId, req.params.mapId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Версия не найдена' });
    res.json({ version: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/maps/:mapId/versions/:versionId/restore
router.post('/:projectId/maps/:mapId/versions/:versionId/restore', requireAuth, async (req, res, next) => {
  try {
    const role = await getMapAccess(req.params.projectId, req.params.mapId, req.user.email);
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Нет прав для восстановления' });

    const { rows: verRows } = await pool.query(
      `SELECT * FROM map_versions WHERE id = $1 AND map_id = $2`,
      [req.params.versionId, req.params.mapId]
    );
    if (!verRows[0]) return res.status(404).json({ error: 'Версия не найдена' });

    const v = verRows[0];
    const { rows } = await pool.query(
      `UPDATE maps SET nodes = $1, edges = $2, ctx = $3, updated_at = now()
       WHERE id = $4 AND project_id = $5 RETURNING *`,
      [v.nodes, v.edges, v.ctx, req.params.mapId, req.params.projectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карта не найдена' });
    res.json({ map: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
