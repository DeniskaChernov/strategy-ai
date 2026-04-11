/** Копирует client/*.css → public/ и собирает Tailwind (для dev до полного build). */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
for (const f of ['global.css', 'landing.css', 'strategy-shell.css']) {
  fs.copyFileSync(path.join(root, 'client', f), path.join(root, 'public', f));
}
execSync('npm run build:tailwind', { cwd: root, stdio: 'inherit', shell: true });
console.log('sync-css: client → public + tailwind.css');
