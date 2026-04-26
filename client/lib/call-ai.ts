import { apiFetch } from "../api";

export async function callAI(
  messages: { role: string; content: string }[],
  system: string,
  maxTokens = 1200
): Promise<string> {
  const res = await apiFetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, maxTokens }),
  });
  const text = res?.content?.[0]?.text;
  if (typeof text === "string" && text.length) return text;
  if (res?.error) throw new Error(String(res.error));
  return "";
}
