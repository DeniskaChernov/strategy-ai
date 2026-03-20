/** Проверка артефактов после `npm run build` / CI. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const need = ['public/app.js', 'public/global.css', 'public/landing.css'];
for (const rel of need) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p) || fs.statSync(p).size < 50) {
    console.error('Missing or empty:', rel);
    process.exit(1);
  }
}
console.log('verify-build-artifacts: OK');
