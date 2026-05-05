import React from "react";
import { useLang } from "../lang-context";

export function DeadlineReminders({
  nodes,
  onGoToNode,
  onDismiss,
}: {
  nodes: any[];
  onGoToNode: (id: string) => void;
  onDismiss?: () => void;
}) {
  const { t } = useLang();
  const now = new Date();
  const soon = nodes.filter((n) => {
    if (!n.deadline || n.status === "completed") return false;
    const d = new Date(n.deadline);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });
  const overdue = nodes.filter((n) => {
    if (!n.deadline || n.status === "completed") return false;
    return new Date(n.deadline) < now;
  });
  const all = [...overdue, ...soon];
  if (all.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sa-deadline-rem"
      style={{
        position: "fixed",
        bottom: 80,
        right: 20,
        zIndex: 350,
        width: 280,
        background: "var(--surface)",
        border: `1px solid ${overdue.length ? "rgba(239,68,68,.4)" : "rgba(245,158,11,.35)"}`,
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,.3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: overdue.length ? "rgba(239,68,68,.08)" : "rgba(245,158,11,.08)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: overdue.length ? "#f04458" : "#f09428" }}>
          ⏰ {t("deadline_reminder", "Напоминания")}
          {all.length > 1 ? ` · ${all.length}` : ""}
        </span>
        <button
          type="button"
          onClick={() => onDismiss?.()}
          title={t("dismiss", "Скрыть")}
          aria-label={t("dismiss", "Скрыть")}
          className="sa-dr-close"
          style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2, borderRadius: 6 }}
        >
          ✕
        </button>
      </div>
      {all.slice(0, 4).map((n) => {
        const d = new Date(n.deadline);
        const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = d < now;
        return (
          <div
            key={n.id}
            onClick={() => onGoToNode(n.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onGoToNode(n.id);
              }
            }}
            className="sa-dr-row"
            aria-label={`${n.title} · ${
              isOverdue
                ? t("days_overdue", "просрочено {n}д.").replace("{n}", String(Math.abs(diff)))
                : t("days_left", "{n}д.").replace("{n}", String(diff))
            }`}
            style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background .15s", outline: "none" }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 11, color: isOverdue ? "#f04458" : "#f09428", fontWeight: 600 }}>
              {isOverdue
                ? t("days_overdue", "просрочено {n}д.").replace("{n}", String(Math.abs(diff)))
                : t("days_left", "{n}д.").replace("{n}", String(diff)) + " · " + n.deadline}
            </div>
          </div>
        );
      })}
    </div>
  );
}
