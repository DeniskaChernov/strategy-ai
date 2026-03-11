const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Лимиты карт по тарифу
const MAP_LIMITS = {
  free:       1,
  starter:    3,
  pro:        5,
  team:       15,
  enterprise: Infinity,
};

// Проверка доступа к проекту
async function getProjectAccess(projectId, userEmail) {
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!rows[0]) return { project: null, role: null };
  const project = rows[0];
  if (project.owner_email === userEmail) return { project, role: 'owner' };
  const member = (project.members || []).find(m => m.email === userEmail);
  return { project, role: member?.role || null };
}

// GET /api/projects/:projectId/maps
router.get('/:projectId/maps', requireAuth, async (req, res, next) => {
  try {
    const { project, role } = await getProjectAccess(req.params.projectId, req.user.email);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!role)    return res.status(403).json({ error: 'Нет доступа' });

    const { rows } = await pool.query(
      'SELECT * FROM maps WHERE project_id = $1 ORDER BY updated_at DESC',
      [req.params.projectId]
    );
    res.json({ maps: rows });
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/maps
router.post('/:projectId/maps', requireAuth, async (req, res, next) => {
  try {
    const { project, role } = await getProjectAccess(req.params.projectId, req.user.email);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Нет прав для создания карты' });

    const tier = req.user.tier || 'free';
    const limit = MAP_LIMITS[tier] ?? 1;

    const { rows: existing } = await pool.query(
      `SELECT count(*) FROM maps WHERE project_id IN
         (SELECT id FROM projects WHERE owner_email = $1)
       AND is_scenario = false`,
      [req.user.email]
    );
    if (parseInt(existing[0].count) >= limit) {
      return res.status(403).json({
        error: `Лимит карт для тарифа ${tier}: ${limit}. Улучшите тариф.`,
        code: 'MAP_LIMIT',
        tierLabel: tier,
        limit,
      });
    }

    const { name, nodes, edges, ctx, is_scenario } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO maps (project_id, name, nodes, edges, ctx, is_scenario)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.params.projectId,
        name || 'Новая стратегия',
        JSON.stringify(nodes || []),
        JSON.stringify(edges || []),
        ctx || '',
        is_scenario || false,
      ]
    );
    res.status(201).json({ map: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/projects/:projectId/maps/:mapId
router.get('/:projectId/maps/:mapId', requireAuth, async (req, res, next) => {
  try {
    const { project, role } = await getProjectAccess(req.params.projectId, req.user.email);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!role)    return res.status(403).json({ error: 'Нет доступа' });

    const { rows } = await pool.query(
      'SELECT * FROM maps WHERE id = $1 AND project_id = $2',
      [req.params.mapId, req.params.projectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карта не найдена' });
    res.json({ map: rows[0], role });
  } catch (err) { next(err); }
});

// PUT /api/projects/:projectId/maps/:mapId — полное обновление
router.put('/:projectId/maps/:mapId', requireAuth, async (req, res, next) => {
  try {
    const { project, role } = await getProjectAccess(req.params.projectId, req.user.email);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Нет прав для сохранения' });

    const { name, nodes, edges, ctx } = req.body;
    const { rows } = await pool.query(
      `UPDATE maps SET
         name       = COALESCE($1, name),
         nodes      = COALESCE($2, nodes),
         edges      = COALESCE($3, edges),
         ctx        = COALESCE($4, ctx),
         updated_at = now()
       WHERE id = $5 AND project_id = $6 RETURNING *`,
      [
        name,
        nodes !== undefined ? JSON.stringify(nodes) : undefined,
        edges !== undefined ? JSON.stringify(edges) : undefined,
        ctx,
        req.params.mapId,
        req.params.projectId,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карта не найдена' });

    // Автосохранение версии каждые 10 изменений (по количеству узлов)
    try {
      const { rows: vCount } = await pool.query(
        'SELECT count(*) FROM map_versions WHERE map_id = $1', [req.params.mapId]
      );
      const shouldSaveVersion =
        parseInt(vCount[0].count) === 0 ||
        (nodes && Array.isArray(nodes) && nodes.length > 0);

      if (shouldSaveVersion) {
        await pool.query(
          `INSERT INTO map_versions (map_id, user_email, label, nodes, edges, ctx)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.mapId, req.user.email, `Авто: ${new Date().toLocaleString('ru')}`,
           JSON.stringify(nodes || rows[0].nodes), JSON.stringify(edges || rows[0].edges), ctx || rows[0].ctx]
        );
        // Удаляем старые версии сверх 20
        await pool.query(
          `DELETE FROM map_versions WHERE id IN (
            SELECT id FROM map_versions WHERE map_id = $1 ORDER BY created_at DESC OFFSET 20
          )`, [req.params.mapId]
        );
      }
    } catch (vErr) {
      console.warn('Version save error (non-fatal):', vErr.message);
    }

    // Уведомляем других участников проекта об изменении карты
    const project = await pool.query('SELECT members, name FROM projects WHERE id = $1', [req.params.projectId]);
    if (project.rows[0]) {
      const mapName = rows[0].name || 'карта';
      const projName = project.rows[0].name || 'проект';
      const members = project.rows[0].members || [];
      for (const m of members) {
        if (m.email !== req.user.email && m.role !== 'viewer') {
          await createNotification(m.email, {
            type: 'info',
            title: `✏️ Карта обновлена`,
            body: `${req.user.name || req.user.email} обновил карту «${mapName}» в проекте «${projName}»`,
          }).catch(() => {});
        }
      }
    }

    res.json({ map: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:projectId/maps/:mapId
router.delete('/:projectId/maps/:mapId', requireAuth, async (req, res, next) => {
  try {
    const { project, role } = await getProjectAccess(req.params.projectId, req.user.email);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Нет прав для удаления' });

    const { rows } = await pool.query(
      'DELETE FROM maps WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.mapId, req.params.projectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карта не найдена' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
