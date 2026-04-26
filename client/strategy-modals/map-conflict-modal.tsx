import React, { useState } from "react";
import { useLang } from "../lang-context";

export function MapConflictModal({
  existingMaps,
  newNodeCount: _newNodeCount,
  tierLabel,
  tierMapsCount,
  onReplace,
  onUpgrade,
  theme = "dark",
}: {
  existingMaps: { id: string; name?: string; nodes?: unknown[] }[];
  newNodeCount?: number;
  tierLabel: string;
  tierMapsCount: number | null | undefined;
  onReplace: (mapId: string) => void | Promise<void>;
  onUpgrade: () => void;
  theme?: string;
}) {
  const { t } = useLang();
  const [replaceId, setReplaceId] = useState(existingMaps[0]?.id || null);
  const [loading, setLoading] = useState(false);

  async function doReplace() {
    if (!replaceId) return;
    setLoading(true);
    await onReplace(replaceId);
  }

  const mapsAllowed = tierMapsCount != null ? tierMapsCount : 1;

  return (
    <div
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-label={t("map_limit", "Лимит карт исчерпан")}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-bg,rgba(0,0,0,.7))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        backdropFilter: "blur(16px)",
        padding: 16,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "min(95vw,480px)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--glass-panel-bg,var(--bg2))",
          border: "1px solid rgba(239,68,68,.35)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--glass-shadow-accent,none),0 40px 80px rgba(0,0,0,.55)",
          animation: "scaleIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg,rgba(239,68,68,.18),rgba(104,54,245,.14))",
              border: "1px solid rgba(239,68,68,.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{t("map_limit", "Лимит карт исчерпан")}</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
              {t("tier_maps_allowed", "На тарифе {tier} разрешено карт: {n}").replace("{tier}", tierLabel).replace("{n}", String(mapsAllowed))}
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            {t("map_conflict_pick", "Выберите карту для замены")}
          </div>
          {existingMaps.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setReplaceId(m.id);
                }
              }}
              onClick={() => setReplaceId(m.id)}
              className="sa-mc-row"
              aria-pressed={replaceId === m.id}
              style={{
                padding: "11px 14px",
                borderRadius: 11,
                border: `2px solid ${replaceId === m.id ? "rgba(239,68,68,.5)" : "var(--border)"}`,
                background: replaceId === m.id ? "rgba(239,68,68,.06)" : "var(--surface)",
                cursor: "pointer",
                marginBottom: 8,
                transition: "all .2s ease",
                outline: "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{m.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--text5)" }}>
                {m.nodes?.length || 0} {t("steps_label", "шагов")}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={doReplace}
              disabled={!replaceId || loading}
              aria-label={t("replace_btn", "🗑 Заменить")}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: replaceId && !loading ? "linear-gradient(135deg,#dc2626,#f04458)" : "var(--surface2)",
                color: replaceId && !loading ? "#fff" : "var(--text4)",
                fontSize: 13,
                fontWeight: 800,
                cursor: replaceId && !loading ? "pointer" : "not-allowed",
                transition: "transform .18s ease",
              }}
            >
              {loading ? t("replacing", "Заменяю…") : t("replace_btn", "🗑 Заменить")}
            </button>
            <button type="button" className="btn-p" onClick={onUpgrade} style={{ flex: 1, padding: "13px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
              {t("upgrade_tier", "✦ Расширить тариф")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
