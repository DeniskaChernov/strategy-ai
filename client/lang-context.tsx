import React, { createContext, useContext } from "react";

export type LangApi = {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string, fallback?: string) => string;
};

export const LangCtx = createContext<LangApi | null>(null);

export function useLang(): LangApi {
  const v = useContext(LangCtx);
  if (!v) throw new Error("useLang must be used within LangCtx.Provider");
  return v;
}
