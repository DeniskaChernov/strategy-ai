import * as React from "react";

/**
 * Декоративные orbs позади hero с parallax-реакцией на курсор.
 * Работает через CSS-переменные --mx / --my (нормализованные -1..1),
 * которые использует .sa-hero-orb для своего translate.
 *
 * Уважает prefers-reduced-motion и pointer:coarse.
 */
export function HeroParallaxOrbs() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse =
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
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      // ограничим зоной hero; за пределами — плавно к центру
      tx = Math.max(-1, Math.min(1, (x - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, (y - 0.5) * 2));
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = null;
      // lerp для мягкости
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.setProperty("--mx", cx.toFixed(3));
      el.style.setProperty("--my", cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="sa-hero-orbs" aria-hidden>
      <span className="sa-hero-orb sa-hero-orb--a" />
      <span className="sa-hero-orb sa-hero-orb--b" />
      <span className="sa-hero-orb sa-hero-orb--c" />
    </div>
  );
}
