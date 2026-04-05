/** Один document listener на все GlowCard — без N× pointermove.
 *  Всегда clientX/clientY в координатах вьюпорта; локальные для элемента — только через
 *  getBoundingClientRect + hit-test в колбэке (не вешать pointermove на сам узел — событие может не дойти). */
type Pos = { x: number; y: number };
const subs = new Set<(p: Pos) => void>();
let listening = false;
let raf = 0;
let pending: Pos | null = null;
/** Последняя известная позиция указателя (после flush) — для ResizeObserver и скролла. */
let lastEmitted: Pos | null = null;
let scrollRaf = 0;

function flush() {
  raf = 0;
  if (!pending || subs.size === 0) {
    pending = null;
    return;
  }
  const p = pending;
  pending = null;
  lastEmitted = p;
  subs.forEach((fn) => fn(p));
}

function flushScroll() {
  scrollRaf = 0;
  if (!lastEmitted || subs.size === 0) return;
  subs.forEach((fn) => fn(lastEmitted));
}

function onMove(e: PointerEvent) {
  pending = { x: e.clientX, y: e.clientY };
  if (raf) return;
  raf = requestAnimationFrame(flush);
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(flushScroll);
}

function attachGlobal() {
  document.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
}

function detachGlobal() {
  document.removeEventListener("pointermove", onMove);
  window.removeEventListener("scroll", onScroll, { capture: true } as AddEventListenerOptions);
}

export function getLastGlowPointer(): Pos | null {
  return lastEmitted;
}

export function subscribeGlowPointer(fn: (p: Pos) => void): () => void {
  if (!listening) {
    listening = true;
    attachGlobal();
  }
  subs.add(fn);
  return () => {
    subs.delete(fn);
    if (subs.size === 0) {
      detachGlobal();
      listening = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (scrollRaf) {
        cancelAnimationFrame(scrollRaf);
        scrollRaf = 0;
      }
      pending = null;
    }
  };
}
