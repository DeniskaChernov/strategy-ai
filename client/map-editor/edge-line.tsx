import React from "react";
import { useLang } from "../lang-context";
import { getETYPE } from "../lib/strategy-labels";
import { edgePt } from "../lib/map-utils";

export function EdgeLine({
  edge,
  nodes,
  selected,
  onClick,
  etypeMap,
}: {
  edge: any;
  nodes: any[];
  selected: boolean;
  onClick: (edge: any) => void;
  etypeMap?: Record<string, { c: string; d: string; label: string }>;
}) {
  const { t } = useLang();
  const ETYPE = etypeMap || getETYPE(t);
  const s = nodes.find((n) => n.id === edge.source);
  const tNode = nodes.find((n) => n.id === edge.target);
  if (!s || !tNode) return null;
  const sx = s.x + 120,
    sy = s.y + 64,
    tx2 = tNode.x + 120,
    ty2 = tNode.y + 64;
  const sp = edgePt(sx, sy, tx2, ty2);
  const ep = edgePt(tx2, ty2, sx, sy);
  const mx = (sp.x + ep.x) / 2,
    my = (sp.y + ep.y) / 2;
  const dx = ep.x - sp.x,
    dy = ep.y - sp.y,
    len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len,
    ny = dx / len,
    bend = Math.min(60, len * 0.18);
  const cpx = mx + nx * bend,
    cpy = my + ny * bend;
  const et = ETYPE[edge.type] || ETYPE.requires;
  const d = `M${sp.x},${sp.y} Q${cpx},${cpy} ${ep.x},${ep.y}`;
  const mid_t = 0.5;
  const bmx = Math.pow(1 - mid_t, 2) * sp.x + 2 * (1 - mid_t) * mid_t * cpx + mid_t * mid_t * ep.x;
  const bmy = Math.pow(1 - mid_t, 2) * sp.y + 2 * (1 - mid_t) * mid_t * cpy + mid_t * mid_t * ep.y;
  const tang_t = 0.5;
  const tax = 2 * (1 - tang_t) * (cpx - sp.x) + 2 * tang_t * (ep.x - cpx);
  const tay = 2 * (1 - tang_t) * (cpy - sp.y) + 2 * tang_t * (ep.y - cpy);
  const ang = (Math.atan2(tay, tax) * 180) / Math.PI;
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick(edge);
      }}
      role="button"
      tabIndex={0}
      aria-label={edge.label || et.label || t("edge", "связь")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(edge);
        }
      }}
    >
      <path className="sa-edge-hit" d={d} fill="none" stroke="transparent" strokeWidth={14} />
      <path
        className="sa-edge-line"
        d={d}
        fill="none"
        stroke={selected ? "url(#sa-edge-grad)" : et.c}
        strokeWidth={selected ? 2.6 : Math.max(1.2, Math.min(3.6, (edge.weight || 3) * 0.6 + 0.4))}
        strokeDasharray={et.d === "none" ? "none" : et.d}
        opacity={selected ? 1 : 0.68}
      />
      <polygon
        points="-5,-3 5,0 -5,3"
        fill={selected ? "var(--accent-1)" : et.c}
        transform={`translate(${ep.x},${ep.y}) rotate(${ang})`}
        opacity={selected ? 1 : 0.75}
        style={{ transition: "opacity .2s ease" }}
      />
      {edge.label ? (
        <text x={bmx} y={bmy - 6} textAnchor="middle" fontSize={9.5} fill="var(--text3)" style={{ pointerEvents: "none", userSelect: "none" }}>
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}
