import React, { useEffect, useState } from "react";
import { bootstrapAnalyticsIfConsented, initAnalyticsAfterConsent } from "../analytics";
import { useLang } from "../lang-context";

export function CookieConsent() {
  const { t } = useLang();
  const [shown, setShown] = useState(() => {
    try {
      return !localStorage.getItem("sa_cookie_ok");
    } catch {
      return true;
    }
  });

  useEffect(() => {
    bootstrapAnalyticsIfConsented();
  }, []);

  if (!shown) return null;

  function accept() {
    try {
      localStorage.setItem("sa_cookie_ok", "1");
    } catch {
      /* ignore */
    }
    initAnalyticsAfterConsent();
    setShown(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(9,7,22,.92)",
        backdropFilter: "blur(20px) saturate(1.1)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(104,54,245,.28)",
        borderRadius: 16,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        maxWidth: 560,
        width: "92vw",
        boxShadow: "0 8px 40px rgba(0,0,0,.45),0 0 0 .5px rgba(104,54,245,.12)",
      }}
    >
      <span style={{ fontSize: 12, color: "rgba(188,186,224,.62)", flex: 1, lineHeight: 1.5 }}>
        {t("cookie_text", "🍪 Мы используем cookies для аналитики и улучшения сервиса. Продолжая, вы соглашаетесь с нашей")}{" "}
        <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#b4a3ff", textDecoration: "underline" }}>
          {t("cookie_policy", "Политикой конфиденциальности")}
        </a>
        .
      </span>
      <button
        onClick={accept}
        className="btn-interactive"
        style={{
          padding: "8px 18px",
          borderRadius: 9,
          border: "none",
          background: "var(--gradient-accent)",
          color: "var(--accent-on-bg)",
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 12px var(--accent-glow)",
        }}
      >
        {t("cookie_accept", "Принять")}
      </button>
    </div>
  );
}
