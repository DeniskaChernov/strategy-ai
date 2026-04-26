export type TierKey = "free" | "starter" | "pro" | "team" | "enterprise";

export type TierDef = {
  label: string;
  price: number;
  currency: string;
  maps: number;
  projects: number;
  members: number;
  scenarios: number;
  ai_messages: number;
  features: string[];
  color: string;
  users: number;
  templates: boolean;
  contentPlan: boolean;
  pptx: boolean;
};

const COLORS: Record<TierKey, string> = {
  free: "#9088b0",
  starter: "#12c482",
  pro: "#a050ff",
  team: "#f09428",
  enterprise: "#06b6d4",
};

const RAW: Record<TierKey, Omit<TierDef, "color" | "users" | "templates" | "contentPlan" | "pptx">> = {
  free: {
    label: "Free",
    price: 0,
    currency: "USD",
    maps: 1,
    projects: 1,
    members: 1,
    scenarios: 0,
    ai_messages: 0,
    features: [
      "3 стратегии в месяц",
      "Базовый анализ ниши",
      "Базовая маркетинговая стратегия",
      "Экспорт в текст",
    ],
  },
  starter: {
    label: "Starter",
    price: 9,
    currency: "USD",
    maps: 3,
    projects: 3,
    members: 3,
    scenarios: 2,
    ai_messages: 1500,
    features: [
      "Unlimited стратегии",
      "До 1500 AI сообщений/мес",
      "Глубокий анализ ниши",
      "Стратегия продвижения",
      "Маркетинговая воронка",
      "Контент-стратегия",
      "Экспорт стратегии",
    ],
  },
  pro: {
    label: "Pro",
    price: 29,
    currency: "USD",
    maps: 5,
    projects: 10,
    members: 5,
    scenarios: 5,
    ai_messages: 8000,
    features: [
      "Unlimited стратегии",
      "До 8000 AI сообщений/мес",
      "Расширенный анализ рынка",
      "Анализ конкурентов",
      "Воронки продаж",
      "Рекламные стратегии",
      "Генерация маркетинговых гипотез",
      "Приоритетная скорость",
    ],
  },
  team: {
    label: "Team",
    price: 59,
    currency: "USD",
    maps: 15,
    projects: 25,
    members: 10,
    scenarios: 15,
    ai_messages: 25000,
    features: [
      "Unlimited стратегии",
      "До 25000 AI сообщений/мес",
      "До 10 пользователей",
      "Совместная работа",
      "Сохранение стратегий",
      "Приоритетная поддержка",
    ],
  },
  enterprise: {
    label: "Enterprise",
    price: 149,
    currency: "USD",
    maps: 999999,
    projects: 999999,
    members: 999999,
    scenarios: 999999,
    ai_messages: 999999,
    features: [
      "Unlimited всё",
      "Индивидуальные лимиты",
      "API доступ",
      "Кастомные модели",
      "Персональная поддержка",
    ],
  },
};

function lim(n: number): number {
  return n >= 999999 ? Infinity : n;
}

function build(): Record<TierKey, TierDef> {
  const keys: TierKey[] = ["free", "starter", "pro", "team", "enterprise"];
  const out = {} as Record<TierKey, TierDef>;
  for (const k of keys) {
    const r = RAW[k];
    out[k] = {
      ...r,
      maps: lim(r.maps),
      projects: lim(r.projects),
      members: lim(r.members),
      scenarios: lim(r.scenarios),
      color: COLORS[k],
      users: lim(r.members),
      templates: k === "team" || k === "enterprise",
      contentPlan: k === "pro" || k === "team" || k === "enterprise",
      pptx: k === "enterprise",
    };
  }
  return out;
}

export const TIERS = build();
