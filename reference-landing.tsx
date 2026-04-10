import React, { useMemo, useRef, useState } from "react";
import { StrategyShellBg } from "./strategy-shell-sidebar";
import { LandingStarsCanvas } from "./client/landing-stars-canvas";
import { AnimatedLandingNav } from "./client/animated-landing-nav";
import { GlowCard } from "./client/glow-card";
import { LandingPricingCards } from "./client/landing-pricing-cards";
import {
  LandingTestimonialsColumns,
  type LandingTestimonialColumnItem,
} from "./client/landing-testimonials-columns";

type TFn = (key: string, fallback?: string) => string;

const TESTI1 = { qk: "ref_t1_q", qf: "Карта и таймлайн в одном месте — наконец-то видно связь между целями и сроками.", nk: "ref_t1_n", nf: "Алексей К.", rk: "ref_t1_r", rf: "CEO", ini: "АК", avs: { background: "rgba(104,54,245,.2)", color: "#a278ff" } };
const TESTI2 = { qk: "ref_t2_q", qf: "Сценарии помогли перед совещанием: три варианта наглядно.", nk: "ref_t2_n", nf: "Мария Д.", rk: "ref_t2_r", rf: "CPO", ini: "МД", avs: { background: "rgba(18,196,130,.2)", color: "rgba(18,196,130,.9)" } };
const TESTI3 = { qk: "ref_t3_q", qf: "AI по шагам карты даёт конкретику, а не общие слова.", nk: "ref_t3_n", nf: "Тимур Р.", rk: "ref_t3_r", rf: "Партнёр", ini: "ТР", avs: { background: "rgba(240,148,40,.2)", color: "rgba(240,148,40,.95)" } };

