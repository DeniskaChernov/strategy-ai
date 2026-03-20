/** Извлекает <style> из public/strategy-reference.html и превращает селекторы в префикс .sa-strategy-ui + классы .sa-* (без конфликта с #root). */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "strategy-reference.html"), "utf8");
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("no <style> in strategy-reference.html");
let css = m[1];
const pairs = [
  ["#toast", ".sa-toast-host"],
  ["#modal", ".sa-modal-host"],
  ["#m-box", ".sa-mbox"],
  ["#mbox", ".sa-mbox"],
  ["#s-settings", ".sa-screen-settings"],
  ["#s-insights", ".sa-screen-insights"],
  ["#s-ai", ".sa-screen-ai"],
  ["#s-timeline", ".sa-screen-timeline"],
  ["#s-scenarios", ".sa-screen-scenarios"],
  ["#s-map", ".sa-screen-map"],
  ["#canvas-wrap", ".sa-canvas-wrap"],
  ["#canvas", ".sa-canvas-host"],
  ["#topbar", ".sa-topbar"],
  ["#main", ".sa-main"],
  ["#sb", ".sa-sb"],
  ["#app", ".sa-app"],
  ["#bgl", ".sa-bgl"],
  ["#bgd", ".sa-bgd"],
];
for (const [a, b] of pairs) css = css.split(a).join(b);
css = css.replace(/^\.dk\{/gm, ".sa-strategy-ui.dk{");
css = css.replace(/^\.lt\{/gm, ".sa-strategy-ui.lt{");
css = css.replace(/\.lt /g, ".sa-strategy-ui.lt ");
css = css.replace(/\.lt\./g, ".sa-strategy-ui.lt.");
css = css.replace(/body\{background:var\(--bg\)/g, ".sa-strategy-ui{background:var(--bg)");
css = `/* Автогенерация: node scripts/gen-strategy-shell-css.js ← public/strategy-reference.html */\n` +
  `/* Корень: <div class="sa-strategy-ui dk|lt">…</div> */\n` +
  css.replace(/html,body\{height:100%;overflow:hidden;font-family:'Inter',sans-serif[^}]*\}/,
    "html,body{height:100%}.sa-strategy-ui{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;height:100%;min-height:100vh;max-height:100vh;overflow:hidden;display:flex;flex-direction:column}");
const appOverrides = `

/* ── overrides: React-карта (SVG-узлы), flex-цепочка (см. scripts/gen-strategy-shell-css.js) ── */
.sa-strategy-ui>.sa-app{flex:1;min-height:0;min-width:0;overflow:hidden}
.sa-canvas-wrap.sa-canvas-no-dots::before{display:none!important}
.sa-canvas-wrap>svg{pointer-events:auto!important;touch-action:none}
.sa-map-toolbar-rows{border-bottom:.5px solid var(--b1)}
`;
const out = path.join(root, "client", "strategy-shell.css");
fs.writeFileSync(out, css + appOverrides, "utf8");
console.log("wrote", out, "(" + Math.round((css + appOverrides).length / 1024) + " KB)");
