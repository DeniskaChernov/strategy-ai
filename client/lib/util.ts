/** Размеры узла на канве (синхронно с визуальным редактором). */
export const NW = 240;
export const NH = 128;

export const fmt = (n: number) => (n >= 999 ? '∞' : String(n));
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2, 9);
export const snap = (v: number) => Math.round(v / 20) * 20;
