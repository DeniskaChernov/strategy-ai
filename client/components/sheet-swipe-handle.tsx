import React, { useRef } from "react";

export function SheetSwipeHandle({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const y0 = useRef<number | null>(null);
  if (!enabled) return null;
  return (
    <div
      role="presentation"
      aria-hidden
      onTouchStart={(e) => {
        y0.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (y0.current == null) return;
        const dy = e.changedTouches[0].clientY - y0.current;
        y0.current = null;
        if (dy > 72) onClose();
      }}
      style={{
        height: 22,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        touchAction: "pan-y",
      }}
    >
      <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--border)", opacity: 0.85 }} />
    </div>
  );
}
