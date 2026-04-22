import React from "react";

export interface SplashLoaderVisualProps {
  /** Подпись под спиннером (например: «Загрузка…»). */
  text: string;
  /** Диаметр спиннера (ring) в px. По умолчанию 32. */
  size?: number;
}

/**
 * Минималистичный визуал: тонкий вращающийся ring + подпись под ним.
 * Соответствует стилистике первого splash из `public/index.html`.
 */
export function SplashLoaderVisual({ text, size = 32 }: SplashLoaderVisualProps) {
  const sz = Math.max(20, Math.min(64, size));
  return (
    <div
      className="sa-splash-loader-visual"
      style={{ "--sa-loader-size": `${sz}px` } as React.CSSProperties}
    >
      <div className="sa-splash-loader-ring" aria-hidden />
      <span className="sa-splash-loader-caption">{text}</span>
    </div>
  );
}

export interface SplashLoaderScreenProps extends SplashLoaderVisualProps {
  theme: "dark" | "light";
  /** Опционально: процент под спиннером. */
  progressPct?: number;
  /** Путь к логотипу. */
  logoSrc?: string;
  /** Подпись рядом с логотипом. */
  brandLabel?: string;
}

/**
 * Полноэкранный фон + бренд + спиннер по центру.
 * Совпадает по ритму с `#splash` из `public/index.html`, чтобы
 * переход между пред-React-сплэшем и Suspense-fallback был бесшовным.
 */
export function SplashLoaderScreen({
  text,
  size = 32,
  theme,
  progressPct,
  logoSrc = "/logo.png",
  brandLabel = "Strategy AI",
}: SplashLoaderScreenProps) {
  const dk = theme === "dark" ? "dk" : "lt";
  return (
    <div className={`sa-splash-loader-screen ${dk}`} role="status" aria-live="polite">
      <div className="sa-splash-loader-stack">
        <div className="sa-splash-loader-brand">
          <img
            src={logoSrc}
            alt=""
            className="sa-splash-loader-logo"
            width={56}
            height={56}
            decoding="async"
          />
          <span className="sa-splash-loader-brand-name">{brandLabel}</span>
        </div>
        <SplashLoaderVisual text={text} size={size} />
      </div>
      {typeof progressPct === "number" && (
        <div className="sa-splash-loader-progress">
          {progressPct < 100 ? `${progressPct}%` : "✓"}
        </div>
      )}
    </div>
  );
}