function scrollToId(id: string){
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if(el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Лендинг в разметке и классах public/strategy-reference.html (токены .dk / .lt). */
export function ReferenceLandingView({
  t,
  lang,
  onChangeLang,
  theme,
  onToggleTheme,
  onSignIn,
  onGetStarted,
}: {
  t: TFn;
  lang: string;
  onChangeLang: (code: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}){
  const rootRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const testimonialColumns = useMemo(() => {
    const m = (x: typeof TESTI1): LandingTestimonialColumnItem => ({
      text: t(x.qk, x.qf),
      name: t(x.nk, x.nf),
      role: t(x.rk, x.rf),
      initials: x.ini,
      avatarStyle: x.avs,
    });
    return [
      [m(TESTI1), m(TESTI2), m(TESTI3)],
      [m(TESTI2), m(TESTI3), m(TESTI1)],
      [m(TESTI3), m(TESTI1), m(TESTI2)],
    ];
  }, [t]);

  const dk = theme === "dark" ? "dk" : "lt";
  const feats = [
    { icon: "🗺️", titleKey: "ref_feat_maps_t", titleFb: "Визуальные карты стратегии", descKey: "ref_feat_maps_d", descFb: "Узлы целей, инициатив, KPI, задач и рисков. Типизированные связи между узлами." },
    { icon: "⚖️", titleKey: "ref_feat_scen_t", titleFb: "Сценарии", descKey: "ref_feat_scen_d", descFb: "Несколько версий будущего и сравнение последствий на одной карте." },
    { icon: "🤖", titleKey: "ref_feat_ai_t", titleFb: "AI-советник", descKey: "ref_feat_ai_d", descFb: "Контекст ваших карт и шагов — ответы привязаны к делу, а не к шаблонам." },
    { icon: "📊", titleKey: "ref_feat_gantt_t", titleFb: "Gantt-таймлайн", descKey: "ref_feat_gantt_d", descFb: "Временная шкала инициатив, пересечения и прогресс по дорожной карте." },
    { icon: "💡", titleKey: "ref_feat_insight_t", titleFb: "Инсайты", descKey: "ref_feat_insight_d", descFb: "Оценка здоровья стратегии, пробелы и приоритеты." },
    { icon: "👥", titleKey: "ref_feat_team_t", titleFb: "Командная работа", descKey: "ref_feat_team_d", descFb: "Роли, комментарии, совместное редактирование и автосохранение." },
    { icon: "🔗", titleKey: "ref_feat_crm_t", titleFb: "CRM (в планах)", descKey: "ref_feat_crm_d", descFb: "Интеграция пайплайна со стратегическими целями — в развитии продукта." },
    { icon: "📤", titleKey: "ref_feat_export_t", titleFb: "Экспорт", descKey: "ref_feat_export_d", descFb: "PNG, JSON и др. Презентации — на тарифах Pro+." },
    { icon: "📸", titleKey: "ref_feat_ver_t", titleFb: "Версии карт", descKey: "ref_feat_ver_d", descFb: "Снимки состояний и история изменений." },
    { icon: "🔐", titleKey: "ref_feat_sec_t", titleFb: "Данные и доступ", descKey: "ref_feat_sec_d", descFb: "Роли в проекте, контроль видимости карт и привычные практики безопасности для команд." },
    { icon: "🧩", titleKey: "ref_feat_tpl_t", titleFb: "Шаблоны стартов", descKey: "ref_feat_tpl_d", descFb: "Быстрый старт с типовыми картами под рост, запуск продукта или квартальное планирование." },
  ];
  const trustPills = [
    { k: "ref_trust_p1", f: "B2B · SaaS" },
    { k: "ref_trust_p2", f: "Продакты и стратегия" },
    { k: "ref_trust_p3", f: "Консалтинг" },
    { k: "ref_trust_p4", f: "Финтех" },
    { k: "ref_trust_p5", f: "EdTech" },
  ];
  const audienceCards = [
    { icon: "🚀", tk: "ref_aud_1_t", tf: "Фаундеры и CEO", dk: "ref_aud_1_d", df: "Сжать цели, риски и дорожную карту в одну живую картину для совета и инвесторов." },
    { icon: "🎯", tk: "ref_aud_2_t", tf: "CPO и продакт-лиды", dk: "ref_aud_2_d", df: "Связать бэклог, сценарии и таймлайн — без разрозненных доски и таблиц." },
    { icon: "🧭", tk: "ref_aud_3_t", tf: "Консультанты и фасилитаторы", dk: "ref_aud_3_d", df: "Вести сессии стратегии в одном месте: карта, сценарии и артефакты для клиента." },
  ];
  const integrationChips = [
    { k: "ref_int_1", f: "Экспорт PNG и JSON", emoji: "⬇️" },
    { k: "ref_int_2", f: "Презентации на старших тарифах", emoji: "📽️" },
    { k: "ref_int_3", f: "Командные роли и проекты", emoji: "👥" },
    { k: "ref_int_4", f: "API и интеграции — в развитии", emoji: "🔌" },
  ];
  const steps = [
    { n: "1", tk: "ref_how1_t", tf: "Карта стратегии", dk: "ref_how1_d", df: "Цели, инициативы, KPI и риски как узлы и связи." },
    { n: "2", tk: "ref_how2_t", tf: "Сценарии", dk: "ref_how2_d", df: "Сравните варианты развития до решения." },
    { n: "3", tk: "ref_how3_t", tf: "Спросите AI", dk: "ref_how3_d", df: "Вопросы по пробелам, рискам и приоритетам в контексте карты." },
    { n: "4", tk: "ref_how4_t", tf: "Исполнение", dk: "ref_how4_d", df: "Таймлайн, прогресс и командная работа." },
  ];
  const tierStrip = [
    { id: "free" as const, badge: "⬡", color: "#9088b0", name: "Free" },
    { id: "starter" as const, badge: "◈", color: "#12c482", name: "Starter" },
    { id: "pro" as const, badge: "◆", color: "#a050ff", name: "Pro" },
    { id: "team" as const, badge: "✦", color: "#f09428", name: "Team" },
    { id: "enterprise" as const, badge: "💎", color: "#06b6d4", name: "Enterprise" },
  ];
  const faq = [
    { q: "ref_faq1_q", qf: "Что такое Strategy AI?", a: "ref_faq1_a", af: "Платформа визуального стратегического планирования: карты, сценарии, таймлайн и AI-советник с учётом ваших данных." },
    { q: "ref_faq2_q", qf: "Чем AI отличается от ChatGPT?", a: "ref_faq2_a", af: "Советник опирается на ваши проекты, карты и шаги — не на общий шаблонный ответ." },
    { q: "ref_faq3_q", qf: "Что в бесплатном тарифе?", a: "ref_faq3_a", af: "Ознакомление с продуктом: лимиты по проектам и картам — см. тарифы в приложении." },
    { q: "ref_faq4_q", qf: "Можно ли в команде?", a: "ref_faq4_a", af: "Да, на платных тарифах — участники проекта и роли." },
    { q: "ref_faq5_q", qf: "Экспорт?", a: "ref_faq5_a", af: "Доступен экспорт карты (в т.ч. PNG/JSON); PPTX — на старших тарифах." },
    { q: "ref_faq6_q", qf: "Есть ли онбординг?", a: "ref_faq6_a", af: "Да: подсказки в интерфейсе, шаблоны карт и быстрый старт без обучения «с нуля»." },
    { q: "ref_faq7_q", qf: "Можно ли работать офлайн?", a: "ref_faq7_a", af: "Основной режим — в браузере с сохранением в облаке; офлайн-режим может появиться позже." },
  ];

  return(
    <div ref={rootRef} className={`sa-ref-landing sa-strategy-ui sa-landing-shell ${dk} view on sa-v-landing`} style={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "stretch", overflowY: "auto", overflowX: "hidden", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <StrategyShellBg/>
      <LandingStarsCanvas theme={theme} />
      <AnimatedLandingNav
        t={t}
        lang={lang}
        onChangeLang={onChangeLang}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        scrollToId={scrollToId}
      />

      <div className="land-inner" style={{ position: "relative", zIndex: 5 }}>
        <div className="land-nav-spacer"/>

        <div className="hero" id="hero-section">
          <h1
            className="hero-h1"
            dangerouslySetInnerHTML={{
              __html: t(
                "ref_hero_h1_html",
                'Стратегия,<br/><span class="grad-text">которая думает с вами</span>'
              ),
            }}
          />
          <p className="hero-sub">
            {t(
              "ref_hero_sub",
              "Визуальные карты целей и инициатив, сценарии «что если», таймлайн и AI-советник — в одном рабочем пространстве."
            )}
          </p>
          <div className="hero-btns">
            <button type="button" className="btn-p lg" onClick={onGetStarted}>
              {t("hero_cta", "Начать бесплатно — без карты")}
            </button>
            <button type="button" className="btn-g lg" onClick={() => scrollToId("land-mockup")}>
              {t("ref_demo", "Смотреть интерфейс ↗")}
            </button>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 11.5,
              color: "var(--t3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <span>{t("trust_1", "✓ Бесплатный тариф")}</span>
            <span>{t("trust_2", "✓ Без карты")}</span>
            <span>{t("trust_3", "✓ Старт за пару минут")}</span>
            <span>{t("trust_4", "✓ Отмена в любой момент")}</span>
          </div>
        </div>

        <div className="land-stats stagger" id="land-stats-section" style={{ marginBottom: 88 }}>
          <div className="stat-item sr sr-up in">
            <div className="stat-val" style={{ color: "var(--acc)" }}>2,400+</div>
            <div className="stat-lbl">{t("ref_stat_teams", "Команд")}</div>
          </div>
          <div className="stat-item sr sr-up in">
            <div className="stat-val" style={{ color: "var(--green)" }}>18K+</div>
            <div className="stat-lbl">{t("ref_stat_maps", "Карт стратегии")}</div>
          </div>
          <div className="stat-item sr sr-up in">
            <div className="stat-val" style={{ color: "var(--amber)" }}>94%</div>
            <div className="stat-lbl">{t("ref_stat_sat", "Удовлетворённость")}</div>
          </div>
          <div className="stat-item sr sr-up in">
            <div className="stat-val">4.9 ⭐</div>
            <div className="stat-lbl">Product Hunt</div>
          </div>
        </div>

        <div className="land-trust-strip sr sr-up in" aria-label={t("ref_trust_aria", "Отрасли и типы команд")}>
          <div className="land-trust-strip__lbl">{t("ref_trust_lbl", "Команды и отрасли")}</div>
          {trustPills.map((p) => (
            <span key={p.k} className="land-trust-pill">
              {t(p.k, p.f)}
            </span>
          ))}
        </div>

        <div className="mockup-wrap sr sr-scale in" id="land-mockup">
          <div className="mockup-glow"/>
          <div className="mockup-frame">
            <div className="mockup-bar">
              <div className="mkbar-dot" style={{ background: "#f04458" }}/>
              <div className="mkbar-dot" style={{ background: "#f09428" }}/>
              <div className="mkbar-dot" style={{ background: "#12c482" }}/>
              <div style={{ flex: 1, height: 18, background: "var(--inp)", borderRadius: 4, margin: "0 8px", maxWidth: 240 }}/>
              <div style={{ fontSize: 10, color: "var(--t3)", marginLeft: "auto" }}>Strategy AI</div>
            </div>
            <div className="mockup-body">
              <div className="mkb-sb">
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", marginBottom: 6, borderBottom: ".5px solid var(--b0)", paddingBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#6836f5,#b060ff)" }}/>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t1)" }}>Strategy AI</div>
                </div>
                <div className="mkb-ni on"><div className="mkb-dot" style={{ background: "#a278ff" }}/>{t("shell_strategy_map", "Карта")}</div>
                <div className="mkb-ni"><div className="mkb-dot" style={{ background: "var(--t3)" }}/>{t("shell_scenarios", "Сценарии")}</div>
                <div className="mkb-ni"><div className="mkb-dot" style={{ background: "var(--t3)" }}/>{t("shell_timeline", "Таймлайн")}</div>
                <div className="mkb-ni"><div className="mkb-dot" style={{ background: "var(--green)" }}/>AI</div>
                <div className="mkb-ni"><div className="mkb-dot" style={{ background: "var(--t3)" }}/>{t("shell_insights", "Инсайты")}</div>
              </div>
              <div className="mkb-main">
                <div className="mkb-node" style={{ borderTop: "2.5px solid #8864ff" }}><div className="mkb-node-type" style={{ color: "#a278ff" }}>🎯 Goal</div><div className="mkb-node-title">$500K Q2</div><div className="mkb-node-bar"><div className="mkb-node-fill" style={{ width: "40%", background: "linear-gradient(90deg,#6836f5,#a050ff)" }}/></div></div>
                <div className="mkb-node" style={{ borderTop: "2.5px solid #12c482" }}><div className="mkb-node-type" style={{ color: "rgba(18,196,130,.9)" }}>⚡</div><div className="mkb-node-title">Launch</div><div className="mkb-node-bar"><div className="mkb-node-fill" style={{ width: "85%", background: "#12c482" }}/></div></div>
                <div className="mkb-node" style={{ borderTop: "2.5px solid #f09428" }}><div className="mkb-node-type" style={{ color: "rgba(240,148,40,.9)" }}>KPI</div><div className="mkb-node-title">MRR</div><div className="mkb-node-bar"><div className="mkb-node-fill" style={{ width: "68%", background: "#f09428" }}/></div></div>
                <div className="mkb-node" style={{ borderTop: "2.5px solid #f04458" }}><div className="mkb-node-type" style={{ color: "rgba(240,68,88,.9)" }}>⚠️</div><div className="mkb-node-title">Runway</div><div className="mkb-node-bar"><div className="mkb-node-fill" style={{ width: "35%", background: "#f04458" }}/></div></div>
              </div>
            </div>
          </div>
        </div>

        <div id="land-features">
          <div className="land-section-lbl sr sr-up in">{t("ref_sec_feat_lbl", "Всё необходимое")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_sec_feat_title", "Для стратегического мышления")}</div>
          <div className="land-section-sub sr sr-up in">{t("ref_sec_feat_sub", "От соло-основателя до команды — один инструмент для карты, сценариев и исполнения.")}</div>
          <div className="features-grid stagger" style={{ marginBottom: 88 }}>
            {feats.map(f=>(
              <GlowCard
                key={f.titleKey}
                panelVariant
                plain
                glowColor="accent"
                customSize
                width="100%"
                className="feat-card sr sr-up in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  padding: "18px 18px 20px",
                  boxSizing: "border-box",
                  alignSelf: "stretch",
                  height: "100%",
                  minHeight: 0,
                  justifyContent: "flex-start",
                }}
              >
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{t(f.titleKey, f.titleFb)}</div>
                <div className="feat-desc">{t(f.descKey, f.descFb)}</div>
              </GlowCard>
            ))}
          </div>
        </div>

        <div id="land-how">
          <div className="land-section-lbl sr sr-up in">{t("ref_sec_how_lbl", "Как это работает")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_sec_how_title", "От идеи к исполнению")}</div>
          <div className="land-section-sub sr sr-up in">{t("ref_sec_how_sub", "Четыре шага без перегруза классическими инструментами.")}</div>
          <div className="how-steps stagger">
            {steps.map(s=>(
              <div key={s.n} className="how-step sr sr-up in">
                <div className="how-num">{s.n}</div>
                <div className="how-title">{t(s.tk, s.tf)}</div>
                <div className="how-desc">{t(s.dk, s.df)}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="land-audience">
          <div className="land-section-lbl sr sr-up in">{t("ref_aud_lbl", "Кому подходит")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_aud_title", "Один продукт — разные роли")}</div>
          <div className="land-section-sub sr sr-up in">{t("ref_aud_sub", "От стартапа до консалтинга: карта, сценарии и AI в одном контексте.")}</div>
          <div className="land-audience-grid stagger">
            {audienceCards.map((a) => (
              <GlowCard
                key={a.tk}
                panelVariant
                plain
                glowColor="accent"
                customSize
                width="100%"
                className="feat-card sr sr-up in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  padding: "18px 18px 20px",
                  boxSizing: "border-box",
                  alignSelf: "stretch",
                  height: "100%",
                  minHeight: 0,
                  justifyContent: "flex-start",
                }}
              >
                <div className="feat-icon">{a.icon}</div>
                <div className="feat-title">{t(a.tk, a.tf)}</div>
                <div className="feat-desc">{t(a.dk, a.df)}</div>
              </GlowCard>
            ))}
          </div>
        </div>

        <div id="land-compare">
          <div className="land-section-lbl sr sr-up in">{t("ref_sec_cmp_lbl", "Сравнение")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_sec_cmp_title", "Почему Strategy AI")}</div>
          <div className="land-section-sub sr sr-up in">{t("ref_sec_cmp_sub", "Специализация на стратегии: карта + сценарии + таймлайн + контекстный AI.")}</div>
          <div className="compare-wrap sr sr-scale in" style={{ marginBottom: 88 }}>
            <table className="compare-table">
              <thead><tr>
                <th>{t("ref_cmp_feat", "Функция")}</th>
                <th>Notion</th>
                <th>Miro</th>
                <th>ChatGPT</th>
                <th className="acc">Strategy AI ✦</th>
              </tr></thead>
              <tbody>
                <tr><td>{t("ref_cmp_row1", "Визуальная карта стратегии")}</td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center"><span className="compare-badge cb-yes">✓</span></td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="acc-col"><span className="compare-badge cb-yes">✓</span></td></tr>
                <tr><td>{t("ref_cmp_row2", "AI с контекстом бизнеса")}</td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center">{t("ref_cmp_partial", "Частично")}</td><td className="acc-col"><span className="compare-badge cb-yes">✓</span></td></tr>
                <tr><td>{t("ref_cmp_row3", "Сценарии")}</td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="acc-col"><span className="compare-badge cb-yes">✓</span></td></tr>
                <tr><td>{t("ref_cmp_row4", "Gantt / таймлайн")}</td><td className="center">{t("ref_cmp_partial", "Частично")}</td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="center"><span className="compare-badge cb-no">–</span></td><td className="acc-col"><span className="compare-badge cb-yes">✓</span></td></tr>
                <tr><td>{t("ref_cmp_row5", "Бесплатный старт")}</td><td className="center"><span className="compare-badge cb-yes">✓</span></td><td className="center"><span className="compare-badge cb-yes">✓</span></td><td className="center"><span className="compare-badge cb-yes">✓</span></td><td className="acc-col"><span className="compare-badge cb-yes">✓</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="land-integrations">
          <div className="land-section-lbl sr sr-up in">{t("ref_int_lbl", "Экосистема")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_int_title", "Экспорт, команда, развитие")}</div>
          <div className="land-section-sub sr sr-up in">{t("ref_int_sub", "Что уже есть в продукте и что запланировано — без сюрпризов в тарифах.")}</div>
          <div className="land-int-row sr sr-up in" role="list">
            {integrationChips.map((c) => (
              <div key={c.k} className="land-int-chip" role="listitem">
                <span aria-hidden>{c.emoji}</span>
                {t(c.k, c.f)}
              </div>
            ))}
          </div>
        </div>

        <div id="land-testimonials">
          <div className="land-section-lbl sr sr-up in">{t("ref_testi_lbl", "Отзывы")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_testi_title", "Нам доверяют команды")}</div>
          <div className="land-section-sub sr sr-up in" style={{ marginBottom: 40 }}>{t("ref_testi_sub", "Структура вместо разрозненных таблиц и чатов.")}</div>
          <div
            className="stagger sr sr-up in"
            role="region"
            aria-label={t("ref_testi_title", "Нам доверяют команды")}
            style={{ padding: "8px 0 12px", boxSizing: "border-box" }}
          >
            <LandingTestimonialsColumns columns={testimonialColumns} durations={[16, 22, 18]} />
          </div>
        </div>

        <div id="land-faq">
          <div className="land-section-lbl sr sr-up in">{t("ref_faq_lbl", "Вопросы")}</div>
          <div className="land-section-title sr sr-up in">{t("ref_faq_title", "FAQ")}</div>
          <div className="land-section-sub sr sr-up in" style={{ marginBottom: 40 }}>{t("ref_faq_sub", "Коротко о продукте.")}</div>
          <div className="faq-list">
            {faq.map((item, i)=>(
              <div
                key={i}
                className={"faq-item sr sr-up in"+(openFaq===i?" open":"")}
                role="button"
                tabIndex={0}
                onClick={()=>setOpenFaq(openFaq===i?null:i)}
                onKeyDown={e=>{
                  if(e.key==="Enter"||e.key===" "){
                    e.preventDefault();
                    setOpenFaq(openFaq===i?null:i);
                  }
                }}
                aria-expanded={openFaq===i}
                aria-controls={`land-faq-panel-${i}`}
              >
                <div className="faq-q" id={`land-faq-q-${i}`}>{t(item.q, item.qf)}<span className="faq-icon" aria-hidden>+</span></div>
                <div
                  className="faq-a"
                  id={`land-faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`land-faq-q-${i}`}
                  aria-hidden={openFaq !== i}
                >
                  {t(item.a, item.af)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <section id="land-pricing" className="sa-land-pricing sr sr-up in">
          <div className="tier-wrap">
            <div className="tier-header">
              <div className="land-section-lbl">{t("tag_pricing_label", "Тарифы")}</div>
              <div className="tier-h">{t("ref_tiers_line", "Линейка тарифов")}</div>
              <div className="tier-s">{t("ref_tiers_note", "Полные лимиты по проектам, картам и AI — в разделе «Учётная запись» после входа.")}</div>
            </div>
            <LandingPricingCards t={t} tierStrip={tierStrip} onGetStarted={onGetStarted} />
          </div>
        </section>

        <div className="land-cta sr sr-scale in">
          <div className="cta-title" dangerouslySetInnerHTML={{ __html: t("ref_cta_title_html", "Готовы к стратегии,<br/>которая доходит до исполнения?") }}/>
          <div className="cta-sub">{t("ref_cta_sub", "Бесплатный тариф. Создайте аккаунт и первую карту за пару минут.")}</div>
          <div className="cta-btns">
            <button type="button" className="btn-p lg" onClick={onGetStarted}>{t("ref_cta_btn", "Создать аккаунт →")}</button>
            <button type="button" className="btn-g lg" onClick={()=>scrollToId("land-mockup")}>{t("ref_cta_demo", "Интерфейс")}</button>
          </div>
        </div>

        <div className="land-footer">
          <div className="land-logo" style={{ gap: 8 }}>
            <div className="land-gem" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 11 }}>SA</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>Strategy AI</span>
          </div>
          <div className="footer-links">
            <button type="button" className="footer-link" onClick={()=>scrollToId("land-features")}>{t("nav_features", "Возможности")}</button>
            <button type="button" className="footer-link" onClick={()=>scrollToId("land-audience")}>{t("nav_audience", "Для кого")}</button>
            <button type="button" className="footer-link" onClick={()=>scrollToId("land-compare")}>{t("ref_sec_cmp_lbl", "Сравнение")}</button>
            <button type="button" className="footer-link" onClick={()=>scrollToId("land-pricing")}>{t("nav_pricing", "Тарифы")}</button>
            <button type="button" className="footer-link" onClick={()=>scrollToId("land-faq")}>FAQ</button>
            <a className="footer-link" href="/privacy">{t("footer_privacy", "Конфиденциальность")}</a>
            <a className="footer-link" href="/terms">{t("footer_terms", "Условия")}</a>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} Strategy AI</div>
        </div>
      </div>
    </div>
  );
}
