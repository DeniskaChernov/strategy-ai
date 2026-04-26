import React from "react";

export function FeatureValue({ val }: { val: string | boolean }) {
  if (val === false) return <span style={{ color: "var(--text6)", fontSize: 13 }}>—</span>;
  if (val === true) return <span style={{ color: "#12c482", fontWeight: 700, fontSize: 14 }}>✓</span>;
  return (
    <span style={{ color: "var(--text2)", fontSize: 13, fontWeight: 500 }}>
      {val}
    </span>
  );
}
