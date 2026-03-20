/** Копирует client/*.css → public/ (для dev до полного build). */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['global.css', 'landing.css', 'strategy-shell.css']) {
  fs.copyFileSync(path.join(root, 'client', f), path.join(root, 'public', f));
}
console.log('sync-css: client → public (global.css, landing.css, strategy-shell.css)');
