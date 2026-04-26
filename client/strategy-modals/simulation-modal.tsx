import React, { useCallback, useEffect, useMemo, useState } from "react";

type StatusInfo = { label: string; c: string };

function topoOrderedNodes(nodes: any[], edges: any[]) {
  const ids = new Set(nodes.map((n) => n.id));
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) inDeg.set(n.id, 0);
  for (const e of edges) {
    if (!e || !ids.has(e.source) || !ids.has(e.target)) continue;
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }
  const q: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) q.push(id);
  const out: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    out.push(u);
    for (const v of adj.get(u) || []) {
      const nv = (inDeg.get(v) || 0) - 1;
      inDeg.set(v, nv);
      if (nv === 0) q.push(v);
    }
  }
  if (out.length < nodes.length) {
    const seen = new Set(out);
    for (const n of nodes) if (!seen.has(n.id)) out.push(n.id);
  }
  return out.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as any[];
}

export function SimulationModal({
  mapData,
  allProjectMaps,
  onClose,
  theme: _theme,
  statusMap,
}: {
  mapData: any;
  allProjectMaps: any[];
  onClose: () => void;
  theme: string;
  statusMap: Record<string, StatusInfo>;
}) {
  const nodes = mapData?.nodes || [];
  const edges = mapData?.edges || [];
  const ordered = useMemo(() => topoOrderedNodes(nodes, edges), [nodes, edges]);
  const [tab, setTab] = useState<"overview" | "order">("overview");
  const [playIdx, setPlayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const avgProgress = useMemo(() => {
    if (!nodes.length) return 0;
    const s = nodes.reduce((a: number, n: any) => a + (Number(n.progress) || 0), 0);
    return Math.round(s / nodes.length);
  }, [nodes]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) {
      const k = n.status || "planning";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [nodes]);

  const tick = useCallback(() => {
    setPlayIdx((i) => (ordered.length ? (i + 1) % ordered.length : 0));
  }, [ordered.length]);

  useEffect(() => {
    if (!playing || !ordered.length) return;
    const id = window.setInterval(tick, 900);
    return () => window.clearInterval(id);
  }, [playing, ordered.length, tick]);

  const mapName = mapData?.name || "Карта";
  const otherMaps = (allProjectMaps || []).filter((m) => m && m.id !== mapData?.id);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-bg,rgba(0,0,0,.72))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 210,
        padding: 16,
        backdropFilter: "blur(14px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-panel"
        style={{
          width: "min(96vw,720px)",
          maxHeight: "min(90vh,640px)",
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--glass-panel-bg,var(--bg2))",
          boxShadow: "var(--glass-shadow,0 24px 64px rgba(0,0,0,.5))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            ⎇
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>Симуляция выполнения</div>
            <div style={{ fontSize: 13, color: "var(--text4)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mapName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 20, color: "var(--text3)" }} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {(
            [
              ["overview", "Обзор"],
              ["order", "Порядок"],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: tab === k ? "1px solid var(--accent-1)" : "1px solid var(--border)",
                background: tab === k ? "var(--accent-soft)" : "transparent",
                color: tab === k ? "var(--accent-2)" : "var(--text4)",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 22px 22px" }}>
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text5)", textTransform: "uppercase" }}>Шагов</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 4 }}>{nodes.length}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text5)", textTransform: "uppercase" }}>Связей</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 4 }}>{edges.length}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text5)", textTransform: "uppercase" }}>Средний прогресс</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent-2)", marginTop: 4 }}>{avgProgress}%</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text4)", marginBottom: 8 }}>По статусам</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from(byStatus.entries()).map(([k, n]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusMap[k]?.c || "var(--text5)", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--text2)" }}>{statusMap[k]?.label || k}</span>
                      <span style={{ fontWeight: 800, color: "var(--text)" }}>{n}</span>
                    </div>
                  ))}
                  {byStatus.size === 0 && <div style={{ color: "var(--text5)", fontSize: 13 }}>Нет шагов</div>}
                </div>
              </div>

              {otherMaps.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text4)", marginBottom: 8 }}>Другие карты проекта</div>
                  <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>
                    {otherMaps.slice(0, 8).map((m: any) => (
                      <div key={m.id || m.name}>
                        · {m.name || "Карта"} — {(m.nodes || []).length} шаг.
                      </div>
                    ))}
                    {otherMaps.length > 8 && <div style={{ color: "var(--text5)" }}>… и ещё {otherMaps.length - 8}</div>}
                  </div>
                </div>
              )}

              <div style={{ padding: 14, borderRadius: 14, border: "1px dashed var(--border2)", background: "color-mix(in srgb,var(--accent-soft) 40%,transparent)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Пошаговый прогон</div>
                <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5, marginBottom: 12 }}>
                  Условный порядок с учётом зависимостей. Циклы допускаются: оставшиеся шаги добавляются в конец.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-interactive"
                    onClick={() => setPlaying((p) => !p)}
                    disabled={!ordered.length}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--gradient-accent)", color: "var(--accent-on-bg)", fontWeight: 800, cursor: ordered.length ? "pointer" : "not-allowed", opacity: ordered.length ? 1 : 0.5 }}
                  >
                    {playing ? "Пауза" : "Играть"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setPlayIdx(0);
                    }}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)", fontWeight: 700, cursor: "pointer" }}
                  >
                    Сброс
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "order" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!ordered.length && <div style={{ color: "var(--text5)" }}>Нет шагов для отображения.</div>}
              {ordered.map((n, idx) => {
                const active = playing && idx === playIdx;
                const st = statusMap[n.status || "planning"];
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: active ? "1px solid var(--accent-1)" : "1px solid var(--border)",
                      background: active ? "var(--accent-soft)" : "var(--surface)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text5)", width: 28, flexShrink: 0 }}>{idx + 1}.</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title || "Без названия"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: st?.c || "var(--text5)" }} />
                        <span style={{ fontSize: 12, color: "var(--text4)" }}>{st?.label || n.status}</span>
                        <span style={{ fontSize: 12, color: "var(--text5)" }}>· {Number(n.progress) || 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
