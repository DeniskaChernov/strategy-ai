const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/search?q=маркетинг&type=maps|nodes — поиск по всем стратегиям
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q, type = 'all' } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });
    const query = q.trim();
    const email = req.user.email;

    const results = [];

    // Ищем по названию карты и ctx
    if (type === 'all' || type === 'maps') {
      const { rows } = await pool.query(
        `SELECT m.id, m.name, m.ctx, m.updated_at, p.id as project_id, p.name as project_name
         FROM maps m
         JOIN projects p ON p.id = m.project_id
         WHERE (p.owner_email = $1 OR p.members @> $2)
           AND (m.name ILIKE $3 OR m.ctx ILIKE $3)
         ORDER BY m.updated_at DESC LIMIT 20`,
        [email, JSON.stringify([{ email }]), `%${query}%`]
      );
      rows.forEach(r => results.push({
        type: 'map',
        id: r.id,
        title: r.name,
        subtitle: r.project_name,
        projectId: r.project_id,
        updatedAt: r.updated_at,
        highlight: r.ctx?.slice(0, 120),
      }));
    }

    // Ищем по содержимому узлов (JSONB)
    if (type === 'all' || type === 'nodes') {
      const { rows } = await pool.query(
        `SELECT m.id as map_id, m.name as map_name, p.id as project_id, p.name as project_name,
                node_data.node
         FROM maps m
         JOIN projects p ON p.id = m.project_id,
         jsonb_array_elements(m.nodes) AS node_data(node)
         WHERE (p.owner_email = $1 OR p.members @> $2)
           AND (node_data.node->>'title' ILIKE $3
             OR node_data.node->>'reason' ILIKE $3
             OR node_data.node->>'metric' ILIKE $3)
         LIMIT 30`,
        [email, JSON.stringify([{ email }]), `%${query}%`]
      );
      rows.forEach(r => {
        const node = r.node;
        if (!results.find(x => x.type === 'node' && x.id === node.id)) {
          results.push({
            type: 'node',
            id: node.id,
            title: node.title || '',
            subtitle: `${r.map_name} · ${r.project_name}`,
            mapId: r.map_id,
            projectId: r.project_id,
            status: node.status,
            priority: node.priority,
            progress: node.progress,
          });
        }
      });
    }

    res.json({ results });
  } catch (err) { next(err); }
});

module.exports = router;
