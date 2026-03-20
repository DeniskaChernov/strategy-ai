const { pool } = require('../db');

/**
 * Участник проекта: owner | editor | viewer или null.
 */
async function getProjectAccess(projectId, userEmail) {
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!rows[0]) return { project: null, role: null };
  const project = rows[0];
  if (project.owner_email === userEmail) return { project, role: 'owner' };
  const member = (project.members || []).find((m) => m && m.email === userEmail);
  return { project, role: member?.role || null };
}

module.exports = { getProjectAccess };
