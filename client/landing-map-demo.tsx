import React, { useMemo } from "react";

type TFn = (key: string, fallback?: string) => string;

type DemoNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tk: string;
  tf: string;
  progress: number;
  stroke: string;
  grad?: boolean;
  fillBar: string;
};

const EDGES: [string, string][] = [
  ["n1", "n2"],
  ["n1", "n3"],
  ["n2", "n4"],
  ["n3", "n4"],
];

function center(n: DemoNode): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function edgePath(a: DemoNode, b: DemoNode): string {
  const p1 = center(a);
  const p2 = center(b);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const c1x = p1.x + dx * 0.35;
  const c1y = p1.y + dy * 0.15;
  const c2x = p2.x - dx * 0.35;
  const c2y = p2.y - dy * 0.15;
  return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

/** Визуальная демо-карты Strategy AI на лендинге (без API, только просмотр). */
export function LandingMapDemo({ theme, t }: { theme: string; t: TFn }) {
  const nodes = useMemo<DemoNode[]>(
    () => [
      {
        id: "n1",
        x: 72,
        y: 168,
        w: 176,
        h: 92,
        tk: "ref_demo_n1",
        tf: "Цель: рост MRR",
        progress: 44,
        stroke: "#8864ff",
        grad: true,
        fillBar: "url(#land-demo-bar-purple)",
      },
      {
        id: "n2",
        x: 360,
        y: 36,
        w: 176,
        h: 92,
        tk: "ref_demo_n2",
        tf: "Запуск фичи",
        progress: 78,
        stroke: "#12c482",
        fillBar: "#12c482",
      },
      {
        id: "n3",
        x: 360,
        y: 300,
        w: 176,
        h: 92,
        tk: "ref_demo_n3",
        tf: "Найм и процессы",
        progress: 32,
        stroke: "#f09428",
        fillBar: "#f09428",
      },
      {
        id: "n4",
        x: 648,
        y: 168,
        w: 176,
        h: 92,
        tk: "ref_demo_n4",
        tf: "Масштабирование",
        progress: 58,
        stroke: "#06b6d4",
        grad: true,
        fillBar: "url(#land-demo-bar-cyan)",
      },
    ],
    []
  );

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const isDark = theme === "dark";
  const canvasBg = isDark ? "rgba(6,4,18,.55)" : "rgba(104,80,220,.06)";
  const gridStroke = isDark ? "rgba(255,255,255,.06)" : "rgba(104,54,245,.12)";
  const t1 = isDark ? "#eaeaf8" : "#08061a";
  const t3 = isDark ? "rgba(148,144,196,.55)" : "rgba(70,58,130,.5)";

  return (
    <div className="land-map-demo" aria-label={t("ref_demo_aria", "Демонстрация интерфейса карты стратегии, только просмотр")}>
      <div className="land-map-demo__badge" aria-hidden>
        {t("ref_demo_badge", "DEMO")}
      </div>
      <div className="land-map-demo__bar">
        <div className="land-map-demo__dots" aria-hidden>
          <span className="land-map-demo__dot land-map-demo__dot--r" />
          <span className="land-map-demo__dot land-map-demo__dot--y" />
          <span className="land-map-demo__dot land-map-demo__dot--g" />
        </div>
        <div className="land-map-demo__url">{t("ref_demo_url", "app.strategy-ai — карта проекта")}</div>
        <div className="land-map-demo__brand">Strategy AI</div>
      </div>
      <div className="land-map-demo__body">
        <aside className="land-map-demo__sb">
          <div className="land-map-demo__sb-head">
            <div className="land-map-demo__sb-logo" aria-hidden />
            <span>{t("shell_brand_short", "Strategy AI")}</span>
          </div>
          <div className="land-map-demo__sb-item land-map-demo__sb-item--on">
            <span className="land-map-demo__sb-dot" style={{ background: "#a278ff" }} />
            {t("shell_strategy_map", "Карта")}
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" style={{ background: "var(--t3)" }} />
            {t("shell_scenarios", "Сценарии")}
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" style={{ background: "var(--t3)" }} />
            {t("shell_timeline", "Таймлайн")}
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" style={{ background: "var(--green)" }} />
            AI
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" style={{ background: "var(--t3)" }} />
            {t("shell_insights", "Инсайты")}
          </div>
        </aside>
        <div className="land-map-demo__canvas" style={{ background: canvasBg }}>
          <svg className="land-map-demo__svg" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden>
            <defs>
              <linearGradient id="land-demo-bar-purple" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6836f5" />
                <stop offset="100%" stopColor="#a050ff" />
              </linearGradient>
              <linearGradient id="land-demo-bar-cyan" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <pattern id="land-demo-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke={gridStroke} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#land-demo-grid)" opacity={0.95} />
            <g stroke={isDark ? "rgba(160,150,220,.42)" : "rgba(104,54,245,.32)"} fill="none" strokeWidth="1.6">
              {EDGES.map(([from, to], i) => {
                const a = nodeMap[from];
                const b = nodeMap[to];
                if (!a || !b) return null;
                return <path key={`${from}-${to}-${i}`} d={edgePath(a, b)} />;
              })}
            </g>
            {nodes.map((n) => {
              const pw = (n.w - 24) * (n.progress / 100);
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <rect
                    width={n.w}
                    height={n.h}
                    rx="12"
                    fill={isDark ? "rgba(22,18,40,.94)" : "rgba(255,255,255,.95)"}
                    stroke="var(--b1)"
                    strokeWidth="0.75"
                  />
                  <rect x="0" y="0" width={n.w} height="3.5" rx="12" fill={n.stroke} />
                  <text x="12" y="30" fill={t1} fontSize="12" fontWeight="700" fontFamily="Inter,system-ui,sans-serif">
                    {t(n.tk, n.tf)}
                  </text>
                  <text x="12" y="48" fill={t3} fontSize="9.5" fontFamily="Inter,system-ui,sans-serif">
                    {t("ref_demo_readonly", "Только просмотр · демо")}
                  </text>
                  <rect x="12" y={n.h - 16} width={n.w - 24} height="4" rx="2" fill={isDark ? "rgba(255,255,255,.08)" : "rgba(104,80,220,.1)"} />
                  <rect x="12" y={n.h - 16} width={pw} height="4" rx="2" fill={n.fillBar} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <p className="land-map-demo__hint">{t("ref_demo_hint", "Полная интерактивная карта — после регистрации в продукте.")}</p>
    </div>
  );
}
