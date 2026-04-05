import React, { FormEvent, useState } from "react";
import { StrategyShellBg } from "../strategy-shell-sidebar";

type TFn = (key: string, fallback?: string) => string;

const starLayer: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  opacity: 0.45,
  backgroundImage: [
    "radial-gradient(1px 1px at 8% 12%, rgba(255,255,255,.5), transparent)",
    "radial-gradient(1px 1px at 22% 38%, rgba(255,255,255,.35), transparent)",
    "radial-gradient(1px 1px at 41% 9%, rgba(255,255,255,.4), transparent)",
    "radial-gradient(1px 1px at 55% 62%, rgba(255,255,255,.3), transparent)",
    "radial-gradient(1px 1px at 71% 24%, rgba(255,255,255,.45), transparent)",
    "radial-gradient(1px 1px at 88% 44%, rgba(255,255,255,.35), transparent)",
    "radial-gradient(1px 1px at 15% 78%, rgba(255,255,255,.3), transparent)",
    "radial-gradient(1px 1px at 63% 88%, rgba(255,255,255,.4), transparent)",
    "radial-gradient(1px 1px at 92% 12%, rgba(255,255,255,.25), transparent)",
  ].join(","),
};

function FieldIconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ flexShrink: 0, opacity: 0.55, color: "var(--t2)" }}>
      <path
        d="M18.311 16.406a9.64 9.64 0 0 0-4.748-4.158 5.938 5.938 0 1 0-7.125 0 9.64 9.64 0 0 0-4.749 4.158.937.937 0 1 0 1.623.938c1.416-2.447 3.916-3.906 6.688-3.906 2.773 0 5.273 1.46 6.689 3.906a.938.938 0 0 0 1.622-.938M5.938 7.5a4.063 4.063 0 1 1 8.125 0 4.063 4.063 0 0 1-8.125 0"
        fill="currentColor"
      />
    </svg>
  );
}

function FieldIconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ flexShrink: 0, opacity: 0.55, color: "var(--t2)" }}>
      <path
        d="M17.5 3.438h-15a.937.937 0 0 0-.937.937V15a1.563 1.563 0 0 0 1.562 1.563h13.75A1.563 1.563 0 0 0 18.438 15V4.375a.94.94 0 0 0-.938-.937m-2.41 1.874L10 9.979 4.91 5.313zM3.438 14.688v-8.18l5.928 5.434a.937.937 0 0 0 1.268 0l5.929-5.435v8.182z"
        fill="currentColor"
      />
    </svg>
  );
}

function SubmitArrow() {
  return (
    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ marginTop: 1 }}>
      <path
        d="m18.038 10.663-5.625 5.625a.94.94 0 0 1-1.328-1.328l4.024-4.023H3.625a.938.938 0 0 1 0-1.875h11.484l-4.022-4.025a.94.94 0 0 1 1.328-1.328l5.625 5.625a.935.935 0 0 1-.002 1.33"
        fill="#fff"
      />
    </svg>
  );
}

/** Как в Prebuilt UI: фиксированная высота строки, pill-бордер, focus ring indigo. */
const inpRow = (focused: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  height: 40,
  minHeight: 40,
  boxSizing: "border-box",
  background: "var(--inp)",
  border: "1px solid var(--b1)",
  borderRadius: 999,
  padding: "0 12px",
  marginBottom: 16,
  transition: "border-color .18s, box-shadow .18s",
  overflow: "hidden",
  boxShadow: focused ? "0 0 0 2px color-mix(in srgb, var(--acc) 45%, transparent)" : undefined,
  borderColor: focused ? "color-mix(in srgb, var(--acc) 55%, var(--b1))" : undefined,
});

const inpBare: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  padding: "0 8px",
  fontSize: 14,
  color: "var(--t1)",
  fontFamily: "inherit",
};

const textareaStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  marginTop: 8,
  marginBottom: 4,
  padding: "10px 12px",
  minHeight: 96,
  resize: "none" as const,
  background: "var(--inp)",
  border: "1px solid var(--b1)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--t1)",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .18s, box-shadow .18s",
  boxShadow: focused ? "0 0 0 2px color-mix(in srgb, var(--acc) 45%, transparent)" : undefined,
  borderColor: focused ? "color-mix(in srgb, var(--acc) 55%, var(--b1))" : undefined,
});

