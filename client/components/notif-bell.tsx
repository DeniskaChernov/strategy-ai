import React from "react";

export function NotifBell({
  unread,
  onClick,
  className,
}: {
  unread: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={unread > 0 ? `Уведомления (${unread})` : "Уведомления"}
      aria-label={unread > 0 ? `Уведомления, непрочитано: ${unread}` : "Уведомления"}
      style={{
        position: "relative",
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
      }}
    >
      🔔
      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 8,
            background: "#f04458",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: "16px",
            textAlign: "center",
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
