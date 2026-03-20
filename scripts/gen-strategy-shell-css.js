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
  ["#map-canvas-wrap", ".sa-canvas-wrap"],
  ["#canvas", ".sa-canvas-host"],
  ["#topbar", ".sa-topbar"],
  ["#main", ".sa-main"],
  ["#sb", ".sa-sb"],
  ["#app-shell", ".sa-app"],
  ["#app", ".sa-app"],
  ["#v-app", ".sa-v-app"],
  ["#v-landing", ".sa-v-landing"],
  ["#v-tier", ".sa-v-tier"],
  ["#bgl", ".sa-bgl"],
  ["#bgd", ".sa-bgd"],
];
for (const [a, b] of pairs) css = css.split(a).join(b);
css = css.split(".map-canvas-wrap").join(".sa-canvas-wrap");
css = css.replace(/\.map-tb\b/g, ".map-toolbar");
css = css.replace(/^\.dk\{/gm, ".sa-strategy-ui.dk{");
css = css.replace(/^\.lt\{/gm, ".sa-strategy-ui.lt{");
css = css.replace(/\.lt /g, ".sa-strategy-ui.lt ");
css = css.replace(/\.lt\./g, ".sa-strategy-ui.lt.");
css = css.replace(/body\{background:var\(--bg\)/g, ".sa-strategy-ui{background:var(--bg)");
css = `/* Автогенерация: node scripts/gen-strategy-shell-css.js ← public/strategy-reference.html */\n` +
  `/* Корень: <div class="sa-strategy-ui dk|lt">…</div> */\n` +
  css.replace(/html,body\{[^}]+\}/,
    "html,body{height:100%}.sa-strategy-ui{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;height:100%;min-height:100vh;max-height:100vh;overflow:hidden;display:flex;flex-direction:column}");
const appOverrides = `

/* ── overrides: React-карта (SVG-узлы), flex-цепочка (см. scripts/gen-strategy-shell-css.js) ── */
.sa-strategy-ui>.sa-app{flex:1;min-height:0;min-width:0;overflow:hidden}
.sa-canvas-wrap.sa-canvas-no-dots::before{display:none!important}
.sa-canvas-wrap>svg{pointer-events:auto!important;touch-action:none}
.sa-map-toolbar-rows{border-bottom:.5px solid var(--b1);background:var(--top);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);min-width:0;overflow-x:hidden;overflow-y:visible}
.sa-map-toolbar-rows>div{min-width:0;max-width:100%;box-sizing:border-box}

/* Сайдбар: читаемее ширина */
.sa-sb{width:236px;min-width:236px}

/* CRM — в палитре акцента, без цианового «неона» */
.sa-strategy-ui .crm-sync{margin:0 12px 12px;background:rgba(104,54,245,.08);border:.5px solid rgba(104,54,245,.22);box-shadow:none}
.sa-strategy-ui .crm-sync:hover{background:rgba(104,54,245,.12)}
.sa-strategy-ui.lt .crm-sync{box-shadow:0 2px 14px rgba(104,54,245,.1)}
.sa-strategy-ui .cs-dot{background:var(--acc);animation:none;box-shadow:none}
.sa-strategy-ui .cs-title{color:var(--t2);font-weight:600}
.sa-strategy-ui .cs-sub{color:var(--t3);opacity:.9}

/* Контент main: на всю ширину колонки */
.sa-main .scr{max-width:none!important;width:100%;box-sizing:border-box}

/* Верхняя полоса: выравнивание по центру + перенос */
.sa-topbar{align-items:center;flex-wrap:wrap;row-gap:10px}
.sa-topbar .tb-r{flex-wrap:wrap;justify-content:flex-end;gap:10px;row-gap:8px;align-items:center}

/* Первая строка тулбара карты в одной теме с макетом */
.sa-map-toolbar-rows>div:first-child{border-bottom-color:var(--b1)!important}

/* Полоса «Стратегия / Контент-план» на карте */
.sa-map-cp-strip{background:var(--top)!important;border-bottom:.5px solid var(--b1)!important;padding:8px 18px!important}
.sa-map-cp-strip .cp-strip-label{display:none}

/* Вкладки разделов (MainWorkspaceNav) — те же токены, что .tabs/.tab в макете */
.sa-strategy-ui .workspace-nav-tabs.tabs{display:flex;background:var(--inp);border:.5px solid var(--b0);border-radius:10px;padding:3px;gap:2px;align-items:center}
.sa-strategy-ui .workspace-nav-tabs.tabs .tab{font-size:11.5px;color:var(--t3);cursor:pointer;padding:5px 12px;border-radius:7px;transition:all .18s;font-weight:500;user-select:none;border:none;background:transparent;font-family:inherit;line-height:1.2}
.sa-strategy-ui .workspace-nav-tabs.tabs .tab.on{background:var(--card);color:var(--t1);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.sa-strategy-ui.lt .workspace-nav-tabs.tabs .tab.on{background:rgba(255,255,255,.92);color:var(--acc);box-shadow:0 2px 8px rgba(104,54,245,.14)}
.sa-strategy-ui .workspace-nav-tabs.tabs .tab:disabled{opacity:1;cursor:default}
.sa-strategy-ui .workspace-nav-tabs.tabs.workspace-nav-tabs--sm .tab{font-size:11px;padding:4px 10px}

/* Нижняя плавающая панель: не дублировать тень glass-card */
.sa-canvas-wrap .map-toolbar.glass-card{border:none!important;box-shadow:none!important;background:transparent!important;padding:6px 8px!important}

/* Выход — без конфликта с .lang-btn (flex:1) */
.sa-shell-logout{margin:0 12px 12px;align-self:stretch;padding:8px 10px;border-radius:8px;border:.5px solid var(--b1);background:transparent;color:var(--t3);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .18s,color .18s}
.sa-shell-logout:hover{background:var(--rowh);color:var(--t2)}
`;
const out = path.join(root, "client", "strategy-shell.css");
fs.writeFileSync(out, css + appOverrides, "utf8");
console.log("wrote", out, "(" + Math.round((css + appOverrides).length / 1024) + " KB)");
