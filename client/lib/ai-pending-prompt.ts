/** Одноразовый перенос текста из плавающего AI в полноэкранный / боковой AiPanel */
const KEY = "sa_ai_pending_prompt";

export function setPendingAiPrompt(text: string): void {
  if (typeof window === "undefined") return;
  try {
    const s = text.trim();
    if (!s) return;
    sessionStorage.setItem(KEY, s.slice(0, 4000));
  } catch {
    /* ignore quota */
  }
}

/** Прочитать и удалить (чтобы не подставлять повторно) */
export function consumePendingAiPrompt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem(KEY);
    if (!s) return null;
    sessionStorage.removeItem(KEY);
    return s;
  } catch {
    return null;
  }
}
