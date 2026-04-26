import React from "react";
import { deleteNotification, readAllNotifications, readNotification } from "../api";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";

type NotifRow = {
  id: string | number;
  title?: string;
  body?: string;
  link?: string;
  is_read?: boolean;
  type?: string;
  created_at?: string;
};

export function NotificationsCenterModal({
  open,
  onClose,
  isMobile,
  zIndex = 220,
  notifs,
  setNotifs,
  notifUnread,
  setNotifUnread,
  notifLoading,
  lang: _lang,
  t,
  loadNotifications,
  showItemMeta = true,
  deleteGlyph = "🗑",
  onFollowLink,
}: {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  zIndex?: number;
  notifs: NotifRow[];
  setNotifs: React.Dispatch<React.SetStateAction<NotifRow[]>>;
  notifUnread: number;
  setNotifUnread: React.Dispatch<React.SetStateAction<number>>;
  notifLoading: boolean;
  lang: string;
  t: (k: string, fb?: string) => string;
  loadNotifications: () => void | Promise<void>;
  showItemMeta?: boolean;
  deleteGlyph?: string;
  onFollowLink?: (n: NotifRow) => void | Promise<void>;
}) {
  if (!open) return null;

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString(_lang === "en" ? "en-US" : "ru", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const markRead = async (n: NotifRow) => {
    if (n.is_read) return;
    await readNotification(String(n.id));
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setNotifUnread((u) => Math.max(0, u - 1));
  };

  const remove = async (n: NotifRow) => {
    await deleteNotification(String(n.id));
    if (!n.is_read) setNotifUnread((u) => Math.max(0, u - 1));
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
  };

  const markAll = async () => {
    await readAllNotifications();
    setNotifs((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setNotifUnread(0);
    loadNotifications();
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-bg,rgba(0,0,0,.65))",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex,
        padding: isMobile ? 0 : 16,
        backdropFilter: "blur(14px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-panel"
        style={{
          width: isMobile ? "100%" : "min(96vw,440px)",
          maxHeight: isMobile ? "82vh" : "min(88vh,620px)",
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          display: "flex",
        flexDirection: "column",
        overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--glass-panel-bg,var(--bg2))",
          boxShadow: "var(--glass-shadow,0 24px 64px rgba(0,0,0,.45))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SheetSwipeHandle enabled={isMobile} onClose={onClose} />
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", flex: 1 }}>{t("notifications_title", "Уведомления")}</div>
            {notifUnread > 0 && (
              <button
                type="button"
                className="btn-interactive"
                onClick={markAll}
                style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--accent-2)", cursor: "pointer" }}
              >
                {t("notif_read_all", "Прочитать все")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text4)", cursor: "pointer", fontSize: 18 }}
              aria-label={t("close", "Закрыть")}
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 18px" }}>
          {notifLoading && notifs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text5)" }}>{t("loading_short", "Загрузка…")}</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text5)" }}>{t("notif_empty", "Пока нет уведомлений")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notifs.map((n) => (
                <div
                  key={String(n.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: n.is_read ? "var(--surface)" : "color-mix(in srgb,var(--accent-soft) 35%,var(--surface))",
                    opacity: n.is_read ? 0.92 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{n.title || "—"}</div>
                      {n.body && <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{n.body}</div>}
                      {showItemMeta && (n.type || n.created_at) && (
                        <div style={{ fontSize: 11, color: "var(--text5)", marginTop: 8 }}>
                          {n.type && <span>{n.type}</span>}
                          {n.type && n.created_at ? " · " : null}
                          {fmtTime(n.created_at)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      title={t("delete", "Удалить")}
                      onClick={() => remove(n)}
                      style={{ border: "none", background: "transparent", color: "var(--text5)", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}
                    >
                      {deleteGlyph}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {n.link && (
                      <button
                        type="button"
                        className="btn-interactive"
                        onClick={async () => {
                          await markRead(n);
                          if (onFollowLink) await onFollowLink(n);
                          else window.location.href = n.link!;
                        }}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--gradient-accent)", color: "var(--accent-on-bg)", cursor: "pointer", fontSize: 12, fontWeight: 800 }}
                      >
                        {t("notif_open_link", "Открыть")}
                      </button>
                    )}
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(n)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >
                        {t("notif_mark_read", "Прочитано")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiHubModal({
  open,
  onClose,
  isMobile,
  t,
  hint,
  children,
}: {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  t: (k: string, fb?: string) => string;
  hint: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-strong,rgba(0,0,0,.78))",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        zIndex: 240,
        padding: isMobile ? 0 : 12,
        backdropFilter: "blur(16px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-panel"
        style={{
          width: isMobile ? "100%" : "min(96vw,920px)",
          height: isMobile ? "100%" : "min(92vh,720px)",
          maxHeight: isMobile ? "100%" : undefined,
          borderRadius: isMobile ? 0 : 20,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: isMobile ? "none" : "1px solid var(--border)",
          background: "var(--glass-panel-bg,var(--bg2))",
          boxShadow: "var(--glass-shadow,0 24px 64px rgba(0,0,0,.5))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SheetSwipeHandle enabled={isMobile} onClose={onClose} />
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 18, flexShrink: 0 }} aria-hidden>
            ✦
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>{t("ai_hub_title", "✦ AI (единый чат)")}</div>
            <div style={{ fontSize: 12, color: "var(--text5)", marginTop: 4, lineHeight: 1.45 }}>{hint}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)", cursor: "pointer", fontSize: 20, flexShrink: 0 }}
            aria-label={t("close", "Закрыть")}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
      </div>
    </div>
  );
}
