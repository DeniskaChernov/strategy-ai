/**
 * ⚠️ УЖЕ ВЫПОЛНЕНО. Повторный запуск сломает репозиторий (нет const CSS в TSX).
 * История: вынесли inline-стили в client/global.css + client/landing.css.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tsxPath = path.join(root, 'strategy-ai-full.tsx');
let s = fs.readFileSync(tsxPath, 'utf8');

function extractBacktickTemplate(src, marker) {
  const i = src.indexOf(marker);
  if (i === -1) throw new Error('Marker not found: ' + marker);
  const open = src.indexOf('`', i + marker.length);
  if (open === -1) throw new Error('No opening ` after ' + marker);
  let j = open + 1;
  while (j < src.length) {
    if (src[j] === '`' && src[j - 1] !== '\\') break;
    j++;
  }
  const content = src.slice(open + 1, j);
  let k = j + 1;
  while (k < src.length && /[\s\r\n]/.test(src[k])) k++;
  if (src[k] === ';') k++;
  if (src[k] === '\n') k++;
  if (src[k] === '\r') {
    k++;
    if (src[k] === '\n') k++;
  }
  let lineStart = i;
  while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
  return { content, before: src.slice(0, lineStart), after: src.slice(k) };
}

const land = extractBacktickTemplate(s, '  const LANDING_CSS=');
s = land.before + land.after;

const main = extractBacktickTemplate(s, 'const CSS=');
s = main.before + main.after;

fs.mkdirSync(path.join(root, 'client'), { recursive: true });
fs.writeFileSync(path.join(root, 'client', 'global.css'), main.content.trimEnd() + '\n', 'utf8');
fs.writeFileSync(path.join(root, 'client', 'landing.css'), land.content.trimEnd() + '\n', 'utf8');

s = s.replace(/\n\s*<style>\{CSS\}<\/style>\s*/g, '\n');
s = s.replace(/\n\s*<style>\{LANDING_CSS\}<\/style>\s*/g, '\n');

fs.writeFileSync(tsxPath, s, 'utf8');
console.log('OK: client/global.css, client/landing.css, strategy-ai-full.tsx updated');
