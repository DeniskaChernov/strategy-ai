import * as React from "react";
import { Compass } from "lucide-react";

type TFn = (key: string, fallback?: string) => string;

export function AnimatedLandingNav({
  t,
  lang,
  onChangeLang,
  theme,
  onToggleTheme,
  onSignIn,
  onGetStarted,
  scrollToId,
}: {
  t: TFn;
  lang: string;
  onChangeLang: (code: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
  scrollToId: (id: string) => void;
}) {
  const navItems = React.useMemo(
    () => [
      { id: "land-features", label: t("nav_features", "Возможности") },
      { id: "land-audience", label: t("nav_audience", "Для кого") },
      { id: "land-pricing", label: t("nav_pricing", "Тарифы") },
      { id: "land-faq", label: t("nav_faq", "FAQ") },
    ],
    [t, lang],
  );

  // Подсветка активной секции + плавающий индикатор.
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const linksWrapRef = React.useRef<HTMLDivElement | null>(null);
  const linkRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = React.useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  // Наблюдаем секции лендинга — подсвечиваем ту, что занимает центр вьюпорта.
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const elements = navItems
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    let latest: Record<string, IntersectionObserverEntry> = {};
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) latest[e.target.id] = e;
        // Выбираем самую видимую пересекающуюся секцию.
        const visible = Object.values(latest)
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        } else {
          setActiveId(null);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -45% 0px", // окно-«ремень» по центру вьюпорта
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const el of elements) io.observe(el);
    return () => io.disconnect();
  }, [navItems]);

  // Позиционируем плавающий индикатор под активной ссылкой.
  React.useEffect(() => {
    const wrap = linksWrapRef.current;
    if (!wrap) return;
    if (!activeId) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }
    const btn = linkRefs.current[activeId];
    if (!btn) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }
    const wrapBox = wrap.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setIndicator({
      left: btnBox.left - wrapBox.left,
      width: btnBox.width,
      visible: true,
    });
  }, [activeId, lang]);

  // Пересчитываем при ресайзе вьюпорта.
  React.useEffect(() => {
    const wrap = linksWrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!activeId) return;
      const btn = linkRefs.current[activeId];
      if (!btn) return;
      const wrapBox = wrap.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setIndicator({ left: btnBox.left - wrapBox.left, width: btnBox.width, visible: true });
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [activeId]);

  return (
    <div
      className="sa-animated-nav-wrap"
      style={{
        position: "fixed",
        top: "max(24px, env(safe-area-inset-top))",
        left: "50%",
        right: "auto",
        transform: "translateX(-50%)",
        zIndex: 600,
        width: "auto",
        maxWidth: "min(96vw, 1100px)",
      }}
    >
      <nav
        aria-label={t("nav_main", "Основная навигация")}
        className="sa-animated-nav-pill"
        style={{
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          borderRadius: 9999,
          border: "0.5px solid var(--b1)",
          background: "var(--sb)",
          backdropFilter: "blur(22px) saturate(1.15)",
          WebkitBackdropFilter: "blur(22px) saturate(1.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,.35)",
          minHeight: 48,
          width: "auto",
          maxWidth: "min(96vw, 1100px)",
        }}
      >
        <div
          className="sa-animated-nav-logo"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 8,
            color: "var(--acc)",
          }}
        >
          <Compass aria-hidden size={22} strokeWidth={2} />
        </div>

        <div
          ref={linksWrapRef}
          className="sa-animated-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(6px, 1.5vw, 16px)",
            paddingRight: 12,
            flexWrap: "wrap",
            position: "relative",
          }}
        >
          {/* Плавающий индикатор под активной ссылкой */}
          <span
            aria-hidden
            className="sa-animated-nav-indicator"
            style={{
              position: "absolute",
              left: 0,
              bottom: 4,
              height: 3,
              borderRadius: 2,
              pointerEvents: "none",
              background: "linear-gradient(90deg, var(--acc), var(--acc2, var(--acc)))",
              boxShadow: "0 0 12px rgba(104,54,245,.45)",
              transform: `translateX(${indicator.left}px)`,
              width: indicator.width,
              opacity: indicator.visible ? 1 : 0,
              transition:
                "transform var(--dur-md) var(--ease-spring), width var(--dur-md) var(--ease-spring), opacity var(--dur-sm) var(--ease-soft)",
            }}
          />
          {navItems.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                linkRefs.current[item.id] = el;
              }}
              type="button"
              aria-current={activeId === item.id ? "location" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                scrollToId(item.id);
              }}
              className={
                "sa-animated-nav-link" + (activeId === item.id ? " is-active" : "")
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className="sa-animated-nav-tools"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingRight: 14,
            borderLeft: "0.5px solid var(--b0)",
            paddingLeft: 12,
            flexShrink: 0,
          }}
        >
          <div
            role="group"
            aria-label={t("select_language", "Язык")}
            style={{
              display: "flex",
              background: "var(--inp)",
              border: ".5px solid var(--b1)",
              borderRadius: 22,
              padding: 3,
              gap: 1,
            }}
          >
            {(["en", "ru", "uz"] as const).map((code) => (
              <button
                key={code}
                type="button"
                className={"land-lang-btn" + (lang === code ? " on" : "")}
                aria-pressed={lang === code}
                aria-label={code.toUpperCase()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeLang(code);
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tpill"
            onClick={(e) => {
              e.stopPropagation();
              onToggleTheme();
            }}
            aria-label={t("toggle_theme", "Тема")}
          >
            <div className={"tpi" + (theme === "dark" ? " on" : "")}>☽</div>
            <div className={"tpi" + (theme === "light" ? " on" : "")}>☀</div>
          </button>
          <button type="button" className="btn-g" onClick={(e) => { e.stopPropagation(); onSignIn(); }}>
            {t("sign_in", "Войти")}
          </button>
          <button type="button" className="btn-p" onClick={(e) => { e.stopPropagation(); onGetStarted(); }}>
            {t("nav_getstarted", "Начать бесплатно")}
          </button>
        </div>
      </nav>
    </div>
  );
}
