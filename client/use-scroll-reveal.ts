import { useEffect } from "react";

/**
 * Делает scroll-reveal для всех элементов с классом `.sr` внутри переданного root.
 *
 * Что делает:
 * 1. При монтировании переводит `.sr` элементы из «уже с .in» (статичный JSX)
 *    в «невидимый старт» (`.sr-init` добавляется, `.in` снимается).
 * 2. IntersectionObserver с `rootMargin` чуть выше низа вьюпорта плавно
 *    добавляет `.in`, что активирует transition (см. global.css: --tr-reveal).
 * 3. На `prefers-reduced-motion:reduce` ничего не делает — элементы уже
 *    видимы в статическом JSX и просто остаются видимыми.
 *
 * Безопасно для SSR: весь код выполняется внутри useEffect на клиенте.
 */
export function useScrollReveal(
  rootRef: React.RefObject<HTMLElement | null>,
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof window === "undefined") return;

    // Honor reduced motion — элементы остаются полностью видимыми.
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (mq && mq.matches) return;

    // IntersectionObserver может отсутствовать в очень старых окружениях — fallback: сразу показать всё.
    if (typeof IntersectionObserver === "undefined") return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(".sr"));
    if (targets.length === 0) return;

    // Прячем элементы, которые ещё не во вьюпорте.
    // Уже видимые на момент запуска (hero) оставляем с `.in`, чтобы не мигали.
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      if (inViewport) {
        el.classList.add("sr-init", "in");
      } else {
        el.classList.remove("in");
        el.classList.add("sr-init");
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          io.unobserve(el);
        }
      },
      {
        // Срабатываем чуть раньше достижения низа вьюпорта — чтобы движение было
        // ощутимым, а не «у самой нижней кромки».
        root: root.scrollHeight > window.innerHeight ? root : null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.05,
      },
    );
    for (const el of targets) io.observe(el);

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
