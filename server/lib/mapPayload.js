/** Лимиты графа карты (синхронно с защитой БД и UX). */
const MAX_MAP_NODES = 600;
const MAX_MAP_EDGES = 4000;
const MAX_CTX_CHARS = 500000;
const MAX_MAP_NAME_LEN = 500;

/** @returns {string|null} текст ошибки или null */
function validateMapBody(body) {
  if (body.name != null && String(body.name).length > MAX_MAP_NAME_LEN) {
    return `Имя карты слишком длинное (макс. ${MAX_MAP_NAME_LEN} символов)`;
  }
  if (body.ctx != null && String(body.ctx).length > MAX_CTX_CHARS) {
    return `Контекст слишком большой (макс. ${MAX_CTX_CHARS} символов)`;
  }
  if (body.nodes !== undefined) {
    if (!Array.isArray(body.nodes)) return 'Поле nodes должно быть массивом';
    if (body.nodes.length > MAX_MAP_NODES) {
      return `Слишком много узлов (макс. ${MAX_MAP_NODES})`;
    }
  }
  if (body.edges !== undefined) {
    if (!Array.isArray(body.edges)) return 'Поле edges должно быть массивом';
    if (body.edges.length > MAX_MAP_EDGES) {
      return `Слишком много связей (макс. ${MAX_MAP_EDGES})`;
    }
  }
  return null;
}

module.exports = {
  MAX_MAP_NODES,
  MAX_MAP_EDGES,
  MAX_CTX_CHARS,
  MAX_MAP_NAME_LEN,
  validateMapBody,
};
