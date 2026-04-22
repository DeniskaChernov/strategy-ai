import * as React from "react";

type Options = {
  /** Максимальное смещение в пикселях. */
  strength?: number;
  /** Радиус срабатывания в px от границы элемента. */
  radius?: number;
  /** Коэффициент lerp для сглаживания (0..1). */
  ease?: number;
  /** Отключить на touch. */
  disableOnTouch?: boolean;
};

/**
 * "Magnetic" эффект: элемент слегка притягивается к курсору,
 * когда он рядом. Вне радиуса — плавно возвращается в исходное положение.
 * Слушает window mousemove, считает дистанцию до центра элемента.
 *
 * Уважает prefers-reduced-motion и pointer:coarse.
 */
export function useMagnetic<T extends HTMLElement>(opts: Options = {}) {
  const { strength = 8, radius = 120, ease = 0.18, disableOnTouch = true } =
    opts;
  const ref = React.useRef<T | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse =
      disableOnTouch &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    let raf: number | null = null;
    let tx = 0,
      ty = 0;
    let cx = 0,
      cy = 0;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const ex = rect.left + rect.width / 2;
      const ey = rect.top + rect.height / 2;
      const dx = e.clientX - ex;
      const dy = e.clientY - ey;
      const dist = Math.hypot(dx, dy);
      const r = Math.max(rect.width, rect.height) / 2 + radius;
      if (dist < r) {
        const f = 1 - dist / r; // 0..1, тем больше чем ближе
        tx = (dx / r) * strength * f;
        ty = (dy / r) * strength * f;
      } else {
        tx = 0;
        ty = 0;
      }
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = null;
      cx += (tx - cx) * ease;
      cy += (ty - cy) * ease;
      el.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(tick);
      } else if (Math.abs(cx) < 0.1 && Math.abs(cy) < 0.1) {
        el.style.transform = "";
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf !== null) cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [strength, radius, ease, disableOnTouch]);

  return ref;
}
