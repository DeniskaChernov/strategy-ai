const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

fs.mkdirSync('public', { recursive: true });
for (const f of ['global.css', 'landing.css']) {
  fs.copyFileSync(path.join(__dirname, 'client', f), path.join(__dirname, 'public', f));
}

esbuild.build({
  entryPoints: ['strategy-ai-full.tsx'],
  bundle: true,
  outfile: 'public/app.js',
  jsx: 'transform',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  minify: true,
}).then(() => {
  const app = fs.readFileSync('public/app.js');
  const hash = crypto.createHash('sha256').update(app).digest('hex').slice(0, 16);
  const builtAt = new Date().toISOString();
  fs.writeFileSync(
    'public/build-meta.json',
    JSON.stringify({ appHash: hash, builtAt }, null, 0) + '\n',
    'utf8'
  );
  console.log('Build done.', `app.js sha256:${hash}`);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
