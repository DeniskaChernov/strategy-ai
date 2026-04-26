import React from "react";
import { useLang } from "../lang-context";

export type PillItem = { id: string; labelKey: string; fb?: string };

export function PillGroup({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: PillItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label={ariaLabel}>
      {items.map((x) => {
        const on = value === x.id;
        return (
          <button
            key={x.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(x.id)}
            className="sa-pill"
            data-on={on ? "1" : "0"}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${on ? "var(--accent-1)" : "var(--border)"}`,
              background: on ? "var(--accent-soft)" : "var(--surface)",
              color: on ? "var(--accent-1)" : "var(--text3)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: on ? 700 : 600,
              transition: "all .18s cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            {t(x.labelKey, x.fb || x.id)}
          </button>
        );
      })}
    </div>
  );
}