const fieldLbl: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--t1)",
  marginBottom: 8,
};

type ContactFormCosmicProps = {
  eyebrow?: string;
  onSubmit?: (data: { name: string; email: string; message: string }) => void | Promise<void>;
};

type ContactFormEmbeddedProps = {
  t: TFn;
  onSubmit?: (data: { name: string; email: string; message: string }) => void | Promise<void>;
  /** id для заголовка блока (a11y) */
  titleId?: string;
  /** префикс id полей, чтобы не конфликтовать с другими формами */
  fieldIdPrefix?: string;
};

function useContactSubmitState(
  onSubmit: ContactFormCosmicProps["onSubmit"] | ContactFormEmbeddedProps["onSubmit"],
) {
  const [focus, setFocus] = useState<"name" | "email" | "message" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    if (!name || !email || !message) return;
    setLoading(true);
    try {
      await onSubmit?.({ name, email, message });
    } finally {
      setLoading(false);
    }
  }

  return { focus, setFocus, loading, handleSubmit };
}

/** Форма связи для WelcomeScreen: без отдельного фона, внутри GlowCard. */
export function ContactFormEmbedded({ t, onSubmit, titleId = "welcome-contact-title", fieldIdPrefix = "welcome-contact" }: ContactFormEmbeddedProps) {
  const { focus, setFocus, loading, handleSubmit } = useContactSubmitState(onSubmit);
  const rowFocus = (k: "name" | "email") => focus === k;
  const pid = fieldIdPrefix;

  return (
    <div className="sa-ws-contact-form sa-ws-auth-form" style={{ maxWidth: 384, width: "100%", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 0 }}>
        <p
          className="sa-ws-contact-badge"
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--acc) 18%, var(--bg))",
            color: "var(--acc)",
            marginBottom: 0,
          }}
        >
          {t("contact_badge", "Связаться с нами")}
        </p>
        <h2
          id={titleId}
          tabIndex={-1}
          className="modal-title"
          style={{
            fontSize: "clamp(28px, 6vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: "16px 0",
            lineHeight: 1.15,
          }}
        >
          {t("contact_title", "Давайте на связи")}
        </h2>
        <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.55, margin: "0 0 40px" }}>
          {t("contact_or_write", "Или напишите на")}{" "}
          <a href="mailto:hello@strategy.ai" style={{ color: "var(--acc)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            hello@strategy.ai
          </a>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor={`${pid}-name`} style={{ ...fieldLbl, marginTop: 0 }}>
          {t("contact_label_fullname", "Полное имя")}
        </label>
        <div className="sa-ws-contact-field-wrap" style={inpRow(rowFocus("name"))}>
          <FieldIconUser />
          <input
            id={`${pid}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder={t("contact_placeholder_name", "Как к вам обращаться")}
            style={inpBare}
            onFocus={() => setFocus("name")}
            onBlur={() => setFocus(null)}
          />
        </div>

        <label htmlFor={`${pid}-email`} style={{ ...fieldLbl, marginTop: 16 }}>
          {t("contact_label_email", "Email")}
        </label>
        <div style={inpRow(rowFocus("email"))}>
          <FieldIconMail />
          <input
            id={`${pid}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("contact_placeholder_email", "you@company.com")}
            style={inpBare}
            onFocus={() => setFocus("email")}
            onBlur={() => setFocus(null)}
          />
        </div>

        <label htmlFor={`${pid}-message`} style={{ ...fieldLbl, marginTop: 16 }}>
          {t("contact_label_message", "Сообщение")}
        </label>
        <textarea
          id={`${pid}-message`}
          name="message"
          rows={4}
          required
          className="sa-ws-contact-textarea"
          placeholder={t("contact_placeholder_msg", "Кратко опишите запрос")}
          style={textareaStyle(focus === "message")}
          onFocus={() => setFocus("message")}
          onBlur={() => setFocus(null)}
        />

        <button
          type="submit"
          className="modal-btn"
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 20,
            borderRadius: 9999,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.65 : 1,
            boxShadow: "0 6px 24px rgba(104,54,245,.5), 0 0 40px rgba(139,92,246,.25)",
          }}
        >
          {loading ? (
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,.35)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin .7s linear infinite",
              }}
            />
          ) : null}
          {loading ? t("contact_sending", "Отправка…") : t("send_btn", "Отправить")}
          {!loading ? <SubmitArrow /> : null}
        </button>
      </form>
    </div>
  );
}

