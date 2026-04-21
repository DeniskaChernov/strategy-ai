const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

fs.mkdirSync('public', { recursive: true });
for (const f of ['global.css', 'landing.css', 'strategy-shell.css']) {
  fs.copyFileSync(path.join(__dirname, 'client', f), path.join(__dirname, 'public', f));
}

const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://www.strategy-ai.uz').replace(/\/$/, '');
const envConfig = {
  ga4: process.env.GA4_MEASUREMENT_ID || '',
  clarity: process.env.CLARITY_PROJECT_ID || '',
  siteUrl,
  demoVideo: process.env.DEMO_VIDEO_URL || '',
  ogImage: process.env.PUBLIC_OG_IMAGE || '',
};
fs.writeFileSync(
  path.join(__dirname, 'public', 'env-config.js'),
  `window.__SA_CONFIG__=${JSON.stringify(envConfig)};\n`,
  'utf8'
);

const today = new Date().toISOString().slice(0, 10);
const sitemapPaths = ['', 'app', 'privacy', 'terms', '404'];
const sitemapBody = sitemapPaths
  .map((seg) => {
    const loc = seg ? `${siteUrl}/${seg}` : `${siteUrl}/`;
    const pr = seg === '' ? '1.0' : '0.64';
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${pr}</priority></url>`;
  })
  .join('\n');
fs.writeFileSync(
  path.join(__dirname, 'public', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapBody}\n</urlset>\n`,
  'utf8'
);
fs.writeFileSync(
  path.join(__dirname, 'public', 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`,
  'utf8'
);

function resolveClientAlias(importPath) {
  const rel = importPath.slice(2);
  const base = path.join(__dirname, 'client', rel);
  const candidates = [base, `${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (_) {
      /* ignore */
    }
  }
  return `${base}.tsx`;
}

const atAliasPlugin = {
  name: 'at-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolveClientAlias(args.path),
    }));
  },
};

for (const f of fs.readdirSync(path.join(__dirname, 'public'))) {
  if (f.startsWith('chunk-') && f.endsWith('.js')) {
    try { fs.unlinkSync(path.join(__dirname, 'public', f)); } catch (_) { /* ignore */ }
  }
}

esbuild.build({
  entryPoints: { app: 'strategy-ai-full.tsx' },
  bundle: true,
  outdir: 'public',
  format: 'esm',
  splitting: true,
  jsx: 'transform',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  minify: true,
  entryNames: '[name]',
  chunkNames: 'chunk-[hash]',
  plugins: [atAliasPlugin],
}).then(() => {
  const app = fs.readFileSync('public/app.js');
  const hash = crypto.createHash('sha256').update(app).digest('hex').slice(0, 16);
  const builtAt = new Date().toISOString();
  const chunks = fs
    .readdirSync(path.join(__dirname, 'public'))
    .filter((f) => f.startsWith('chunk-') && f.endsWith('.js'))
    .map((f) => ({ name: f, size: fs.statSync(path.join(__dirname, 'public', f)).size }));
  fs.writeFileSync(
    'public/build-meta.json',
    JSON.stringify({ appHash: hash, builtAt, chunks }, null, 0) + '\n',
    'utf8'
  );
  const chunksStr = chunks.map((c) => `${c.name}:${c.size}B`).join(', ');
  console.log('Build done.', `app.js sha256:${hash}`, chunks.length ? `chunks: ${chunksStr}` : 'no chunks');
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
