import React, { useEffect } from "react";

type ToastType = "success" | "error" | "info";

function normalizeType(t: string | undefined): ToastType {
  if (t === "error" || t === "success" || t === "info") return t;
  return "info";
}

export function Toast({
  msg,
  type,
  onClose,
  durationMs = 4200,
}: {
  msg: string;
  type?: string;
  onClose: () => void;
  durationMs?: number;
}) {
  const k = normalizeType(type);
  useEffect(() => {
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [onClose, durationMs]);

  const err = k === "error";
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "14px 24px",
        borderRadius: 14,
        border: `1px solid ${err ? "rgba(239,68,68,.4)" : "rgba(16,185,129,.4)"}`,
        background: err ? "rgba(239,68,68,.15)" : "rgba(16,185,129,.15)",
        color: err ? "#f87171" : "#34d399",
        fontSize: 14,
        fontWeight: 700,
        boxShadow: "0 8px 32px rgba(0,0,0,.3)",
        animation: "slideUp .3s ease",
        backdropFilter: "blur(12px)",
        maxWidth: "min(92vw,480px)",
        textAlign: "center",
      }}
    >
      {err ? "⚠ " : "✓ "}
      {msg}
    </div>
  );
}
