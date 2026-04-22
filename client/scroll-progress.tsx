import * as React from "react";

type Props = {
  /**
   * Ссылка на скролл-контейнер. Если не указан — отслеживается window.
   * Принимает любой ref-like объект с .current: HTMLElement | null.
   */
  scrollRef?: { readonly current: HTMLElement | null };
};

/**
 * Тонкая градиентная полоса вверху страницы, отражающая прогресс скролла.
 * Обновляется на scroll/resize с rAF-троттлингом; не затрагивает layout
 * (использует transform: scaleX на GPU-слое).
 *
 * По умолчанию слушает window. Если проект скроллит внутри контейнера
 * (как React-лендинг в sa-ref-landing), передайте scrollRef.
 */
export function ScrollProgress({ scrollRef }: Props) {
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const bar = barRef.current;
    if (!bar) return;
    const target: HTMLElement | Window =
      (scrollRef && scrollRef.current) || window;

    let raf: number | null = null;

    const compute = () => {
      raf = null;
      let top = 0;
      let max = 0;
      if (target instanceof Window) {
        top = target.scrollY || document.documentElement.scrollTop || 0;
        max =
          (document.documentElement.scrollHeight || 0) -
          (window.innerHeight || 0);
      } else {
        top = target.scrollTop;
        max = target.scrollHeight - target.clientHeight;
      }
      const p = max > 0 ? Math.max(0, Math.min(1, top / max)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      bar.style.opacity = p > 0.002 ? "1" : "0";
    };

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(compute);
    };

    compute();
    if (target instanceof Window) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    } else {
      target.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (target instanceof Window) {
        window.removeEventListener("scroll", onScroll);
      } else {
        target.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollRef]);

  return (
    <div className="sa-scroll-progress" aria-hidden>
      <div ref={barRef} className="sa-scroll-progress__bar" />
    </div>
  );
}