/**
 * Отдельная страница: космический фон + карточка-форма (для демо / встраивания вне Welcome).
 */
export default function ContactFormCosmic({ eyebrow = "Напишите нам — ответим в течение рабочего дня", onSubmit }: ContactFormCosmicProps) {
  const { focus, setFocus, loading, handleSubmit } = useContactSubmitState(onSubmit);
  const rowFocus = (k: "name" | "email") => focus === k;

  return (
    <div
      className="sa-strategy-ui dk sa-contact-form-root"
      data-theme="dark"
      style={{
        position: "relative",
        minHeight: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px 48px",
        boxSizing: "border-box",
      }}
    >
      <StrategyShellBg />
      <div style={starLayer} aria-hidden />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {eyebrow ? (
          <p style={{ fontSize: 13, color: "var(--t3)", textAlign: "center", marginBottom: 16, lineHeight: 1.45, maxWidth: 360 }}>{eyebrow}</p>
        ) : null}

        <form
          className="modal-box"
          onSubmit={handleSubmit}
          style={{
            width: "min(440px, calc(100vw - 32px))",
            maxWidth: "100%",
            boxSizing: "border-box",
            opacity: 1,
            transform: "scale(1) translateY(0)",
            margin: 0,
            paddingTop: 26,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <p
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "6px 14px",
                borderRadius: 999,
                background: "linear-gradient(135deg, rgba(104,54,245,.25), rgba(160,80,255,.18))",
                color: "#c4b5fd",
                border: "0.5px solid rgba(139,92,246,.35)",
                marginBottom: 16,
              }}
            >
              Связаться с нами
            </p>
            <h1 className="modal-title" style={{ fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Давайте на связи
            </h1>
            <p style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.55, margin: 0 }}>
              Или напишите напрямую на{" "}
              <a href="mailto:hello@strategy.ai" style={{ color: "var(--acc, #a78bfa)", fontWeight: 600, textDecoration: "none" }}>
                hello@strategy.ai
              </a>
            </p>
          </div>

          <div className="modal-divider" style={{ margin: "12px 0 18px" }}>
            <span>форма обратной связи</span>
          </div>

          <label htmlFor="contact-name-page" style={{ ...fieldLbl, marginTop: 0 }}>
            Имя
          </label>
          <div style={inpRow(rowFocus("name"))}>
            <FieldIconUser />
            <input
              id="contact-name-page"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Как к вам обращаться"
              style={inpBare}
              onFocus={() => setFocus("name")}
              onBlur={() => setFocus(null)}
            />
          </div>

          <label className="modal-lbl" htmlFor="contact-email-page" style={{ ...fieldLbl, marginTop: 16 }}>
            Email
          </label>
          <div style={inpRow(rowFocus("email"))}>
            <FieldIconMail />
            <input
              id="contact-email-page"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              style={inpBare}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
            />
          </div>

          <label className="modal-lbl" htmlFor="contact-message-page" style={{ ...fieldLbl, marginTop: 16 }}>
            Сообщение
          </label>
          <textarea
            id="contact-message-page"
            name="message"
            rows={4}
            required
            placeholder="Кратко опишите запрос"
            style={textareaStyle(focus === "message")}
            onFocus={() => setFocus("message")}
            onBlur={() => setFocus(null)}
          />

          <button
            type="submit"
            className="modal-btn"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 20,
              borderRadius: 9999,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow: "0 6px 24px rgba(104,54,245,.5), 0 0 40px rgba(139,92,246,.25)",
            }}
          >
            {loading ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,.35)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin .7s linear infinite",
                }}
              />
            ) : null}
            {loading ? "Отправка…" : "Отправить"}
            {!loading ? <SubmitArrow /> : null}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "var(--t3)", textAlign: "center", marginTop: 20, maxWidth: 380, lineHeight: 1.5 }}>
          Нажимая «Отправить», вы соглашаетесь с обработкой данных для ответа на обращение.
        </p>
      </div>
    </div>
  );
}
