import * as React from "react";

/**
 * Делегированный ripple-эффект: вешаем один pointerdown-слушатель
 * на переданный root-элемент (обычно — на контейнер лендинга),
 * и при клике по .btn-p / .btn-g создаём короткоживущий span-«ripple».
 *
 * Плюсы: никаких правок в разметке кнопок, ripple появляется везде,
 * где есть эти классы (включая вложенные компоненты).
 *
 * Уважает prefers-reduced-motion.
 */
export function useRipple<T extends HTMLElement>(
  rootRef: { readonly current: T | null },
) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest<HTMLElement>(".btn-p, .btn-g, .sa-ripple");
      if (!btn) return;
      if (btn.hasAttribute("disabled")) return;
      // Гарантируем позиционный контекст и clip
      const cs = window.getComputedStyle(btn);
      if (cs.position === "static") btn.style.position = "relative";
      if (cs.overflow !== "hidden") btn.style.overflow = "hidden";

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const r = document.createElement("span");
      r.className = "sa-ripple-dot";
      r.style.width = r.style.height = `${size}px`;
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      btn.appendChild(r);
      const cleanup = () => {
        r.remove();
      };
      r.addEventListener("animationend", cleanup, { once: true });
      // Safety timeout
      window.setTimeout(cleanup, 900);
    };

    root.addEventListener("pointerdown", onDown);
    return () => {
      root.removeEventListener("pointerdown", onDown);
    };
  }, [rootRef]);
}
