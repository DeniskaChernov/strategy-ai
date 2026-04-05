/** Один document listener на все GlowCard — без N× pointermove.
 *  Всегда clientX/clientY в координатах вьюпорта; локальные для элемента — только через
 *  getBoundingClientRect + hit-test в колбэке (не вешать pointermove на сам узел — событие может не дойти). */
type Pos = { x: number; y: number };
const subs = new Set<(p: Pos) => void>();
let listening = false;
let raf = 0;
let pending: Pos | null = null;

function flush() {
  raf = 0;
  if (!pending || subs.size === 0) {
    pending = null;
    return;
  }
  const p = pending;
  pending = null;
  subs.forEach((fn) => fn(p));
}

function onMove(e: PointerEvent) {
  pending = { x: e.clientX, y: e.clientY };
  if (raf) return;
  raf = requestAnimationFrame(flush);
}

export function subscribeGlowPointer(fn: (p: Pos) => void): () => void {
  if (!listening) {
    listening = true;
    document.addEventListener("pointermove", onMove, { passive: true });
  }
  subs.add(fn);
  return () => {
    subs.delete(fn);
    if (subs.size === 0) {
      document.removeEventListener("pointermove", onMove);
      listening = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      pending = null;
    }
  };
}
