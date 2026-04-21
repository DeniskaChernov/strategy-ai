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
  const navItems = [
    { id: "land-features", label: t("nav_features", "Возможности") },
    { id: "land-audience", label: t("nav_audience", "Для кого") },
    { id: "land-pricing", label: t("nav_pricing", "Тарифы") },
    { id: "land-faq", label: t("nav_faq", "FAQ") },
  ];

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
          className="sa-animated-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(6px, 1.5vw, 16px)",
            paddingRight: 12,
            flexWrap: "wrap",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToId(item.id);
              }}
              className="sa-animated-nav-link"
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
