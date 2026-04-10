/** Проверка артефактов после `npm run build` / CI. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const need = ['public/app.js', 'public/global.css', 'public/landing.css', 'public/strategy-shell.css'];
for (const rel of need) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p) || fs.statSync(p).size < 50) {
    console.error('Missing or empty:', rel);
    process.exit(1);
  }
}
/** Исходники лендинга, которые не должны пропадать из репозитория (ловит «тихие» откаты). */
const clientNeed = [
  'client/landing-testimonials-columns.tsx',
  'client/landing-pricing-cards.tsx',
];
for (const rel of clientNeed) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p) || fs.statSync(p).size < 80) {
    console.error('Missing or too small (landing source):', rel);
    process.exit(1);
  }
}
console.log('verify-build-artifacts: OK');
