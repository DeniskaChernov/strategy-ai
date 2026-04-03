import React, { useEffect, useRef, ReactNode, CSSProperties } from "react";
import { subscribeGlowPointer } from "./lib/glow-pointer";

export interface GlowCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Стеклянная панель как welcome: классы sa-ref-panel + стили из strategy-shell */
  panelVariant?: boolean;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange" | "accent";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  accent: { base: 265, spread: 280 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

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
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { base, spread } = glowColorMap[glowColor];
  const sz = sizePx[size];

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--base", String(base));
    el.style.setProperty("--spread", String(spread));
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    el.style.setProperty("--x", String(cx));
    el.style.setProperty("--y", String(cy));
    el.style.setProperty("--xp", (cx / Math.max(window.innerWidth, 1)).toFixed(4));
    el.style.setProperty("--yp", (cy / Math.max(window.innerHeight, 1)).toFixed(4));
  }, [base, spread]);

  useEffect(() => {
    return subscribeGlowPointer((p) => {
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty("--x", p.x.toFixed(2));
      el.style.setProperty("--xp", (p.x / Math.max(window.innerWidth, 1)).toFixed(4));
      el.style.setProperty("--y", p.y.toFixed(2));
      el.style.setProperty("--yp", (p.y / Math.max(window.innerHeight, 1)).toFixed(4));
    });
  }, []);

  const inline: CSSProperties = {
    ...styleProp,
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 68) * 1%) / var(--bg-spot-opacity, 0.12)), transparent
    )`,
    backgroundColor: panelVariant ? "var(--sb, var(--surface))" : "var(--backdrop, transparent)",
    backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
    backgroundPosition: "50% 50%",
    backgroundAttachment: "fixed",
    border: panelVariant ? "0.5px solid var(--border)" : "var(--border-size) solid var(--backup-border)",
    position: "relative",
    touchAction: "manipulation",
    display: "grid",
    gridTemplateRows: "1fr auto",
    gap: panelVariant ? 12 : 16,
    padding: panelVariant ? 28 : 16,
    borderRadius: panelVariant ? "var(--r-xl, 20px)" : "var(--r-lg, 16px)",
    backdropFilter: panelVariant ? "blur(44px) saturate(1.1)" : "blur(6px)",
    WebkitBackdropFilter: panelVariant ? "blur(44px) saturate(1.1)" : "blur(6px)",
    boxShadow: panelVariant ? "0 28px 70px rgba(0,0,0,.42)" : "0 1rem 2rem -1rem rgba(0,0,0,.45)",
  };

  (inline as Record<string, unknown>)["--radius"] = panelVariant ? 20 : 16;
  (inline as Record<string, unknown>)["--border"] = panelVariant ? 1 : 2;
  (inline as Record<string, unknown>)["--backdrop"] = "hsl(0 0% 60% / 0.08)";
  (inline as Record<string, unknown>)["--backup-border"] = "var(--glass-border-accent, var(--border))";
  (inline as Record<string, unknown>)["--size"] = 200;
  (inline as Record<string, unknown>)["--outer"] = 1;
  (inline as Record<string, unknown>)["--saturation"] = 100;
  (inline as Record<string, unknown>)["--lightness"] = 68;
  (inline as Record<string, unknown>)["--bg-spot-opacity"] = panelVariant ? 0.14 : 0.12;
  (inline as Record<string, unknown>)["--border-spot-opacity"] = 0.85;
  (inline as Record<string, unknown>)["--border-light-opacity"] = 0.35;
  (inline as Record<string, unknown>)["--border-size"] = "calc(var(--border, 2) * 1px)";
  (inline as Record<string, unknown>)["--spotlight-size"] = "calc(var(--size, 200) * 1px)";

  if (width !== undefined) {
    inline.width = typeof width === "number" ? `${width}px` : width;
  } else if (!customSize) {
    inline.width = sz.w;
  }
  if (height !== undefined) {
    inline.height = typeof height === "number" ? `${height}px` : height;
  } else if (!customSize) {
    inline.height = sz.h;
  }
  if (!customSize && width === undefined && height === undefined) {
    inline.aspectRatio = "3 / 4";
  }

  return (
    <div
      ref={cardRef}
      data-glow
      className={`glow-card${panelVariant ? " glow-card--panel" : ""} ${className}`.trim()}
      style={inline}
    >
      <div data-glow aria-hidden className="glow-card-inner-glow" />
      {children}
    </div>
  );
}
