import { LANGS } from './langs';

export function makeTfn(lang: string) {
  const L = LANGS as Record<string, Record<string, string>>;
  const d = L[lang] || LANGS.ru;
  return (key: string, fallback?: string) =>
    d[key] !== undefined ? d[key] : fallback !== undefined ? fallback : key;
}
