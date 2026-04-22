import * as React from "react";

type Props = {
  /** Целевое число. Для "4.9" передайте 4.9; для "2400" — 2400. */
  to: number;
  /** Суффикс после числа: "+", "K+", "%", " ⭐", и т.п. */
  suffix?: string;
  /** Число знаков после запятой при форматировании (для дробных). */
  decimals?: number;
  /** Форматирует длинные числа: 18000 → "18K" (только когда suffix не указан сам). */
  compact?: boolean;
  /** Разделитель тысяч в исходном формате. По умолчанию запятая как в "2,400+". */
  thousandsSeparator?: string;
  /** Длительность анимации, мс. */
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Счётчик, анимирующий значение от 0 до `to` при первом попадании в viewport.
 * Уважает prefers-reduced-motion: сразу показывает конечное значение.
 */
export function StatCounter({
  to,
  suffix = "",
  decimals = 0,
  compact = false,
  thousandsSeparator = ",",
  durationMs = 1400,
  className,
  style,
}: Props) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = React.useState<number>(0);
  const [done, setDone] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(to);
      setDone(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setValue(to);
      setDone(true);
      return;
    }

    let raf = 0;
    let started = false;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || started) continue;
          started = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / durationMs);
            // easeOutQuart — совпадает с var(--ease-out-quart) из CSS.
            const eased = 1 - Math.pow(1 - p, 4);
            setValue(to * eased);
            if (p < 1) {
              raf = requestAnimationFrame(tick);
            } else {
              setDone(true);
            }
          };
          raf = requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [to, durationMs]);

  const displayed = formatNumber(done ? to : value, { decimals, compact, thousandsSeparator });
  return (
    <span ref={ref} className={className} style={style}>
      {displayed}
      {suffix}
    </span>
  );
}

function formatNumber(
  n: number,
  opts: { decimals: number; compact: boolean; thousandsSeparator: string },
): string {
  if (opts.compact && Math.abs(n) >= 1000) {
    const k = n / 1000;
    const s = k.toFixed(k >= 10 ? 0 : 1);
    return `${s}K`;
  }
  if (opts.decimals > 0) {
    return n.toFixed(opts.decimals);
  }
  const rounded = Math.round(n).toString();
  if (!opts.thousandsSeparator) return rounded;
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousandsSeparator);
}
