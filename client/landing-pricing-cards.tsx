import React from "react";
import {
  Sparkles,
  Briefcase,
  Building2,
  Users,
  Zap,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TFn = (key: string, fallback?: string) => string;

export type LandingTier = {
  id: "free" | "starter" | "pro" | "team" | "enterprise";
  badge: string;
  color: string;
  name: string;
};

type Props = {
  t: TFn;
  theme?: string;
  tierStrip: LandingTier[];
  onGetStarted: () => void;
};

const iconByTier: Record<LandingTier["id"], LucideIcon> = {
  free: Sparkles,
  starter: Zap,
  pro: Briefcase,
  team: Users,
  enterprise: Building2,
};

const DEFAULT_FEATS: Record<LandingTier["id"], string> = {
  free: "1 проект · 1 карта|AI-интервью при создании|Gantt и экспорт PNG|Базовый AI-советник",
  starter: "3 проекта · 3 карты|2 сценария|Анализ рисков AI|Gantt и приоритеты",
  pro: "10 проектов · 5 карт|Участники и роли|Конкурентный анализ AI|OKR · SWOT · риски",
  team: "25 проектов · 15 карт|До 10 участников|Unit economics · шаблоны|AI авто-связи",
  enterprise: "Без лимитов по сущностям|BCG · Porter · Blue Ocean|PowerPoint и API|Выделенный контакт",
};

function parseFeatures(t: TFn, id: LandingTier["id"]): string[] {
  const raw = t(`ref_pricing_features_${id}`, DEFAULT_FEATS[id]);
  return raw.split("|").map((s) => s.trim()).filter(Boolean);
}

export function LandingPricingCards({ t, tierStrip, onGetStarted }: Props) {
  return (
    <div className="sa-lp-grid">
      {tierStrip.map((x) => {
        const Icon = iconByTier[x.id];
        const isPro = x.id === "pro";
        const features = parseFeatures(t, x.id);
        const price = t(`ref_tier_p_${x.id}`, "");
        const sub =
          x.id === "free"
            ? t("ref_pricing_price_free_sub", "навсегда")
            : x.id === "enterprise"
              ? t("ref_pricing_price_ent_sub", "индивидуально")
              : t("per_month_short", "/мес");
        const btnFree = x.id === "free";
        const btnLabel = btnFree
          ? t("start_free_cta", "Начать бесплатно")
          : x.id === "enterprise"
            ? t("tier_enterprise_cta", "Связаться с нами")
            : t("ref_cta_btn", "Создать аккаунт →");

        const titleId = `sa-lp-title-${x.id}`;
        const ctaAria = `${btnLabel} — ${x.name}`;

        return (
          <article
            key={x.id}
            className={"sa-lp-card" + (isPro ? " sa-lp-card--popular" : "")}
            aria-labelledby={titleId}
          >
            <div className="sa-lp-card__inner">
              <div className={"sa-lp-badge-row" + (isPro ? " sa-lp-badge-row--active" : "")}>
                {isPro && (
                  <>
                    <span className="sa-lp-sr-only">{t("ref_pricing_popular_plan", "Популярный тариф.")}</span>
                    <div className="sa-lp-pop-badge" role="status">
                      <span className="sa-lp-pop-badge__accent" aria-hidden />
                      <span className="sa-lp-pop-badge__label">{t("pricing_hot_badge", "ТОП")}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="sa-lp-head">
                <div
                  className="sa-lp-icon"
                  style={{
                    borderColor: `${x.color}44`,
                    background: `linear-gradient(145deg, ${x.color}22, ${x.color}08)`,
                  }}
                >
                  <Icon size={24} strokeWidth={1.75} color={x.color} aria-hidden />
                </div>
                <div className="sa-lp-head-text">
                  <h3 id={titleId} className="sa-lp-name">
                    {x.name}
                  </h3>
                  <p className="sa-lp-tag">{t(`ref_tier_d_${x.id}`, "")}</p>
                </div>
              </div>

              <div className="sa-lp-price-block">
                <div className="sa-lp-price-row">
                  <span className="sa-lp-price">{price}</span>
                  <span className="sa-lp-price-sub">{sub}</span>
                </div>
                <p className="sa-lp-fine">{t("ref_pricing_no_card", "Без карты для старта")}</p>
              </div>

              <ul className="sa-lp-feat">
                {features.map((line, idx) => (
                  <li key={idx}>
                    <span className="sa-lp-check" aria-hidden>
                      <Check size={12} strokeWidth={2.75} />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={"sa-lp-btn" + (btnFree ? " sa-lp-btn--ghost" : " sa-lp-btn--accent")}
                onClick={onGetStarted}
                aria-label={ctaAria}
              >
                {btnLabel}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
