import * as React from "react";

type Options = {
  /** Максимальный угол наклона в градусах (по X и Y). По умолчанию 6°. */
  maxDeg?: number;
  /** Перспектива в px (больше = мягче наклон). По умолчанию 900. */
  perspective?: number;
  /** Масштаб при hover. По умолчанию 1 (без масштаба). */
  scale?: number;
  /** Отключить эффект на touch-устройствах. По умолчанию true. */
  disableOnTouch?: boolean;
};

/**
 * Лёгкий 3D-tilt на mousemove с rAF-троттлингом.
 * Возвращает ref для оборачиваемого элемента и обработчики onMouseMove/onMouseLeave.
 *
 * Уважает prefers-reduced-motion (полностью отключает эффект) и
 * coarse pointers (touch-устройства — по умолчанию отключено).
 *
 * Плавный сброс через CSS transition в стилях компонента.
 */
export function useTilt<T extends HTMLElement>(opts: Options = {}) {
  const { maxDeg = 6, perspective = 900, scale = 1, disableOnTouch = true } = opts;

  const ref = React.useRef<T | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const enabledRef = React.useRef<boolean>(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse =
      disableOnTouch &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    enabledRef.current = !reduced && !coarse;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [disableOnTouch]);

  const onMouseMove = React.useCallback<React.MouseEventHandler<T>>(
    (e) => {
      if (!enabledRef.current) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      // -1..1 относительно центра
      const nx = (px - 0.5) * 2;
      const ny = (py - 0.5) * 2;
      const ry = nx * maxDeg; // поворот вокруг Y — движение по X
      const rx = -ny * maxDeg; // поворот вокруг X — движение по Y (инверсия, чтобы карточка «наклонялась к курсору»)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        el.style.transform = `perspective(${perspective}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)${scale !== 1 ? ` scale(${scale})` : ""}`;
      });
    },
    [maxDeg, perspective, scale],
  );

  const onMouseLeave = React.useCallback<React.MouseEventHandler<T>>(() => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    el.style.transform = "";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
