import React, { useEffect, useRef, useState } from "react";
import { setPendingAiPrompt } from "./lib/ai-pending-prompt";

type TFn = (key: string, fallback?: string) => string;

const Ic = {
  bot: (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 8V4H8" />
      <rect width={16} height={12} x={4} y={8} rx={2} />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  ),
  x: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  xSm: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  paperclip: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.38-8.38A4 4 0 1 1 18 12l-8.38 8.38a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  link: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  code: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  ),
  mic: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1={12} x2={12} y1={19} y2={22} />
    </svg>
  ),
  send: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
  info: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  figma: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.015-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117v-6.038H8.148zm7.704 0c-2.476 0-4.49 2.015-4.49 4.49s2.014 4.49 4.49 4.49 4.49-2.015 4.49-4.49-2.014-4.49-4.49-4.49zm0 7.509c-1.665 0-3.019-1.355-3.019-3.019s1.355-3.019 3.019-3.019 3.019 1.354 3.019 3.019-1.354 3.019-3.019 3.019zM8.148 24c-2.476 0-4.49-2.015-4.49-4.49s2.014-4.49 4.49-4.49h4.588V24H8.148zm3.117-1.471V16.49H8.148c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.02 3.019 3.02h3.117z" />
    </svg>
  ),
};

export function FloatingAiAssistant({
  t,
  onCta,
  variant = "landing",
  onOpenFullChat,
}: {
  t: TFn;
  /** Лендинг: при отправке непустого сообщения (например открыть регистрацию) */
  onCta?: () => void;
  /** landing — демо-виджет; app — открывает полный чат приложения */
  variant?: "landing" | "app";
  /** Режим app: открыть единый AI-чат (модалка / панель карты) */
  onOpenFullChat?: () => void;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const maxChars = 2000;
  const rootRef = useRef<HTMLDivElement>(null);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    if (v.length <= maxChars) {
      setMessage(v);
      setCharCount(v.length);
    }
  }

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (variant === "app") {
      setPendingAiPrompt(trimmed);
      onOpenFullChat?.();
      setIsChatOpen(false);
      setMessage("");
      setCharCount(0);
      return;
    }
    if (onCta) onCta();
    setMessage("");
    setCharCount(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setIsChatOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={"sa-fai-root" + (variant === "app" ? " sa-fai-root--app" : "")}>
      <button
        type="button"
        className={"sa-fai-toggle" + (isChatOpen ? " is-open" : "")}
        onClick={() => setIsChatOpen((o) => !o)}
        aria-expanded={isChatOpen}
        aria-controls="sa-fai-panel"
        title={t("fai_toggle_aria", "AI-помощник")}
      >
        <span className="sa-fai-toggle-shine" aria-hidden />
        <span className="sa-fai-toggle-ring" aria-hidden />
        <span className="sa-fai-toggle-ping" aria-hidden />
        <span className="sa-fai-toggle-ic">{isChatOpen ? Ic.x : Ic.bot}</span>
      </button>

      {isChatOpen && (
        <div
          id="sa-fai-panel"
          className="sa-fai-panel-wrap"
          role="dialog"
          aria-modal="false"
          aria-label={t("fai_title", "AI Assistant")}
        >
          <div className="sa-fai-panel">
            <div className="sa-fai-head">
              <div className="sa-fai-head-left">
                <span className="sa-fai-dot" aria-hidden />
                <span className="sa-fai-head-title">
                  {variant === "app" ? t("fai_app_title", "AI — быстрый доступ") : t("fai_title", "AI Assistant")}
                </span>
              </div>
              <div className="sa-fai-head-right">
                <span className="sa-fai-chip sa-fai-chip--muted">{t("fai_model", "GPT-4")}</span>
                <span className="sa-fai-chip sa-fai-chip--pro">{t("fai_pro", "Pro")}</span>
                <button type="button" className="sa-fai-close" onClick={() => setIsChatOpen(false)} aria-label={t("close")}>
                  {Ic.xSm}
                </button>
              </div>
            </div>
            {variant === "app" && onOpenFullChat && (
              <div className="sa-fai-head-cta">
                <button
                  type="button"
                  className="sa-fai-open-full"
                  onClick={() => {
                    const v = message.trim();
                    if (v) setPendingAiPrompt(v);
                    onOpenFullChat();
                    setIsChatOpen(false);
                  }}
                >
                  {t("fai_open_full_chat", "Полный AI-чат")}
                </button>
              </div>
            )}

            <div className="sa-fai-input-wrap">
              <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={4}
                className="sa-fai-textarea"
                placeholder={t(
                  variant === "app" ? "fai_placeholder_app" : "fai_placeholder",
                  variant === "app"
                    ? "Короткий запрос — откроется полный чат с вашими картами и историей…"
                    : "Что хотите разобрать? Задайте вопрос, опишите идею или попросите помощь…"
                )}
                maxLength={maxChars}
              />
              <div className="sa-fai-input-fade" aria-hidden />
            </div>

            <div className="sa-fai-controls">
              <div className="sa-fai-controls-row">
                <div className="sa-fai-toolbar">
                  <div className="sa-fai-attach" role="group" aria-label={t("fai_attach_group", "Вложения")}>
                    <button type="button" className="sa-fai-tool" title={t("fai_tip_upload", "Загрузить файлы")}>
                      {Ic.paperclip}
                    </button>
                    <button type="button" className="sa-fai-tool" title={t("fai_tip_link", "Ссылка")}>
                      {Ic.link}
                    </button>
                    <button type="button" className="sa-fai-tool" title={t("fai_tip_code", "Код / репозиторий")}>
                      {Ic.code}
                    </button>
                    <button type="button" className="sa-fai-tool" title={t("fai_tip_design", "Макет")}>
                      {Ic.figma}
                    </button>
                  </div>
                  <button type="button" className="sa-fai-tool sa-fai-tool--solo" title={t("fai_tip_voice", "Голосовой ввод")}>
                    {Ic.mic}
                  </button>
                </div>
                <div className="sa-fai-sendrow">
                  <div className="sa-fai-count" aria-live="polite">
                    <span>{charCount}</span>/<span>{maxChars}</span>
                  </div>
                  <button type="button" className="sa-fai-send" onClick={handleSend} aria-label={t("fai_send_aria", "Отправить")}>
                    {Ic.send}
                  </button>
                </div>
              </div>

              <div className="sa-fai-foot">
                <div className="sa-fai-foot-hint">
                  {Ic.info}
                  <span>
                    {variant === "app"
                      ? t("fai_app_footer", "Откроется единый чат с историей и контекстом карт.")
                      : t("fai_footer_hint", "Новая строка: Shift + Enter")}
                  </span>
                </div>
                <div className="sa-fai-foot-ok">
                  <span className="sa-fai-dot sa-fai-dot--sm" aria-hidden />
                  {t("fai_footer_ok", "Все системы в норме")}
                </div>
              </div>
            </div>

            <div className="sa-fai-panel-glow" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
