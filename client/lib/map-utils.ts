// Чистые утилиты для карты стратегии: топологическая сортировка,
// поиск точки на границе карточки узла, симуляция исхода для одного узла,
// нормализация формата карты и дефолтный набор узлов.
//
// Никаких импортов из React/сети — только математика и типы данных.

import { NW, NH } from "./util";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(s: unknown): boolean {
  return typeof s === "string" && UUID_RE.test(s);
}

export function normalizeMap(m: any): any {
  if (!m) return m;
  return { ...m, isScenario: m.isScenario ?? m.is_scenario ?? false };
}

export function edgePt(cx: number, cy: number, tx: number, ty: number): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const hw = NW / 2 + 8;
  const hh = NH / 2 + 8;
  const t = Math.abs(dy) * hw < Math.abs(dx) * hh ? hw / Math.abs(dx) : hh / Math.abs(dy);
  return { x: cx + dx * t, y: cy + dy * t };
}

export function defaultNodes(): any[] {
  return [
    { id: "n1", x: 200, y: 270, title: "Анализ рынка", reason: "Понять ЦА", action: "Провести 15 интервью с целевой аудиторией", metric: "100 интервью", status: "completed", priority: "high", progress: 100 },
    { id: "n2", x: 480, y: 155, title: "MVP продукт", reason: "Проверить гипотезу", action: "Запустить бета-версию и собрать платящих пользователей", metric: "50 платящих", status: "active", priority: "critical", progress: 60 },
    { id: "n3", x: 480, y: 395, title: "Маркетинг", reason: "Первые клиенты", action: "Настроить каналы и запустить первую кампанию", metric: "CAC < $100", status: "active", priority: "high", progress: 25 },
    { id: "n4", x: 760, y: 270, title: "Рост", reason: "Масштаб", action: "Масштабировать успешные каналы до целевого MRR", metric: "$50k MRR", status: "planning", priority: "critical", progress: 0 },
  ];
}

export function topSort(nodes: any[], edges: any[]): any[] {
  const ind: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  const adj: Record<string, string[]> = Object.fromEntries(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    const from = e.from || e.source;
    const to = e.to || e.target;
    if (adj[from] !== undefined && ind[to] !== undefined) {
      adj[from].push(to);
      ind[to]++;
    }
  });
  const q: string[] = nodes.filter((n) => ind[n.id] === 0).map((n) => n.id);
  const out: any[] = [];
  while (q.length) {
    const id = q.shift() as string;
    const n = nodes.find((x) => x.id === id);
    if (n) out.push(n);
    (adj[id] || []).forEach((nid) => {
      if (--ind[nid] === 0) q.push(nid);
    });
  }
  nodes.forEach((n) => {
    if (!out.find((x) => x.id === n.id)) out.push(n);
  });
  return out;
}

export type SimNodeResult = {
  score: number;
  outcome: "success" | "partial" | "fail";
  depPenalty: number;
  autoFail?: boolean;
};

export function simNode(
  node: any,
  params: { budget: number; team: number },
  depResults: Record<string, SimNodeResult> | undefined,
  incomingEdges: any[] | undefined
): SimNodeResult {
  const progBase = node.progress || 0;
  const statusK = ({ completed: 1.0, active: 0.82, planning: 0.55, paused: 0.45, blocked: 0.15 } as Record<string, number>)[node.status] ?? 0.5;
  const prioBonus = ({ low: 8, medium: 4, high: 0, critical: -4 } as Record<string, number>)[node.priority] ?? 0;
  const budgetFactor = params.budget >= 100000 ? 1.0 : params.budget >= 50000 ? 0.92 : params.budget >= 20000 ? 0.82 : params.budget >= 5000 ? 0.70 : 0.55;
  const teamFactor = params.team >= 10 ? 1.0 : params.team >= 5 ? 0.93 : params.team >= 3 ? 0.84 : params.team >= 1 ? 0.74 : 0.60;
  const resourceFactor = (budgetFactor + teamFactor) / 2;
  let depPenalty = 0;
  let autoFail = false;
  if (incomingEdges && depResults) {
    for (const edge of incomingEdges) {
      const dep = depResults[edge.from];
      if (!dep) continue;
      if (edge.type === "blocks") {
        if (dep.outcome === "fail") { autoFail = true; break; }
        if (dep.outcome === "partial") depPenalty += 22;
      } else if (edge.type === "requires") {
        if (dep.outcome === "fail") depPenalty += 30;
        else if (dep.outcome === "partial") depPenalty += 14;
      } else if (edge.type === "affects") {
        if (dep.outcome === "fail") depPenalty += 16;
        else if (dep.outcome === "partial") depPenalty += 7;
      } else if (edge.type === "follows") {
        if (dep.outcome === "fail") depPenalty += 20;
        else if (dep.outcome === "partial") depPenalty += 9;
      }
    }
  }
  if (autoFail) {
    return { score: Math.floor(Math.random() * 18) + 2, outcome: "fail", autoFail: true, depPenalty: Math.round(depPenalty) };
  }
  const raw = progBase * statusK + prioBonus - depPenalty;
  const sc = Math.max(2, Math.min(98, Math.round(raw * resourceFactor + (Math.random() - 0.5) * 16)));
  return { score: sc, outcome: sc >= 70 ? "success" : sc >= 42 ? "partial" : "fail", depPenalty: Math.round(depPenalty) };
}
