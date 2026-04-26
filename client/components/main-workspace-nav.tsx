import React from "react";

export function MainWorkspaceNav({
  mode,
  onStrategy,
  onContentPlan,
  t,
  isMobile,
}: {
  mode: "strategy" | "contentPlan";
  onStrategy: () => void;
  onContentPlan: () => void;
  t: (k: string, fb?: string) => string;
  isMobile: boolean;
}) {
  const pill = (active: boolean) =>
    ({
      padding: isMobile ? "8px 14px" : "8px 18px",
      borderRadius: 999,
      border: active ? "1px solid var(--accent-1)" : "1px solid var(--border)",
      background: active ? "var(--accent-soft)" : "var(--surface)",
      color: active ? "var(--accent-2)" : "var(--text4)",
      fontSize: isMobile ? 12 : 12.5,
      fontWeight: 800,
      cursor: "pointer",
      transition: "all .2s",
      whiteSpace: "nowrap",
    }) as React.CSSProperties;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, flexWrap: "wrap", justifyContent: "center" }}>
      <button type="button" className="btn-interactive" onClick={onStrategy} style={pill(mode === "strategy")}>
        {t("nav_strategy", "Стратегия")}
      </button>
      <button type="button" className="btn-interactive" onClick={onContentPlan} style={pill(mode === "contentPlan")}>
        {t("nav_content_plan", "Контент-план")}
      </button>
    </div>
  );
}
