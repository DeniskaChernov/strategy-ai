const { renderIndex } = require('../server/seo');

const fakeReq = { protocol: 'https', get: () => 'www.strategy-ai.uz' };

for (const p of ['/', '/privacy', '/terms', '/app', '/app/projects/42', '/random']) {
  const html = renderIndex(p, fakeReq);
  if (!html) {
    console.log('PATH', p, 'NO HTML');
    continue;
  }
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  const desc = (html.match(/name="description"\s+content="([^"]+)"/) || [])[1];
  const canonical = (html.match(/rel="canonical"\s+href="([^"]+)"/) || [])[1];
  const robots = (html.match(/name="robots"\s+content="([^"]+)"/) || [])[1];
  const jsonLds = (html.match(/application\/ld\+json/g) || []).length;
  const hreflangs = (html.match(/rel="alternate"\s+hreflang="/g) || []).length;
  const h1match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const h1 = h1match ? h1match[1].slice(0, 80) : null;
  const mainSize = (html.match(/<!-- SEO:MAIN:BEGIN -->([\s\S]*?)<!-- SEO:MAIN:END -->/) || ['', ''])[1].length;
  console.log('PATH', p);
  console.log('  title     :', title);
  console.log('  desc      :', desc);
  console.log('  canonical :', canonical);
  console.log('  robots    :', robots);
  console.log('  jsonld    :', jsonLds);
  console.log('  hreflangs :', hreflangs);
  console.log('  h1        :', h1);
  console.log('  body-size :', mainSize, 'chars');
}
