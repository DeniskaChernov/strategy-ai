import React, { useState } from "react";
import { getSTATUS } from "../lib/strategy-labels";
import { useLang } from "../lang-context";

export function GanttView({
  nodes,
  onClose,
  statusMap,
  onRowClick,
}: {
  nodes: any[];
  onClose: () => void;
  statusMap?: Record<string, { c: string; label?: string }>;
  onRowClick?: (n: any) => void;
}) {
  const { t, lang } = useLang();
  const STATUS = statusMap || getSTATUS(t);
  const [exiting, setExiting] = useState(false);
  const handleClose = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onClose(), 280);
  };

  const withDates = nodes.filter((n: any) => n.deadline);
  const now = new Date();

  if (withDates.length === 0) {
    return (
      <div
        className={exiting ? "panel-slide-down-out" : ""}
        style={{
          position: "absolute",
          bottom: 70,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--bg2)",
          border: ".5px solid var(--b1)",
          borderRadius: 16,
          padding: "18px 24px",
          zIndex: 30,
          boxShadow: "0 20px 60px rgba(0,0,0,.4)",
          textAlign: "center",
          minWidth: 280,
          animation: exiting ? "none" : "fadeInUp .3s ease",
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>📅</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text3)" }}>{t("no_deadlines", "Нет дедлайнов")}</div>
        <div style={{ fontSize: 13.5, color: "var(--text5)", marginBottom: 12 }}>{t("gantt_hint", "Добавьте дедлайны к шагам в редакторе")}</div>
        <button onClick={handleClose} className="btn-interactive" style={{ padding: "8px 18px", borderRadius: 12, border: ".5px solid var(--b1)", background: "var(--surface)", color: "var(--text3)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {t("close", "Закрыть")}
        </button>
      </div>
    );
  }

  const sorted = [...withDates].sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const minDate = new Date(sorted[0].deadline);
  const maxDate = new Date(sorted[sorted.length - 1].deadline);
  const range = Math.max(1, (maxDate.getTime() - minDate.getTime()) / 864e5);
  const todayPct = (() => {
    const d = (now.getTime() - minDate.getTime()) / 864e5;
    if (d < 0 || d > range) return null;
    return (d / range) * 100;
  })();
  const fmtDate = (d: Date) => d.toLocaleDateString(lang === "en" ? "en-US" : lang === "uz" ? "uz-UZ" : "ru", { day: "2-digit", month: "short" });

  return (
    <div
      className={exiting ? "gantt-panel-out" : ""}
      role="dialog"
      aria-label={t("gantt", "Gantt")}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 240,
        background: "var(--bg2)",
        borderTop: ".5px solid var(--b1)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        animation: exiting ? "none" : "slideUp .28s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: ".5px solid var(--b1)", flexShrink: 0, position: "sticky", top: 0, background: "var(--bg2)", zIndex: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t("gantt", "📅 Gantt")}</span>
        <span style={{ fontSize: 13, color: "var(--text5)", flex: 1 }}>
          {t("steps_with_deadlines", "{n} шагов с дедлайнами").replace("{n}", String(sorted.length))} · {fmtDate(minDate)} → {fmtDate(maxDate)}
        </span>
        <button className="modal-close" onClick={handleClose} aria-label={t("close", "Закрыть")}>
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", position: "relative" }}>
        {sorted.map((n: any) => {
          const st = STATUS[n.status] || STATUS.planning;
          const dl = new Date(n.deadline);
          const daysFromStart = Math.max(0, (dl.getTime() - minDate.getTime()) / 864e5);
          const pct = Math.min(100, (daysFromStart / range) * 100);
          const isPast = dl < now;
          const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / 864e5);
          const clickable = Boolean(onRowClick);
          return (
            <div
              key={n.id}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : -1}
              onClick={() => clickable && onRowClick?.(n)}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick?.(n);
                }
              }}
              className="sa-gantt-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 8px",
                borderRadius: 8,
                marginBottom: 4,
                cursor: clickable ? "pointer" : "default",
                transition: "background .18s ease",
                position: "relative",
                minWidth: 340,
              }}
            >
              <div style={{ width: 130, fontSize: 13, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 600 }} title={n.title}>
                {n.title}
              </div>
              <div style={{ flex: 1, height: 22, background: "var(--surface)", borderRadius: 6, position: "relative", overflow: "hidden", border: ".5px solid var(--b1)" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(2, n.progress || 0)}%`, background: st.c + "55", borderRadius: 6, transition: "width .35s ease" }} />
                <div
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: isPast ? "#f04458" : st.c,
                    boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                  }}
                />
              </div>
              <div style={{ width: 90, fontSize: 13, color: isPast ? "#f04458" : daysLeft <= 7 ? "#f09428" : "var(--text4)", textAlign: "right", flexShrink: 0, fontWeight: isPast || daysLeft <= 7 ? 700 : 500 }}>
                {isPast
                  ? t("days_overdue", "просрочено {n}д.").replace("{n}", String(-daysLeft))
                  : daysLeft === 0
                    ? t("today", "Сегодня")
                    : daysLeft === 1
                      ? t("tomorrow_label", "завтра")
                      : t("days_left", "{n}д.").replace("{n}", String(daysLeft))}
              </div>
            </div>
          );
        })}
        {todayPct != null && (
          <div
            className="sa-gantt-today"
            aria-hidden
            style={{
              position: "absolute",
              top: 8,
              bottom: 8,
              left: `calc(14px + 130px + 10px + ${todayPct}% * (100% - 14px - 130px - 10px - 90px - 10px - 14px) / 100)`,
              width: 2,
              background: "linear-gradient(180deg,var(--accent-1),var(--accent-2))",
              borderRadius: 1,
              pointerEvents: "none",
              boxShadow: "0 0 12px var(--accent-glow)",
            }}
          />
        )}
      </div>
    </div>
  );
}
