import React, { useState } from "react";

const STEPS: { title: string; body: string }[] = [
  { title: "Карта стратегии", body: "Шаги — это действия; связи показывают зависимости. Перетаскивайте фон, чтобы смотреть вокруг." },
  { title: "Добавление и связи", body: "Кнопка «Шаг» или двойной клик по пустому месту. Режим «Связать»: клик по источнику, затем по цели." },
  { title: "Панель шага", body: "Клик по узлу открывает описание, статус, прогресс и дедлайн. AI-подсказки доступны в боковой панели." },
  { title: "Готово", body: "Используйте симуляцию, Gantt и статистику в тулбаре, чтобы проверить логику плана." },
];

export function MapTour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i >= STEPS.length - 1;
  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay-bg,rgba(0,0,0,.72))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 320,
        padding: 16,
        backdropFilter: "blur(12px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onDone()}
    >
      <div
        className="glass-panel"
        style={{
          width: "min(96vw,400px)",
          borderRadius: 20,
          padding: "24px 26px",
          border: "1px solid var(--border)",
          background: "var(--glass-panel-bg,var(--bg2))",
          boxShadow: "var(--glass-shadow,0 24px 64px rgba(0,0,0,.45))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent-2)", marginBottom: 8 }}>🎯 Тур · {i + 1}/{STEPS.length}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>{STEPS[i].title}</div>
        <div style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.55, marginBottom: 22 }}>{STEPS[i].body}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-interactive"
            onClick={onDone}
            style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="btn-interactive"
            onClick={() => (last ? onDone() : setI((x) => x + 1))}
            style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "var(--gradient-accent)", color: "var(--accent-on-bg)", cursor: "pointer", fontWeight: 800, fontSize: 13 }}
          >
            {last ? "Закрыть" : "Далее"}
          </button>
        </div>
      </div>
    </div>
  );
}
