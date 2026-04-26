import React from "react";
import { StrategyShellBg } from "../../strategy-shell-sidebar";
import { useLang } from "../lang-context";

export function SavingScreen({ theme = "dark" }: { theme?: string }) {
  const { t } = useLang();
  return (
    <div
      className={"sa-strategy-ui " + (theme === "dark" ? "dk" : "lt")}
      data-theme={theme}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        height: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StrategyShellBg />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: "linear-gradient(135deg,var(--accent-1),var(--accent-2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            animation: "float 2s ease infinite",
            boxShadow: "0 8px 28px var(--accent-glow)",
          }}
        >
          ✦
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{t("saving_map", "Сохраняю карту")}</div>
      </div>
    </div>
  );
}
