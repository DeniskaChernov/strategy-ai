/** Один document listener на все GlowCard — без N× pointermove. */
type Pos = { x: number; y: number };
const subs = new Set<(p: Pos) => void>();
let attached = false;

function onMove(e: PointerEvent) {
  const p = { x: e.clientX, y: e.clientY };
  subs.forEach((fn) => fn(p));
}

export function subscribeGlowPointer(fn: (p: Pos) => void): () => void {
  if (!attached) {
    attached = true;
    document.addEventListener("pointermove", onMove, { passive: true });
  }
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
