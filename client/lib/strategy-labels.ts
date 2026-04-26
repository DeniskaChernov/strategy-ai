import type { TierKey } from "./tiers";

export function getROLES(t: (k: string, fb?: string) => string) {
  return {
    owner: { label: t("role_owner", "Владелец"), c: "#6836f5" },
    editor: { label: t("role_editor", "Редактор"), c: "#12c482" },
    viewer: { label: t("role_viewer", "Зритель"), c: "#a8a4c8" },
  };
}

export function getSTATUS(t: (k: string, fb?: string) => string) {
  return {
    planning: { label: t("status_planning", "Планирование"), c: "#6836f5" },
    active: { label: t("status_active", "В работе"), c: "#06b6d4" },
    completed: { label: t("status_completed", "Выполнено"), c: "#12c482" },
    paused: { label: t("status_paused", "Приостановлено"), c: "#f09428" },
    blocked: { label: t("status_blocked", "Заблокировано"), c: "#f04458" },
  };
}

export function getSTATUSES(t: (k: string, fb?: string) => string) {
  const S = getSTATUS(t);
  return (Object.keys(S) as (keyof typeof S)[]).map((id) => ({ id, ...S[id] }));
}

export function getPRIORITY(t: (k: string, fb?: string) => string) {
  return {
    low: { label: t("priority_low", "Низкий"), c: "#6c6480" },
    medium: { label: t("priority_medium", "Средний"), c: "#f09428" },
    high: { label: t("priority_high", "Высокий"), c: "#ea580c" },
    critical: { label: t("priority_critical", "Критический"), c: "#f04458" },
  };
}

export function getPRIORITIES(t: (k: string, fb?: string) => string) {
  const P = getPRIORITY(t);
  return (Object.keys(P) as (keyof typeof P)[]).map((id) => ({ id, ...P[id] }));
}

export function getETYPE(t: (k: string, fb?: string) => string) {
  return {
    requires: { label: t("etype_requires", "Требует"), c: "#6836f5", d: "none" },
    affects: { label: t("etype_affects", "Влияет"), c: "#a050ff", d: "8,4" },
    blocks: { label: t("etype_blocks", "Блокирует"), c: "#f04458", d: "4,3" },
    follows: { label: t("etype_follows", "Следует"), c: "#12c482", d: "12,4" },
  };
}

const TIER_PRICE_LABEL: Record<TierKey, string> = {
  free: "free_plan",
  starter: "tier_price_starter",
  pro: "tier_price_pro",
  team: "tier_price_team",
  enterprise: "tier_price_ent",
};

const TIER_PRICE_FALLBACK: Record<TierKey, string> = {
  free: "Бесплатно",
  starter: "$9/мес",
  pro: "$29/мес",
  team: "$59/мес",
  enterprise: "$149+/мес",
};

export function getTierPrice(tier: string, t: (k: string, fb?: string) => string): string {
  const k = (tier in TIER_PRICE_LABEL ? tier : "free") as TierKey;
  return t(TIER_PRICE_LABEL[k], TIER_PRICE_FALLBACK[k]);
}
