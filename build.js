const fs = require('fs');
const esbuild = require('esbuild');

fs.mkdirSync('public', { recursive: true });

esbuild.build({
  entryPoints: ['strategy-ai-full.tsx'],
  bundle: true,
  outfile: 'public/app.js',
  jsx: 'transform',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  minify: true,
}).then(() => {
  console.log('Build done.');
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
