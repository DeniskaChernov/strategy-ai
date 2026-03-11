const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const MAX_VERSIONS = 20; // Хранить последние 20 версий на карту

// GET /api/projects/:projectId/maps/:mapId/versions
router.get('/:projectId/maps/:mapId/versions', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, map_id, user_email, label, created_at FROM map_versions
       WHERE map_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.params.mapId]
    );
    res.json({ versions: rows });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/maps/:mapId/versions — сохранить снимок версии
router.post('/:projectId/maps/:mapId/versions', requireAuth, async (req, res, next) => {
  try {
    const { label, nodes, edges, ctx } = req.body;
    await pool.query(
      `INSERT INTO map_versions (map_id, user_email, label, nodes, edges, ctx)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.mapId, req.user.email, label || 'Версия', JSON.stringify(nodes || []), JSON.stringify(edges || []), ctx || '']
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

// GET /api/projects/:projectId/maps/:mapId/versions/:versionId — получить версию
router.get('/:projectId/maps/:mapId/versions/:versionId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM map_versions WHERE id = $1 AND map_id = $2`,
      [req.params.versionId, req.params.mapId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Версия не найдена' });
    res.json({ version: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/maps/:mapId/versions/:versionId/restore — откатиться
router.post('/:projectId/maps/:mapId/versions/:versionId/restore', requireAuth, async (req, res, next) => {
  try {
    const { rows: verRows } = await pool.query(
      `SELECT * FROM map_versions WHERE id = $1 AND map_id = $2`,
      [req.params.versionId, req.params.mapId]
    );
    if (!verRows[0]) return res.status(404).json({ error: 'Версия не найдена' });

    const v = verRows[0];
    const { rows } = await pool.query(
      `UPDATE maps SET nodes = $1, edges = $2, ctx = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [v.nodes, v.edges, v.ctx, req.params.mapId]
    );
    res.json({ map: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
