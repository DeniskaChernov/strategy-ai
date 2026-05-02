import React from "react";

export function IconButton({
  children,
  onClick,
  title,
  "aria-label": ariaLabel,
  size = 38,
  danger = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  "aria-label"?: string;
  size?: number;
  danger?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
      className="btn-interactive"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        border: danger ? "1px solid rgba(239,68,68,.35)" : "1px solid var(--border)",
        background: danger ? "rgba(239,68,68,.08)" : "var(--surface)",
        color: danger ? "var(--red)" : "var(--text2)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
        transition: "background .2s, border-color .2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
