import React, { useState } from "react";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-bg,rgba(0,0,0,.65))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: 16,
        backdropFilter: "blur(10px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "min(96vw,420px)",
          borderRadius: 18,
          padding: "22px 24px",
          background: "var(--glass-panel-bg,var(--bg2))",
          border: "1px solid var(--border)",
          boxShadow: "var(--glass-shadow,0 24px 64px rgba(0,0,0,.45))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div id="confirm-dialog-title" style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.55, marginBottom: 22 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-interactive"
            onClick={onCancel}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {cancelLabel || "Отмена"}
          </button>
          <button
            type="button"
            className="btn-interactive"
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              background: danger ? "#f04458" : "var(--gradient-accent)",
              color: "#fff",
              cursor: busy ? "wait" : "pointer",
              fontSize: 13,
              fontWeight: 800,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
