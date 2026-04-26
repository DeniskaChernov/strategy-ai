import React, { useEffect, useRef, useState } from "react";
import { useLang } from "../lang-context";
import { AuthFormContent } from "./auth-form-content";

export function AuthModal({
  initialTab = "login",
  onClose,
  onAuth,
  theme = "dark",
  title = "",
  subtitle = "",
}: {
  initialTab?: "login" | "register";
  onClose?: () => void;
  onAuth: (user: unknown, isNew: boolean) => void;
  theme?: string;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useLang();
  const [closing, setClosing] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const handleCloseRef = useRef<() => void>(() => {});
  const handleClose = () => {
    if (closing || !onClose) return;
    setClosing(true);
    setTimeout(() => onClose(), 220);
  };
  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    const root = boxRef.current;
    if (!root) return;
    const email = root.querySelector<HTMLInputElement>('input[type="email"]');
    const closeBtn = root.querySelector<HTMLButtonElement>(".modal-close");
    const target = email || closeBtn;
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }, []);

  const dk = theme === "dark" ? "dk" : "lt";
  return (
    <div className={`sa-strategy-ui ${dk} sa-modal-host`} data-theme={theme}>
      <div className={"overlay open" + (closing ? " sa-overlay-fade-out" : "")} style={{ zIndex: 1 }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div
          ref={boxRef}
          className={"modal-box" + (closing ? " sa-modal-shrink-out" : "")}
          style={{ width: "min(440px,calc(100vw - 32px))", maxWidth: "100%", boxSizing: "border-box", maxHeight: "88vh", overflowY: "auto", position: "relative", paddingTop: 26 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {onClose && (
            <button type="button" className="modal-close" onClick={handleClose} aria-label={t("close", "Закрыть")}>
              ×
            </button>
          )}
          <AuthFormContent initialTab={initialTab} onAuth={onAuth} theme={theme} title={title} subtitle={subtitle} variant="modal" />
        </div>
      </div>
    </div>
  );
}
