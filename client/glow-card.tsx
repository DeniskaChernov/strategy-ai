import React, { useEffect, useRef, ReactNode, CSSProperties, HTMLAttributes } from "react";
import { subscribeGlowPointer } from "./lib/glow-pointer";

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
  ...rest
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { base, spread } = glowColorMap[glowColor];
  const sz = sizePx[size];

  useEffect(() => {
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

  const getInlineStyles = (): CSSProperties => {
    const radius = panelVariant ? 20 : 14;
    const borderToken = panelVariant ? 1 : 3;

    const baseStyles: CSSProperties = {
      "--base": base,
      "--spread": spread,
      "--radius": radius,
      "--border": borderToken,
      "--backdrop": "hsl(0 0% 60% / 0.12)",
      "--backup-border": panelVariant ? "var(--glass-border-accent, var(--border))" : "var(--backdrop)",
      "--size": 200,
      "--outer": 1,
      "--saturation": 100,
      "--lightness": panelVariant ? 68 : 70,
      "--bg-spot-opacity": panelVariant ? 0.14 : 0.1,
      "--border-spot-opacity": 1,
      "--border-light-opacity": 1,
      "--border-size": "calc(var(--border, 2) * 1px)",
      "--spotlight-size": "calc(var(--size, 200) * 1px)",
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)),
        transparent
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
      borderRadius: panelVariant ? "var(--r-xl, 20px)" : radius,
      boxShadow: panelVariant ? "0 28px 70px rgba(0,0,0,.42)" : "0 1rem 2rem -1rem #000",
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

  return (
    <div
      ref={cardRef}
      data-glow
      className={`glow-card${panelVariant ? " glow-card--panel" : ""} ${className}`.trim()}
      style={getInlineStyles()}
      {...rest}
    >
      <div data-glow aria-hidden className="glow-card-inner-glow" />
      {children}
    </div>
  );
}
