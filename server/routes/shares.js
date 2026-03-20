const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /api/shares — создать публичную ссылку для карты
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { mapId, projectId, projectName, mapData } = req.body;
    if (!mapId || !mapData) {
      return res.status(400).json({ error: 'mapId и mapData обязательны' });
    }

    const { rows: mapRows } = await pool.query(
      'SELECT id, project_id FROM maps WHERE id = $1',
      [mapId]
    );
    if (!mapRows[0]) return res.status(404).json({ error: 'Карта не найдена' });

    const mapProjectId = mapRows[0].project_id;
    if (projectId && projectId !== mapProjectId) {
      return res.status(400).json({ error: 'Карта не принадлежит указанному проекту' });
    }

    const { rows } = await pool.query(
      'SELECT id, owner_email, members FROM projects WHERE id = $1',
      [mapProjectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Проект не найден' });
    const project = rows[0];
    const isMember =
      project.owner_email === req.user.email ||
      (project.members || []).some(m => m && m.email === req.user.email);
    if (!isMember) return res.status(403).json({ error: 'Нет доступа к проекту' });

    const shareId = uuidv4().replace(/-/g, '').slice(0, 20);

    // Если уже есть share для этой карты — обновляем снимок
    const { rows: existing } = await pool.query(
      'SELECT id FROM shares WHERE map_id = $1', [mapId]
    );
    if (existing[0]) {
      await pool.query(
        `UPDATE shares SET snapshot = $1, project_name = $2, created_at = now() WHERE map_id = $3`,
        [JSON.stringify(mapData), projectName || '', mapId]
      );
      const { rows } = await pool.query('SELECT share_id FROM shares WHERE map_id = $1', [mapId]);
      const APP_URL = process.env.APP_URL || '';
      return res.json({ shareId: rows[0].share_id, url: `${APP_URL}?share=${rows[0].share_id}` });
    }

    await pool.query(
      `INSERT INTO shares (share_id, map_id, project_name, snapshot)
       VALUES ($1, $2, $3, $4)`,
      [shareId, mapId, projectName || '', JSON.stringify(mapData)]
    );

    const APP_URL = process.env.APP_URL || '';
    res.status(201).json({ shareId, url: `${APP_URL}?share=${shareId}` });
  } catch (err) { next(err); }
});

// GET /api/shares/:shareId — получить read-only данные карты
router.get('/:shareId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM shares WHERE share_id = $1', [req.params.shareId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ссылка недействительна или удалена' });

    const share = rows[0];
    res.json({
      map: share.snapshot,
      projectName: share.project_name,
      createdAt: share.created_at,
    });
  } catch (err) { next(err); }
});

// DELETE /api/shares/:shareId — удалить ссылку (владелец или участник проекта)
router.delete('/:shareId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, p.owner_email, p.members FROM shares s
       LEFT JOIN maps m ON m.id = s.map_id
       LEFT JOIN projects p ON p.id = m.project_id
       WHERE s.share_id = $1`,
      [req.params.shareId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ссылка не найдена' });
    const p = rows[0];
    const members = p.members || [];
    const can =
      p.owner_email === req.user.email ||
      members.some(m => m && m.email === req.user.email);
    if (!can) return res.status(403).json({ error: 'Нет прав' });

    await pool.query('DELETE FROM shares WHERE share_id = $1', [req.params.shareId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
