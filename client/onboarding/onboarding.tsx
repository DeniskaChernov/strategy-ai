import React, { useState, useRef, useEffect } from "react";
import { useLang } from "../lang-context";
import { callAI } from "../lib/call-ai";
import { OB_TIER, MAP_TIER } from "../lib/ai-prompts";
import { defaultNodes } from "../lib/map-utils";

/**
 * AI-онбординг для свежего проекта: краткое интервью (до 6 вопросов),
 * после чего собираем стратегическую карту через `MAP_TIER.free`.
 *
 * Поведение:
 *  - сразу задаёт первый вопрос
 *  - после 6-го вопроса (или ответа AI "READY") строит карту
 *  - при ошибке генерации показывает «Повторить» / «Использовать шаблон»
 *
 * Доступность/UX:
 *  - autofocus на input после готовности AI
 *  - prefers-reduced-motion: scroll без smooth
 */
export type OnboardingResult = {
  nodes: any[];
  edges: any[];
  ctx: string;
};

interface OnboardingProps {
  onDone: (result: OnboardingResult) => void;
  onBack: () => void;
  theme?: string;
}

export function Onboarding({ onDone, onBack, theme = "dark" }: OnboardingProps) {
  const { t } = useLang();
  const MAX_Q = 6;
  const [msgs, setMsgs] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mapGenFailed, setMapGenFailed] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [qCount, setQCount] = useState(0);
  const [lastAiQuestion, setLastAiQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    askNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [msgs, loading]);
  useEffect(() => {
    if (!loading && !generating) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [loading, generating]);

  async function askNext(hist: { role: string; content: string }[]) {
    setLoading(true);
    try {
      const reply = await callAI(
        hist.length === 0 ? [{ role: "user", content: "Начни интервью — задай первый вопрос." }] : hist,
        OB_TIER.free(""),
        300,
      );
      if (reply.trim() === "READY" || hist.length >= MAX_Q * 2) {
        await buildMap(hist);
      } else {
        const txt = reply.trim();
        setLastAiQuestion(txt);
        setMsgs((m) => [...m, { role: "ai", text: txt }]);
        setQCount((q) => q + 1);
        setLoading(false);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: t("ai_network_err", "Не удалось получить ответ AI. Проверьте сеть и ключ API. Попробуйте ещё раз."),
        },
      ]);
      setLoading(false);
    }
  }
  async function submit() {
    if (!inp.trim() || loading || generating) return;
    const text = inp.trim();
    setInp("");
    const newMsgs = [...msgs, { role: "user" as const, text }];
    setMsgs(newMsgs);
    const newHist = [
      ...history,
      { role: "assistant", content: lastAiQuestion },
      { role: "user", content: text },
    ].filter((h) => h.content);
    setHistory(newHist);
    if (qCount >= MAX_Q) {
      await buildMap(newHist);
    } else {
      await askNext(newHist);
    }
  }
  const defaultEdges = [
    { id: "e1", source: "n1", target: "n2", type: "requires", label: "" },
    { id: "e2", source: "n2", target: "n4", type: "requires", label: "" },
    { id: "e3", source: "n3", target: "n4", type: "affects", label: "" },
  ];
  async function buildMap(hist: { role: string; content: string }[]) {
    setGenerating(true);
    setMapGenFailed(false);
    setMsgs((m) => [
      ...m,
      { role: "ai", text: t("analyzing_answers", "Анализирую ваши ответы и строю персональную карту…") },
    ]);
    const ctx = hist
      .filter((h) => h.content)
      .map((h) => (h.role === "user" ? "Пользователь: " : "AI: ") + h.content)
      .join("\n");
    try {
      const raw = await callAI(
        [{ role: "user", content: "Интервью:\n" + ctx + "\n\nСоздай стратегическую карту." }],
        MAP_TIER.free,
        1500,
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const fallback = clean.match(/\{[\s\S]*\}/);
      const data = JSON.parse(fallback ? fallback[0] : clean);
      onDone({ nodes: data.nodes || [], edges: data.edges || [], ctx });
    } catch {
      setMapGenFailed(true);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: t("ai_map_fallback", "AI не удалось создать карту. Нажмите «Повторить» или «Использовать шаблон»."),
        },
      ]);
    } finally {
      setGenerating(false);
    }
  }
  function useFallbackTemplate() {
    setMapGenFailed(false);
    const ctxFromHist = history
      .filter((h) => h.content)
      .map((h) => (h.role === "user" ? "Пользователь: " : "AI: ") + h.content)
      .join("\n");
    onDone({ nodes: defaultNodes(), edges: defaultEdges, ctx: ctxFromHist || "" });
  }
  const progress = Math.min(100, Math.round((qCount / MAX_Q) * 100));
  return (
    <div
      data-theme={theme}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        height: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter',system-ui,sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 50% 0%,var(--accent-glow) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "5px 12px",
            borderRadius: "var(--radius-sm,8px)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text3)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t("back_btn", "← Назад")}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {t("ai_interview", "AI-интервью")} · {qCount}/{MAX_Q} {t("questions_short", "вопросов")}
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "var(--surface2)",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              style={{
                height: "100%",
                width: progress + "%",
                background: "var(--gradient-accent)",
                borderRadius: 2,
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowAnchor: "auto" as any,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          scrollPaddingBottom: 80,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              gap: 10,
            }}
          >
            {m.role === "ai" && (
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm,8px)",
                  background: "var(--gradient-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                ✦
              </div>
            )}
            <div
              style={{
                maxWidth: "80%",
                padding: "11px 15px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                background: m.role === "user" ? "var(--accent-soft)" : "var(--surface)",
                border: `1px solid ${m.role === "user" ? "var(--accent-1)" : "var(--border)"}`,
                fontSize: 13.5,
                lineHeight: 1.65,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {(loading || generating) && (
          <div
            style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 42 }}
            role="status"
            aria-live="polite"
            aria-label={generating ? t("analyzing_map", "Анализирую карту…") : t("loading_short", "Загрузка…")}
          >
            <div
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-sm,8px)",
                background: "var(--gradient-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              ✦
            </div>
            <div
              style={{
                display: "flex",
                gap: 5,
                padding: "11px 15px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "4px 14px 14px 14px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent-1)",
                    animation: `thinkDot 1.4s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {mapGenFailed && (
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
            maxWidth: 720,
            margin: "0 auto",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMapGenFailed(false);
              buildMap(history);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--radius-sm,10px)",
              border: "1px solid var(--accent-1)",
              background: "var(--accent-soft)",
              color: "var(--accent-2)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("retry", "Повторить")}
          </button>
          <button
            type="button"
            onClick={useFallbackTemplate}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--radius-sm,10px)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text3)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("use_template", "Использовать шаблон")}
          </button>
        </div>
      )}
      {!generating && !mapGenFailed && (
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
            maxWidth: 720,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <input
            ref={inputRef}
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-label={t("your_answer_aria", "Ваш ответ AI-интервьюеру")}
            placeholder={
              qCount >= MAX_Q
                ? t("press_enter_to_generate", "Нажмите Enter для генерации карты…")
                : t("your_answer_ph", "Ваш ответ…")
            }
            style={{
              flex: 1,
              padding: "11px 16px",
              fontSize: 14,
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderRadius: "var(--radius-md,12px)",
              color: "var(--text)",
              outline: "none",
              fontFamily: "'Inter',system-ui,sans-serif",
            }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!inp.trim() || loading}
            style={{
              padding: "11px 22px",
              borderRadius: "var(--radius-md,12px)",
              border: "none",
              background: inp.trim() && !loading ? "var(--gradient-accent)" : "var(--surface)",
              color: inp.trim() && !loading ? "var(--accent-on-bg)" : "var(--text4)",
              fontSize: 14,
              fontWeight: 700,
              cursor: inp.trim() && !loading ? "pointer" : "not-allowed",
              transition: "all .15s",
            }}
          >
            {qCount >= MAX_Q ? t("create_map_btn2", "Создать карту ✦") : t("answer_btn", "Ответить →")}
          </button>
        </div>
      )}
    </div>
  );
}
