import React, { useState, useEffect, useRef } from "react";
import { parseMarketingPath } from "../spa-path";
import { SplashLoaderScreen } from "../splash-loader";
import { useLang } from "../lang-context";


export function SplashScreen({onDone,theme,authReady=false}){
  const{t}=useLang();
  const[pct,setPct]=useState(0);
  const readyRef=useRef(false);
  useEffect(()=>{
    if(pct>=100&&authReady&&!readyRef.current){readyRef.current=true;setTimeout(onDone,150);}
  },[pct,authReady,onDone]);
  useEffect(()=>{
    let iv: ReturnType<typeof setInterval> | null = null;
    const tid = setTimeout(() => {
      let p = 0;
      iv = setInterval(() => {
        p += Math.random() * 18 + 8;
        setPct(Math.min(100, Math.round(p)));
      }, 100);
    }, 300);
    return () => {
      clearTimeout(tid);
      if (iv) clearInterval(iv);
    };
  },[]);
  const th=theme==="dark"?"dark":"light";
  const letterText=t("splash_loader_text","Loading");
  const brandLabel=t("splash_brand_name","Strategy AI");
  return(
    <SplashLoaderScreen theme={th} text={letterText} progressPct={pct} brandLabel={brandLabel} />
  );
}
export function initialMarketingScreen(): string {
  if (typeof window === "undefined") return "splash";
  const mp = parseMarketingPath(window.location.pathname);
  if (mp.type === "privacy" || mp.type === "terms") return "legal";
  if (mp.type === "notFound") return "notFound";
  return "splash";
}

export function initialLegalKind(): "privacy" | "terms" | null {
  if (typeof window === "undefined") return null;
  const mp = parseMarketingPath(window.location.pathname);
  if (mp.type === "privacy") return "privacy";
  if (mp.type === "terms") return "terms";
  return null;
}
