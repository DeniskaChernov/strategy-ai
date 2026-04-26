import React from "react";

export function Toggle({
  val,
  onChange,
  label,
  desc,
}: {
  val: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!val)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--text5)", marginTop: 4, lineHeight: 1.45 }}>{desc}</div>}
      </div>
      <div
        role="switch"
        aria-checked={val}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          background: val ? "var(--gradient-accent)" : "var(--surface2)",
          border: "1px solid var(--border)",
          position: "relative",
          flexShrink: 0,
          transition: "background .2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: val ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
            transition: "left .2s",
          }}
        />
      </div>
    </button>
  );
}
