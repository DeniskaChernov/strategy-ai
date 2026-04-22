import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** Базовый цвет (акцент) узла. */
  color: string;
  /** id градиента для прогресс-бара/акцента внутри <defs>. */
  gradId: string;
};

const EDGES: Array<{ from: string; to: string; gradId: string }> = [
  { from: "n1", to: "n2", gradId: "lmd-e-pg" },
  { from: "n1", to: "n3", gradId: "lmd-e-po" },
  { from: "n2", to: "n4", gradId: "lmd-e-gc" },
  { from: "n3", to: "n4", gradId: "lmd-e-oc" },
];

const VB_W = 960;
const VB_H = 460;

function center(n: DemoNode): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** Гладкий S-кейв между двумя точками; контрольные точки сдвинуты горизонтально,
 *  чтобы линии приходили в узлы ближе к «середине» стороны — смотрится аккуратнее. */
function edgePath(a: DemoNode, b: DemoNode): string {
  const p1 = center(a);
  const p2 = center(b);
  const dx = p2.x - p1.x;
  const c1x = p1.x + dx * 0.55;
  const c1y = p1.y;
  const c2x = p2.x - dx * 0.55;
  const c2y = p2.y;
  return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

/** Демо-карта на лендинге: панорама, зум, hover по узлам; без API. */
export function LandingMapDemo({
  theme,
  t,
  onTry,
}: {
  theme: string;
  t: TFn;
  onTry?: () => void;
}) {
  const nodes = useMemo<DemoNode[]>(
    () => [
      {
        id: "n1",
        x: 64,
        y: 182,
        w: 196,
        h: 96,
        tk: "ref_demo_n1",
        tf: "Цель: рост MRR",
        progress: 44,
        color: "#a278ff",
        gradId: "lmd-n-purple",
      },
      {
        id: "n2",
        x: 382,
        y: 40,
        w: 196,
        h: 96,
        tk: "ref_demo_n2",
        tf: "Запуск фичи",
        progress: 78,
        color: "#22d08a",
        gradId: "lmd-n-green",
      },
      {
        id: "n3",
        x: 382,
        y: 324,
        w: 196,
        h: 96,
        tk: "ref_demo_n3",
        tf: "Найм и процессы",
        progress: 32,
        color: "#ffa54a",
        gradId: "lmd-n-orange",
      },
      {
        id: "n4",
        x: 700,
        y: 182,
        w: 196,
        h: 96,
        tk: "ref_demo_n4",
        tf: "Масштабирование",
        progress: 58,
        color: "#38cff0",
        gradId: "lmd-n-cyan",
      },
    ],
    []
  );

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const isDark = theme === "dark";
  const gridStroke = isDark ? "rgba(255,255,255,.055)" : "rgba(104,54,245,.07)";
  const t1 = isDark ? "#eaeaf8" : "#08061a";
  const t3 = isDark ? "rgba(148,144,196,.62)" : "rgba(70,58,130,.58)";
  const trackBg = isDark ? "rgba(255,255,255,.07)" : "rgba(104,80,220,.1)";

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setZoom((z) => Math.min(2.25, Math.max(0.55, z * factor)));
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, []);

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const gTransform = useMemo(
    () => `translate(${pan.x} ${pan.y}) translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`,
    [pan.x, pan.y, zoom, cx, cy]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width < 1) return;
    const dx = (e.movementX / rect.width) * VB_W;
    const dy = (e.movementY / rect.height) * VB_H;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  return (
    <div
      className="land-map-demo"
      aria-label={t("ref_demo_aria", "Демонстрация карты: перетащите холст, колёсико — масштаб")}
    >
      <div className="land-map-demo__badge" aria-hidden>
        {t("ref_demo_badge", "DEMO")}
      </div>
      <div className="land-map-demo__bar">
        <div className="land-map-demo__dots" aria-hidden>
          <span className="land-map-demo__dot land-map-demo__dot--r" />
          <span className="land-map-demo__dot land-map-demo__dot--y" />
          <span className="land-map-demo__dot land-map-demo__dot--g" />
        </div>
        <div className="land-map-demo__url" title={t("ref_demo_url", "app.strategy-ai — карта проекта")}>
          <span className="land-map-demo__url-lock" aria-hidden>🔒</span>
          <span className="land-map-demo__url-text">{t("ref_demo_url", "app.strategy-ai — карта проекта")}</span>
        </div>
        <div className="land-map-demo__brand" aria-hidden>Strategy AI</div>
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
            <span className="land-map-demo__sb-dot" />
            {t("shell_scenarios", "Сценарии")}
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" />
            {t("shell_timeline", "Таймлайн")}
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" style={{ background: "#22d08a" }} />
            AI
          </div>
          <div className="land-map-demo__sb-item">
            <span className="land-map-demo__sb-dot" />
            {t("shell_insights", "Инсайты")}
          </div>
        </aside>
        <div
          className={"land-map-demo__canvas" + (dragging ? " land-map-demo__canvas--drag" : "")}
          style={{ touchAction: "none" }}
        >
          <div className="land-map-demo__vignette" aria-hidden />
          <button
            type="button"
            className="land-map-demo__reset"
            onClick={resetView}
            title={t("ref_demo_reset", "Сбросить вид")}
          >
            {t("ref_demo_reset_short", "1:1")}
          </button>
          <svg
            ref={svgRef}
            className="land-map-demo__svg"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <defs>
              {/* Акцентные градиенты прогресс-баров / левых акцентов узлов */}
              <linearGradient id="lmd-n-purple" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6836f5" />
                <stop offset="100%" stopColor="#b078ff" />
              </linearGradient>
              <linearGradient id="lmd-n-green" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#12c482" />
                <stop offset="100%" stopColor="#22d08a" />
              </linearGradient>
              <linearGradient id="lmd-n-orange" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f09428" />
                <stop offset="100%" stopColor="#ffb964" />
              </linearGradient>
              <linearGradient id="lmd-n-cyan" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#38cff0" />
              </linearGradient>
              {/* Градиенты связей: от цвета источника к цвету цели */}
              <linearGradient id="lmd-e-pg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a278ff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#22d08a" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="lmd-e-po" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a278ff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ffa54a" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="lmd-e-gc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d08a" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38cff0" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="lmd-e-oc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffa54a" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38cff0" stopOpacity="0.85" />
              </linearGradient>
              {/* Вертикальная подсветка фона узла */}
              <linearGradient id="lmd-node-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? "rgba(40,32,72,.96)" : "rgba(255,255,255,.98)"} />
                <stop offset="100%" stopColor={isDark ? "rgba(20,16,40,.96)" : "rgba(250,248,255,.96)"} />
              </linearGradient>
              <pattern id="lmd-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke={gridStroke} strokeWidth="0.5" />
              </pattern>
              {/* Мягкая тень под узлом */}
              <filter id="lmd-node-shadow" x="-15%" y="-20%" width="130%" height="150%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
                <feOffset dy="4" result="off" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.35" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Soft glow для связей */}
              <filter id="lmd-edge-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g transform={gTransform}>
              <rect width="100%" height="100%" fill="url(#lmd-grid)" opacity={isDark ? 0.85 : 0.6} />

              {/* Связи: сначала мягкий glow-слой, затем чёткая градиентная линия поверх */}
              <g fill="none" pointerEvents="none">
                {EDGES.map((e) => {
                  const a = nodeMap[e.from];
                  const b = nodeMap[e.to];
                  if (!a || !b) return null;
                  const d = edgePath(a, b);
                  return (
                    <g key={`${e.from}-${e.to}`}>
                      <path
                        d={d}
                        stroke={`url(#${e.gradId})`}
                        strokeWidth="6"
                        strokeLinecap="round"
                        opacity={isDark ? 0.22 : 0.16}
                        filter="url(#lmd-edge-glow)"
                      />
                      <path
                        d={d}
                        stroke={`url(#${e.gradId})`}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        opacity={isDark ? 0.95 : 0.85}
                      />
                      {/* dot-маркеры на концах */}
                      <circle cx={center(a).x} cy={center(a).y} r="2.6" fill={a.color} opacity="0.85" />
                      <circle cx={center(b).x} cy={center(b).y} r="2.6" fill={b.color} opacity="0.85" />
                    </g>
                  );
                })}
              </g>

              {/* Узлы */}
              {nodes.map((n) => {
                const pw = (n.w - 24) * (n.progress / 100);
                const hi = hoverId === n.id;
                const nodeBorder = hi
                  ? n.color
                  : isDark
                    ? "rgba(255,255,255,.1)"
                    : "rgba(104,80,220,.18)";
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: "default", transition: "transform .2s" }}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    pointerEvents="auto"
                    filter="url(#lmd-node-shadow)"
                  >
                    <title>{t(n.tk, n.tf)}</title>
                    {/* Подложка узла */}
                    <rect
                      width={n.w}
                      height={n.h}
                      rx="14"
                      fill="url(#lmd-node-bg)"
                      stroke={nodeBorder}
                      strokeWidth={hi ? 1.6 : 0.9}
                    />
                    {/* Лёгкий акцентный цвет в фоне при hover */}
                    {hi && (
                      <rect
                        width={n.w}
                        height={n.h}
                        rx="14"
                        fill={n.color}
                        opacity={isDark ? 0.09 : 0.07}
                        pointerEvents="none"
                      />
                    )}
                    {/* Левый акцентный бар */}
                    <rect x="0" y="0" width="4" height={n.h} rx="2" fill={`url(#${n.gradId})`} />
                    {/* Заголовок */}
                    <text
                      x="18"
                      y="34"
                      fill={t1}
                      fontSize="13.5"
                      fontWeight="700"
                      fontFamily="Inter,system-ui,sans-serif"
                      pointerEvents="none"
                    >
                      {t(n.tk, n.tf)}
                    </text>
                    {/* Подпись */}
                    <text
                      x="18"
                      y="52"
                      fill={t3}
                      fontSize="10.5"
                      fontFamily="Inter,system-ui,sans-serif"
                      pointerEvents="none"
                    >
                      {t("ref_demo_readonly", "Только просмотр · демо")}
                    </text>
                    {/* Progress-трек */}
                    <rect
                      x="18"
                      y={n.h - 20}
                      width={n.w - 36}
                      height="5"
                      rx="2.5"
                      fill={trackBg}
                      pointerEvents="none"
                    />
                    {/* Progress-заливка */}
                    <rect
                      x="18"
                      y={n.h - 20}
                      width={Math.max(4, pw - 12)}
                      height="5"
                      rx="2.5"
                      fill={`url(#${n.gradId})`}
                      pointerEvents="none"
                    />
                    {/* % справа */}
                    <text
                      x={n.w - 12}
                      y={n.h - 14}
                      fill={t3}
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="Inter,system-ui,sans-serif"
                      textAnchor="end"
                      pointerEvents="none"
                    >
                      {n.progress}%
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
      <div className="land-map-demo__hint">
        <p className="land-map-demo__hint-text">{t("ref_demo_controls", "Перетащите карту · колёсико — масштаб")}</p>
        <p className="land-map-demo__hint-sub">{t("ref_demo_hint", "Полная интерактивная карта — после регистрации в продукте.")}</p>
        {onTry ? (
          <button type="button" className="btn-p land-map-demo__try" onClick={onTry}>
            {t("ref_demo_try", "Попробовать бесплатно")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
