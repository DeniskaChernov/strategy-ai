import React, { useState } from "react";
import { StrategyShellBg } from "../../strategy-shell-sidebar";
import { useLang } from "../lang-context";
import { useIsMobile } from "../hooks/use-is-mobile";
import { TIERS } from "../lib/tiers";
import type { TierKey } from "../lib/tiers";
import { TIER_MKT, TIER_ORDER, TIER_PRICES, TIER_PRICE_NUM, type TierOrderKey } from "../lib/tier-marketing-data";

export function TierSelectionScreen({
  isNew,
  currentUser,
  theme = "dark",
  palette = "indigo",
  onSelect,
  onBack,
}: {
  isNew: boolean;
  currentUser: { tier?: string } | null;
  theme?: string;
  palette?: string;
  onSelect: (tierId: string) => void | Promise<void>;
  onBack?: () => void;
}) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const curTier = (currentUser?.tier as TierKey) || "free";
  const [selected, setSelected] = useState<TierOrderKey>(() => {
    const idx = TIER_ORDER.indexOf(curTier as TierOrderKey);
    return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)] ?? "pro";
  });
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<TierOrderKey | null>(null);
  const curIdx = TIER_ORDER.indexOf(curTier as TierOrderKey);

  async function proceed() {
    setLoading(true);
    await onSelect(selected);
    setLoading(false);
  }

  const sel = TIERS[selected] || TIERS.pro;
  const selMkt = TIER_MKT[selected] || TIER_MKT.pro;

  return (
    <div
      className={"sa-strategy-ui " + (theme === "dark" ? "dk" : "lt")}
      data-theme={theme}
      data-palette={palette}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        position: "relative",
      }}
    >
      <StrategyShellBg />
      <div
        style={{
          position: "fixed",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle,${selMkt.glow}18 0%,transparent 65%)`,
          top: "-20%",
          right: "-15%",
          filter: "blur(100px)",
          pointerEvents: "none",
          transition: "background 1.4s ease",
          zIndex: 0,
        }}
      />
      <div className="sa-app-topbar" style={{ zIndex: 2 }}>
        <div className="land-logo" style={{ gap: 10 }}>
          <div className="land-gem" style={{ width: 34, height: 34, borderRadius: 11, fontSize: 13 }}>
            SA
          </div>
          <span className="land-brand">Strategy AI</span>
        </div>
        {!isNew && onBack && (
          <button type="button" className="btn-g" onClick={onBack}>
            {t("back_btn", "← Назад")}
          </button>
        )}
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1300, width: "100%", margin: "0 auto", padding: isMobile ? "0 16px 56px" : "0 24px 80px", flex: 1 }}>
        <div style={{ textAlign: "center", padding: isMobile ? "28px 0 24px" : "40px 0 44px" }}>
          <h1
            style={{
              fontSize: isMobile ? "clamp(26px,7vw,36px)" : 52,
              fontWeight: 900,
              color: "var(--text)",
              letterSpacing: -2,
              lineHeight: 1.05,
              marginBottom: 10,
              animation: "slideUp .4s .1s both",
            }}
          >
            {t("tier_hero_line_1", "Выберите")}
            <br />
            <span
              style={{
                background: `linear-gradient(135deg,${selMkt.glow},${selMkt.glow}99,var(--accent-1))`,
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradShift 4s ease infinite",
              }}
            >
              {t("tier_hero_line_2", "свой тариф")}
            </span>
          </h1>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(auto-fill,minmax(200px,1fr))",
            gap: 14,
            marginBottom: 36,
            alignItems: "stretch",
            maxWidth: isMobile ? 420 : "none",
            marginLeft: isMobile ? "auto" : "",
            marginRight: isMobile ? "auto" : "",
          }}
        >
          {TIER_ORDER.map((k, cardIdx) => {
            const v = TIERS[k];
            const m = TIER_MKT[k];
            const isSel = selected === k;
            const isCurr = k === curTier;
            const isLower = TIER_ORDER.indexOf(k) < curIdx && !isCurr;
            const isHov = hovered === k && !isSel;
            return (
              <div
                key={k}
                onClick={() => setSelected(k)}
                onMouseEnter={() => setHovered(k)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderRadius: 22,
                  border: `2px solid ${isSel ? v.color + "ee" : m.highlight && !isSel ? "rgba(245,158,11,.3)" : isHov ? v.color + "55" : "var(--border)"}`,
                  background: isSel ? `${v.color}12` : m.highlight ? `${v.color}06` : "var(--surface)",
                  cursor: "pointer",
                  transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
                  transform: isSel ? "translateY(-10px) scale(1.02)" : m.highlight && !isSel ? "translateY(-3px)" : isHov ? "translateY(-5px)" : "translateY(0)",
                  boxShadow: isSel ? `0 28px 70px ${v.color}35,0 0 0 1px ${v.color}22` : isHov ? `0 16px 44px ${v.color}20` : "none",
                  position: "relative",
                  opacity: isLower ? 0.45 : 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  animation: `slideUp .45s ${cardIdx * 0.07}s both`,
                }}
              >
                {(isCurr || m.badge) && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "4px 14px",
                      borderRadius: "0 0 12px 12px",
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      background: isCurr ? v.color : "linear-gradient(90deg,var(--accent-1),var(--accent-2))",
                      boxShadow: `0 4px 14px ${v.color}55`,
                    }}
                  >
                    {isCurr ? t("your_plan", "● Ваш тариф") : m.badge}
                  </div>
                )}
                <div style={{ padding: "28px 22px 20px", paddingTop: isCurr || m.badge ? "36px" : "28px" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: isSel ? `linear-gradient(135deg,${v.color}33,${v.color}18)` : `${v.color}12`,
                      border: `1.5px solid ${isSel ? v.color + "66" : v.color + "25"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      marginBottom: 16,
                    }}
                  >
                    {m.icon}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: isSel ? v.color : "var(--text)", letterSpacing: -0.5, marginBottom: 3 }}>{v.label}</div>
                  <div style={{ fontSize: 13, color: "var(--text4)", marginBottom: 18 }}>{m.headline}</div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: isSel ? `${v.color}15` : "var(--surface2)",
                      border: `1px solid ${isSel ? v.color + "30" : "var(--border)"}`,
                      marginBottom: 16,
                    }}
                  >
                    {k === "free" ? (
                      <div style={{ fontSize: 26, fontWeight: 900, color: isSel ? v.color : "var(--text)" }}>{t("free_plan", "Бесплатно")}</div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                        <span style={{ fontSize: 13, color: isSel ? v.color : "var(--text4)", fontWeight: 600 }}>$</span>
                        <span style={{ fontSize: 38, fontWeight: 900, color: isSel ? v.color : "var(--text)", letterSpacing: -1.5, lineHeight: 1 }}>{TIER_PRICE_NUM[k]}</span>
                        <span style={{ fontSize: 13, color: "var(--text5)", marginLeft: 4 }}>{t("per_month_short", "/мес")}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "0 22px 22px", marginTop: "auto" }}>
                  {isSel ? (
                    <div
                      style={{
                        padding: "13px",
                        borderRadius: 13,
                        textAlign: "center",
                        background: `linear-gradient(135deg,${v.color},${v.color}cc)`,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                        animation: "tierPop .4s cubic-bezier(.34,1.56,.64,1)",
                      }}
                    >
                      {t("selected", "✓ Выбрано")}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "11px",
                        borderRadius: 13,
                        textAlign: "center",
                        border: `1.5px solid ${v.color}40`,
                        background: `${v.color}0a`,
                        color: v.color,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {t("choose_btn", "Выбрать →")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <button
            onClick={proceed}
            disabled={loading}
            style={{
              padding: "18px 72px",
              fontSize: 17,
              fontWeight: 800,
              borderRadius: 18,
              border: "none",
              background: selected === "free" ? "rgba(148,163,184,.12)" : `linear-gradient(135deg,${selMkt.glow},${selMkt.glow}bb)`,
              color: selected === "free" ? "var(--text4)" : "#fff",
              cursor: loading ? "wait" : "pointer",
              boxShadow: selected !== "free" ? `0 16px 52px ${selMkt.glow}44` : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              letterSpacing: -0.3,
            }}
          >
            {loading && (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin .7s linear infinite",
                }}
              />
            )}
            {loading
              ? t("saving", "Сохраняю…")
              : selected === curTier
                ? t("tier_stay_on", "Остаться на {tier}").replace("{tier}", sel.label)
                : selected === "free"
                  ? t("tier_start_free", "Начать бесплатно →")
                  : t("tier_go_to", "Перейти на {tier} — {price} →").replace("{tier}", sel.label).replace("{price}", TIER_PRICES[selected] ?? "")}
          </button>
        </div>
      </div>
    </div>
  );
}
