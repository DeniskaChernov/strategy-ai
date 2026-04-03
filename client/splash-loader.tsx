import React from "react";

export interface SplashLoaderVisualProps {
  /** Текст по буквам (короткое слово смотрится лучше) */
  text: string;
  size?: number;
}

/** Подбираем размер шрифта, чтобы строка помещалась в диаметр круга (~78% ширины). */
function computeLetterFontPx(sz: number, letterCount: number): number {
  const n = Math.max(letterCount, 1);
  const cap = sz * 0.12;
  const approxCharW = 0.58;
  const fit = (sz * 0.78) / (n * approxCharW);
  return Math.min(cap, Math.max(9, fit));
}

function computeLetterSpacingEm(n: number): string {
  if (n > 16) return "0.015em";
  if (n > 10) return "0.03em";
  return "0.04em";
}

/**
 * Визуал лоадера (буквы + вращающееся кольцо). Стили: `.sa-splash-loader-*` в global.css
 */
export function SplashLoaderVisual({ text, size = 180 }: SplashLoaderVisualProps) {
  const letters = text.split("");
  const sz = Math.max(120, Math.min(280, size));
  const fontPx = computeLetterFontPx(sz, letters.length);
  const letterSpacing = computeLetterSpacingEm(letters.length);

  return (
    <div
      className="sa-splash-loader-visual"
      style={
        {
          width: sz,
          height: sz,
          "--sa-loader-size": `${sz}px`,
          "--sa-loader-font-px": `${fontPx}px`,
          letterSpacing,
        } as React.CSSProperties
      }
    >
      {letters.map((letter, index) => (
        <span
          key={index}
          className="sa-splash-loader-letter"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
      <div className="sa-splash-loader-ring" aria-hidden />
    </div>
  );
}

export interface SplashLoaderScreenProps extends SplashLoaderVisualProps {
  theme: "dark" | "light";
  /** Опционально: процент под кругом */
  progressPct?: number;
  /** Путь к логотипу */
  logoSrc?: string;
  /** Подпись под логотипом */
  brandLabel?: string;
}

/** Полноэкранный фон + бренд + лоадер по центру */
export function SplashLoaderScreen({
  text,
  size = 180,
  theme,
  progressPct,
  logoSrc = "/logo.png",
  brandLabel = "Strategy AI",
}: SplashLoaderScreenProps) {
  const dk = theme === "dark" ? "dk" : "lt";
  return (
    <div className={`sa-splash-loader-screen ${dk}`}>
      <div className="sa-splash-loader-stack">
        <div className="sa-splash-loader-brand">
          <img src={logoSrc} alt={brandLabel} className="sa-splash-loader-logo" width={56} height={56} decoding="async" />
          <span className="sa-splash-loader-brand-name">{brandLabel}</span>
        </div>
        <SplashLoaderVisual text={text} size={size} />
      </div>
      {typeof progressPct === "number" && (
        <div className="sa-splash-loader-progress" aria-live="polite">
          {progressPct < 100 ? `${progressPct}%` : "✓"}
        </div>
      )}
    </div>
  );
}
