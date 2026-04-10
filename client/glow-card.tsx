import React, { useEffect, useRef, ReactNode, CSSProperties, HTMLAttributes } from "react";
import { getLastGlowPointer, subscribeGlowPointer } from "./lib/glow-pointer";

type Pos = { x: number; y: number };

/** Локальные % относительно padding-box (как у слоя spotlight с inset:0), не border-box. */
function applyGlowPointer(el: HTMLElement, p: Pos | null) {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  const bl = el.clientLeft;
  const bt = el.clientTop;
  const iw = el.clientWidth;
  const ih = el.clientHeight;
  const inside =
    p != null && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  if (inside && p) {
    const px = p.x - r.left - bl;
    const py = p.y - r.top - bt;
    const lx = (px / Math.max(iw, 1)) * 100;
    const ly = (py / Math.max(ih, 1)) * 100;
    el.style.setProperty("--lx", `${lx.toFixed(2)}%`);
    el.style.setProperty("--ly", `${ly.toFixed(2)}%`);
  } else {
    el.style.setProperty("--lx", "50%");
    el.style.setProperty("--ly", "50%");
  }
}

export interface GlowCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Стеклянная панель (welcome / реф-панели): токены из strategy-shell */
  panelVariant?: boolean;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange" | "accent";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  /** Если true — не задаём фиксированные sm/md/lg, размер из width/height/className */
  customSize?: boolean;
  /** Без spotlight и data-glow (карточки фич на лендинге) */
  plain?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  accent: { base: 265, spread: 280 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

/** Как в Tailwind: sm w-48 h-64, md w-64 h-80, lg w-80 h-96 */
const sizePx: Record<NonNullable<GlowCardProps["size"]>, { w: number; h: number }> = {
  sm: { w: 192, h: 256 },
  md: { w: 256, h: 320 },
  lg: { w: 320, h: 384 },
};

export function GlowCard({
  children,
  className = "",
  style: styleProp,
  panelVariant = false,
  glowColor = "accent",
  size = "md",
  width,
  height,
  customSize = false,
  plain = false,
  ...rest
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { ref: _refIgnored, style: _styleIgnored, ...domRest } = rest as typeof rest & {
    ref?: React.Ref<HTMLDivElement | null>;
    style?: CSSProperties;
  };
  const { base, spread } = glowColorMap[glowColor];
  const sz = sizePx[size];

  useEffect(() => {
    if (plain) return;
    const el = cardRef.current;
    if (!el) return;
    const syncCenter = () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      el.style.setProperty("--x", String(cx));
      el.style.setProperty("--y", String(cy));
      el.style.setProperty("--xp", (cx / Math.max(window.innerWidth, 1)).toFixed(4));
      el.style.setProperty("--yp", (cy / Math.max(window.innerHeight, 1)).toFixed(4));
    };
    syncCenter();
    window.addEventListener("resize", syncCenter);
    window.addEventListener("orientationchange", syncCenter);
    return () => {
      window.removeEventListener("resize", syncCenter);
      window.removeEventListener("orientationchange", syncCenter);
    };
  }, [plain]);

  useEffect(() => {
    if (plain) return () => {};
    return subscribeGlowPointer((p) => {
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty("--x", p.x.toFixed(2));
      el.style.setProperty("--xp", (p.x / Math.max(window.innerWidth, 1)).toFixed(4));
      el.style.setProperty("--y", p.y.toFixed(2));
      el.style.setProperty("--yp", (p.y / Math.max(window.innerHeight, 1)).toFixed(4));
      applyGlowPointer(el, p);
    });
  }, [plain]);

  useEffect(() => {
    if (plain) return;
    const el = cardRef.current;
    if (!el) return;
    const syncAfterLayout = () => applyGlowPointer(el, getLastGlowPointer());
    const ro = new ResizeObserver(syncAfterLayout);
    ro.observe(el);
    syncAfterLayout();
    return () => ro.disconnect();
  }, [plain]);

  const getInlineStyles = (): CSSProperties => {
    /** Базовый режим: rounded-2xl ≈ 16px. Толщина «кольца» glow — --gc-border (не путать с токеном цвета --border). */
    const radius = panelVariant ? 20 : 16;
    /** 3px — как у не-панели: заметное кольцо spotlight у ::before/::after при тонкой рамке панели. */
    const gcBorder = 3;

    const baseStyles: CSSProperties = {
      "--base": base,
      "--spread": spread,
      "--radius": radius,
      "--gc-border": gcBorder,
      "--backdrop": "hsl(0 0% 60% / 0.12)",
      "--backup-border": panelVariant ? "var(--glass-border-accent, var(--border))" : "var(--backdrop)",
      "--size": panelVariant ? 240 : 200,
      "--outer": plain ? 0 : 1,
      "--saturation": 100,
      "--lightness": panelVariant ? 68 : 70,
      "--bg-spot-opacity": plain ? 0 : panelVariant ? 0.34 : 0.1,
      "--border-spot-opacity": plain ? 0 : panelVariant ? 0.95 : 1,
      "--border-light-opacity": plain ? 0 : panelVariant ? 0.55 : 1,
      "--border-size": "calc(var(--gc-border, 3) * 1px)",
      "--spotlight-size": "calc(var(--size, 200) * 1px)",
      backgroundColor: panelVariant ? "var(--sb, var(--surface))" : "var(--backdrop, transparent)",
      border: panelVariant ? "0.5px solid var(--border)" : "var(--border-size) solid var(--backup-border)",
      position: "relative",
      touchAction: "manipulation",
      ...(panelVariant
        ? {
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "stretch",
            gap: 12,
            minHeight: 0,
          }
        : {
            display: "grid",
            gridTemplateRows: "1fr auto",
            gap: 16,
          }),
      padding: panelVariant ? 28 : 16,
      borderRadius: panelVariant ? "var(--r-xl, 20px)" : radius,
      boxShadow: plain
        ? panelVariant
          ? "0 10px 36px rgba(0,0,0,.28)"
          : "0 8px 24px rgba(0,0,0,.2)"
        : panelVariant
          ? "0 28px 70px rgba(0,0,0,.42)"
          : "0 1rem 2rem -1rem #000",
      backdropFilter: panelVariant ? "blur(44px) saturate(1.1)" : "blur(5px)",
      WebkitBackdropFilter: panelVariant ? "blur(44px) saturate(1.1)" : "blur(5px)",
      overflow: "hidden",
    };

    if (width !== undefined) {
      baseStyles.width = typeof width === "number" ? `${width}px` : width;
    } else if (!customSize) {
      baseStyles.width = sz.w;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === "number" ? `${height}px` : height;
    } else if (!customSize) {
      baseStyles.height = sz.h;
    }
    if (!customSize && width === undefined && height === undefined) {
      baseStyles.aspectRatio = "3 / 4";
    }

    return { ...baseStyles, ...styleProp };
  };

  const spotlightStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    pointerEvents: "none",
    zIndex: 1,
    overflow: "hidden",
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at var(--lx, 50%) var(--ly, 50%),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)),
      transparent
    )`,
  };

  return (
    <div
      ref={cardRef}
      {...(plain ? {} : { "data-glow": true })}
      className={`glow-card${panelVariant ? " glow-card--panel" : ""}${plain ? " glow-card--plain" : ""} ${className}`.trim()}
      style={getInlineStyles()}
      {...domRest}
    >
      {!plain && (
        <>
          <div data-glow aria-hidden className="glow-card-inner-glow" />
          <div aria-hidden className="glow-card-spotlight" style={spotlightStyle} />
        </>
      )}
      {children}
    </div>
  );
}
