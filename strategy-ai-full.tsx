import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { io as ioClient } from "socket.io-client";
import pptxgen from "pptxgenjs";
import { NW, NH, fmt, sleep, uid, snap } from "./client/lib/util";
import { consumePendingAiPrompt } from "./client/lib/ai-pending-prompt";
import {
  API_BASE,
  apiFetch,
  store,
  refreshUserAfterPayment,
  getJWT,
  clearJWT,
  clearRefreshToken,
  getSession,
  setSession,
  clearSession,
  seedDefault,
  normalizeUser,
  register,
  login,
  patchUser,
  hashPw,
  normalizeProject,
  getProjects,
  saveProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
  getNotifications,
  readAllNotifications,
  readNotification,
  deleteNotification,
} from "./client/api";
import { makeTfn } from "./client/i18n/makeTfn";
import { StrategyShellSidebar, StrategyShellBg, type StrategyShellNav } from "./strategy-shell-sidebar";
const ReferenceLandingView = React.lazy(() =>
  import("./reference-landing").then((m) => ({ default: m.ReferenceLandingView }))
);
import { GlowCard } from "./client/glow-card";
import { FloatingAiAssistant } from "./client/floating-ai-assistant";
import { SplashLoaderScreen } from "./client/splash-loader";
import { GlassCalendar, dateToYMD } from "./client/glass-calendar";
import { parseMarketingPath } from "./client/spa-path";
import { applySeoForAppScreen } from "./client/seo-head";
import { LegalDocumentPage, NotFoundPage } from "./client/legal-pages";
import { initAnalyticsAfterConsent, bootstrapAnalyticsIfConsented, trackSaEvent } from "./client/analytics";
import {
  UUID_RE,
  isUUID,
  normalizeMap,
  edgePt,
  defaultNodes,
  topSort,
  simNode,
  type SimNodeResult,
} from "./client/lib/map-utils";
import { getMaps, saveMap, deleteMap, getContentPlan, saveContentPlan } from "./client/lib/maps-api";
import { AI_KNOWLEDGE, AI_STRICT_RULES, AI_TIER, OB_TIER, MAP_TIER } from "./client/lib/ai-prompts";
import { TEMPLATES } from "./client/lib/templates";

const TIERS={
  free:    {label:"Free",    price:"Бесплатно",  color:"#9088b0",badge:"⬡", projects:1,  users:1,  maps:1,  scenarios:0,  templates:false,contentPlan:false,ai:"basic",   clone:false,wl:false,api:false,report:false,pptx:false,desc:"Для знакомства"},
  starter: {label:"Starter", price:"$9/мес",    color:"#12c482",badge:"◈", projects:3,  users:1,  maps:3,  scenarios:2,  templates:false,contentPlan:false,ai:"starter", clone:false,wl:false,api:false,report:false,pptx:false,desc:"Для старта"},
  pro:     {label:"Pro",     price:"$29/мес",   color:"#a050ff",badge:"◆", projects:10, users:3,  maps:5,  scenarios:5,  templates:false,contentPlan:true, ai:"advanced",clone:true, wl:false,api:false,report:false,pptx:false,desc:"Для профессионалов"},
  team:    {label:"Team",    price:"$59/мес",   color:"#f09428",badge:"✦", projects:25, users:10, maps:15, scenarios:15, templates:true, contentPlan:true, ai:"full",    clone:true, wl:false,api:false,report:false,pptx:false,desc:"Для команд"},
  enterprise:{label:"Enterprise",price:"$149+/мес",color:"#06b6d4",badge:"💎",projects:999,users:999,maps:999,scenarios:999,templates:true,contentPlan:true,ai:"priority",clone:true,wl:true,api:true,report:true,pptx:true,desc:"Для топ-команд"},
};
const ROLES_C  ={owner:"#6836f5",editor:"#12c482",viewer:"#a8a4c8"};
const STATUS  ={planning:{c:"#6836f5"},active:{c:"#06b6d4"},completed:{c:"#12c482"},paused:{c:"#f09428"},blocked:{c:"#f04458"}};
const PRIORITY={low:{c:"#6c6480"},medium:{c:"#f09428"},high:{c:"#ea580c"},critical:{c:"#f04458"}};
const ETYPE_C ={requires:{c:"#6836f5",d:"none"},affects:{c:"#a050ff",d:"8,4"},blocks:{c:"#f04458",d:"4,3"},follows:{c:"#12c482",d:"12,4"}};
const getROLES=(t)=>({owner:t("role_owner","Владелец"),editor:t("role_editor","Редактор"),viewer:t("role_viewer","Зритель")});
const getSTATUS=(t)=>({planning:{c:"#6836f5",label:t("status_planning","Планирование")},active:{c:"#06b6d4",label:t("status_active","В работе")},completed:{c:"#12c482",label:t("completed","Выполнено")},paused:{c:"#f09428",label:t("status_paused","На паузе")},blocked:{c:"#f04458",label:t("status_blocked","Заблокировано")}});
const getPRIORITY=(t)=>({low:{c:"#6c6480",label:t("priority_low","Низкий")},medium:{c:"#f09428",label:t("priority_medium","Средний")},high:{c:"#ea580c",label:t("priority_high","Высокий")},critical:{c:"#f04458",label:t("priority_critical","Критично")}});
const getSTATUSES=(t)=>[{v:"planning",label:"📋 "+t("status_planning","Планирование")},{v:"active",label:"⚡ "+t("status_active","В работе")},{v:"completed",label:"✅ "+t("completed","Выполнено")},{v:"paused",label:"⏸ "+t("status_paused","На паузе")},{v:"blocked",label:"🔒 "+t("status_blocked","Заблокировано")}];
const getPRIORITIES=(t)=>[{v:"low",label:"🟢 "+t("priority_low","Низкий")},{v:"medium",label:"🟡 "+t("priority_medium","Средний")},{v:"high",label:"🟠 "+t("priority_high","Высокий")},{v:"critical",label:"🔴 "+t("priority_critical","Критично")}];
const getETYPE=(t)=>({requires:{c:"#6836f5",label:t("etype_requires","Требует"),d:"none"},affects:{c:"#a050ff",label:t("etype_affects","Влияет"),d:"8,4"},blocks:{c:"#f04458",label:t("etype_blocks","Блокирует"),d:"4,3"},follows:{c:"#12c482",label:t("etype_follows","Следует"),d:"12,4"}});
const getTierPrice=(k,t)=>{const prices={free:t("free_plan","Бесплатно"),starter:"$9"+t("per_month_short","/мес"),pro:"$29"+t("per_month_short","/мес"),team:"$59"+t("per_month_short","/мес"),enterprise:"$149+"+t("per_month_short","/мес")};return prices[k]||"";};

const {createContext,useContext}=React;
type LangValue = { lang: string; setLang: (code: string) => void; t: (k: string, fb?: string) => string };
const LangCtx = createContext<LangValue>({
  lang: "ru",
  setLang: () => {},
  t: (k, fb) => fb || k,
});
const useLang=()=>useContext(LangCtx);
const useIsMobile=()=>{const[m,setM]=useState(()=>window.innerWidth<=640);useEffect(()=>{const h=()=>setM(window.innerWidth<=640);window.addEventListener("resize",h,{passive:true});return()=>window.removeEventListener("resize",h);},[]);return m;};

// ── useNotifications: единый хук загрузки уведомлений ──
// Вызов: const {notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs);
// Полит/опрос каждые 30с, пока открыта шторка уведомлений; один начальный fetch при монтировании.
function useNotifications(pollWhenOpen:boolean, userEmail?:string){
  const[notifs,setNotifs]=useState<any[]>([]);
  const[notifUnread,setNotifUnread]=useState(0);
  const[notifLoading,setNotifLoading]=useState(false);
  const loadNotifications=React.useCallback(async()=>{
    if(!API_BASE)return;
    if(userEmail!==undefined && !userEmail)return;
    setNotifLoading(true);
    try{
      const d=await getNotifications();
      setNotifs(Array.isArray(d?.notifications)?d.notifications:[]);
      setNotifUnread(Number(d?.unread||0));
    }catch{}
    setNotifLoading(false);
  },[userEmail]);
  useEffect(()=>{loadNotifications();},[loadNotifications]);
  useEffect(()=>{
    if(!pollWhenOpen)return;
    loadNotifications();
    const id=setInterval(()=>loadNotifications(),30000);
    return()=>clearInterval(id);
  },[pollWhenOpen,loadNotifications]);
  return{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications};
}

// ── IconButton: круглая 32×32 кнопка в стиле .btn-g для тулбаров и иконочных действий ──
type IconButtonProps=React.ButtonHTMLAttributes<HTMLButtonElement>&{active?:boolean;danger?:boolean;size?:number};
const IconButton=React.forwardRef<HTMLButtonElement,IconButtonProps>(function IconButton({active=false,danger=false,size=32,className="",style,children,...rest},ref){
  const cls="sa-ic-btn btn-interactive"+(active?" on":"")+(danger?" danger":"")+(className?" "+className:"");
  return(
    <button ref={ref} type="button" className={cls} {...rest}
      style={{width:size,height:size,borderRadius:10,display:"inline-flex",alignItems:"center",justifyContent:"center",border:".5px solid var(--b1)",background:active?"var(--card2)":"var(--inp)",color:danger?"var(--red)":active?"var(--t1)":"var(--t2)",cursor:"pointer",fontFamily:"inherit",fontSize:14,lineHeight:1,padding:0,transition:"all .22s cubic-bezier(.34,1.56,.64,1)",...style}}>
      {children}
    </button>
  );
});

// ── CustomSelect ──
function CustomSelect({value,onChange,options,style={},disabled=false}){
  const{t}=useLang();
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  const sel=options.find(o=>o.value===value)||options[0];
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  return(
    <div ref={ref} style={{position:"relative",display:"inline-block",...style}}>
      <button
        disabled={disabled}
        onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}
        style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",cursor:disabled?"not-allowed":"pointer",fontSize:13.5,fontWeight:600,fontFamily:"'Inter',system-ui,sans-serif",whiteSpace:"nowrap",width:"100%",minWidth:100,justifyContent:"space-between",transition:"all .15s",opacity:disabled?.5:1}}
        onMouseOver={e=>{if(!disabled)e.currentTarget.style.background="var(--surface2)";}}
        onMouseOut={e=>{e.currentTarget.style.background="var(--surface)";}}>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {sel?.dot&&<span style={{width:8,height:8,borderRadius:"50%",background:sel.dot,flexShrink:0,display:"inline-block"}}/>}
          {sel?.icon&&<span style={{fontSize:13}}>{sel.icon}</span>}
          {sel?.label||value}
        </span>
        <span style={{fontSize:12,color:"var(--text4)",marginLeft:4,transform:open?"rotate(180deg)":"none",transition:"transform .15s"}}>▼</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:"100%",background:"var(--surface)",border:"1px solid var(--accent-1)",borderRadius:11,boxShadow:"var(--shadow,0 16px 48px rgba(0,0,0,.8))",zIndex:9999,overflow:"hidden",animation:"slideDown .12s ease"}}>
          {options.map(o=>{
            const isSel=o.value===value;
            return(
              <div key={o.value} onClick={e=>{e.stopPropagation();onChange(o.value);setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",cursor:"pointer",background:isSel?"var(--accent-soft)":"transparent",color:isSel?"var(--accent-1)":"var(--text)",fontSize:13,fontWeight:isSel?700:500,fontFamily:"'Inter',system-ui,sans-serif",transition:"background .1s",whiteSpace:"nowrap"}}
                onMouseOver={e=>{if(!isSel)e.currentTarget.style.background="var(--surface)";}}
                onMouseOut={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
                {o.dot&&<span style={{width:9,height:9,borderRadius:"50%",background:o.dot,flexShrink:0}}/>}
                {o.icon&&<span style={{fontSize:14}}>{o.icon}</span>}
                <span>{o.label}</span>
                {isSel&&<span style={{marginLeft:"auto",color:"var(--accent-1)",fontSize:13}}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// utils карты и сетевой слой — см. client/lib/map-utils.ts и client/lib/maps-api.ts
async function callAI(messages:any[],system:string,maxTokens=1200):Promise<string>{
  // Если бэкенд настроен — вызываем через него (там ключ, лимиты, модель)
  if(API_BASE){
    try{
      const d=await apiFetch("/api/ai/chat",{
        method:"POST",
        body:JSON.stringify({messages,system,maxTokens}),
      });
      return d.content?.[0]?.text||"";
    }catch(e:any){
      throw new Error(e.message||"Ошибка AI сервиса");
    }
  }
  // Fallback: прямой вызов OpenAI (только для локальной разработки без бэкенда)
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),45000);
  const apiKey=(typeof window!=="undefined"&&(window as any).__STRATEGY_AI_OPENAI_KEY__)||"";
  try{
    if(!apiKey)throw new Error("Не настроен API-ключ. Установите переменную OPENAI_KEY на сервере (Railway Variables) или window.__STRATEGY_AI_OPENAI_KEY__ для локальной разработки.");
    const openaiMessages=[
      {role:"system",content:system||"Отвечай по-русски."},
      ...messages.map((m:any)=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content)})),
    ];
    const r=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",signal:controller.signal,
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({model:"gpt-4o-mini",max_tokens:maxTokens,messages:openaiMessages,temperature:0.7})
    });
    clearTimeout(timeout);
    if(r.status===401)throw new Error("Неверный OpenAI API-ключ.");
    if(r.status===429)throw new Error("Превышен лимит OpenAI. Попробуйте позже.");
    if(!r.ok){const errBody=await r.json().catch(()=>({}));throw new Error(errBody?.error?.message||`API error ${r.status}`);}
    const d=await r.json();
    return d.choices?.[0]?.message?.content||"";
  }catch(e:any){
    clearTimeout(timeout);
    if(e.name==="AbortError")throw new Error("Превышено время ожидания — попробуйте ещё раз");
    throw e;
  }
}


// AI-промпты, база знаний и готовые шаблоны — см. client/lib/ai-prompts.ts и client/lib/templates.ts

// ── OfflineBanner ──
function OfflineBanner(){
  const[online,setOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
  useEffect(()=>{
    const on=()=>setOnline(true);
    const off=()=>setOnline(false);
    window.addEventListener("online",on);
    window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  if(online)return null;
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:10000,background:"linear-gradient(135deg,#f04458,#dc2626)",color:"#fff",padding:"10px 20px",fontSize:13,fontWeight:700,textAlign:"center",boxShadow:"0 4px 20px rgba(239,68,68,.4)",animation:"slideDown .2s ease"}}>
      📴 {typeof navigator!=="undefined"&&navigator.language?.startsWith("ru")?"Нет соединения. Проверьте интернет.":"No connection. Check your internet."}
    </div>
  );
}

// ── Toast ──
function Toast({msg,type="info",onClose,action=undefined,onAction=undefined}){
  const[progress,setProgress]=useState(100);
  const[closing,setClosing]=useState(false);
  const DURATION=4000;
  const onCloseRef=useRef(onClose);
  const closingRef=useRef(false);
  onCloseRef.current=onClose;
  useEffect(()=>{
    const start=Date.now();
    let rafId=0;
    const tick=()=>{
      if(closingRef.current)return;
      const elapsed=Date.now()-start;
      const pct=Math.max(0,100-(elapsed/DURATION*100));
      setProgress(pct);
      if(pct<=0){
        closingRef.current=true;
        setClosing(true);
        setTimeout(()=>onCloseRef.current?.(),260);
        return;
      }
      rafId=requestAnimationFrame(tick);
    };
    rafId=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafId);
  },[]);
  function handleClose(){
    if(closingRef.current)return;
    closingRef.current=true;
    setClosing(true);
    setTimeout(()=>onClose?.(),260);
  }
  const C={info:"var(--accent-1)",error:"#f04458",success:"#12c482",warn:"#f09428"};
  const icons={error:"⚠",success:"✓",warn:"⚡",info:"ℹ"};
  const borderCol=type==="info"?"var(--accent-soft)":type==="error"?"rgba(239,68,68,.33)":type==="success"?"rgba(16,185,129,.33)":"rgba(245,158,11,.33)";
  return(
    <div className={closing?"toast-out":"toast-in"} style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,borderRadius:12,background:"var(--bg3)",border:`1px solid ${borderCol}`,color:"var(--text)",fontSize:13,fontWeight:500,boxShadow:"var(--shadow-lg)",maxWidth:480,backdropFilter:"blur(14px)",overflow:"hidden",transition:"opacity .2s ease"}}
      onClick={handleClose}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer"}}>
        <span style={{color:type==="info"?"var(--accent-1)":C[type],fontSize:14,flexShrink:0}}>{icons[type]}</span>
        <span style={{flex:1}}>{msg}</span>
        {action&&onAction&&(
          <button onClick={e=>{e.stopPropagation();onAction();handleClose();}}
            style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${borderCol}`,background:type==="info"?"var(--accent-soft)":`${C[type]}15`,color:type==="info"?"var(--accent-1)":C[type],fontSize:13,cursor:"pointer",fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>
            {action}
          </button>
        )}
        <button onClick={e=>{e.stopPropagation();handleClose();}} style={{color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
      </div>
      <div style={{height:2,background:type==="info"?"var(--accent-soft)":`${C[type]}20`}}>
        <div style={{width:`${progress}%`,height:"100%",background:type==="info"?"var(--accent-1)":C[type],transition:"width .1s linear",opacity:.7}}/>
      </div>
    </div>
  );
}

// ── ConfirmDialog ──
function ConfirmDialog({title,message,confirmLabel="Удалить",onConfirm,onCancel,danger=true}){
  const{t}=useLang();
  const isMobile=useIsMobile();
  const[closing,setClosing]=useState(false);
  const onCancelRef=useRef(onCancel);
  const onConfirmRef=useRef(onConfirm);
  onCancelRef.current=onCancel;
  onConfirmRef.current=onConfirm;
  const handleCancel=()=>{if(closing)return;setClosing(true);setTimeout(()=>onCancelRef.current?.(),220);};
  const handleConfirm=()=>{if(closing)return;setClosing(true);setTimeout(()=>onConfirmRef.current?.(),220);};
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==="Escape")handleCancel();if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))handleConfirm();};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);
  return(
    <div className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.75))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:9000,backdropFilter:"blur(12px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleCancel();}}>
      <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{width:isMobile?"100%":"min(95vw,360px)",borderRadius:isMobile?"18px 18px 0 0":20,border:danger?"1px solid rgba(239,68,68,.35)":undefined,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"26px 24px 20px",textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:15,background:danger?"rgba(239,68,68,.15)":"var(--accent-soft)",border:`1.5px solid ${danger?"rgba(239,68,68,.4)":"var(--accent-1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 16px"}}>
            {danger?"🗑":"⚡"}
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"var(--text)",letterSpacing:-.3,marginBottom:10}}>{title}</div>
          <div style={{fontSize:13,color:"var(--text3)",lineHeight:1.65,marginBottom:24}}>{message}</div>
        </div>
        <div style={{display:"flex",gap:10,padding:"0 24px 24px"}}>
          <button onClick={handleCancel} className="btn-interactive" style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("cancel","Отмена")}</button>
          <button onClick={handleConfirm} className="btn-interactive" style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:danger?"linear-gradient(135deg,#dc2626,#f04458)":"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Auth: общая форма (модалка) ──
function AuthFormContent({initialTab="login",onAuth,theme='dark',title="",subtitle="",variant="modal",titleId="auth-modal-title"}){
  const{lang,setLang,t}=useLang();
  const[tab,setTab]=useState(initialTab);
  useEffect(()=>{setTab(initialTab);},[initialTab]);
  const[email,setEmail]=useState(""),[pw,setPw]=useState(""),[name,setName]=useState(""),[err,setErr]=useState(""),[loading,setLoading]=useState(false);
  async function submit(){if(!email||!pw){setErr(t("fill_fields","Заполните все поля"));return;}setLoading(true);setErr("");const res=tab==="login"?await login(email,pw):await register(email,pw,name);setLoading(false);if(res.error)setErr(res.error);else onAuth(res.user,res.isNew||false);}
  const inline=variant==="inline";
  const langs:Array<[string,string]>=[["RU","ru"],["EN","en"],["UZ","uz"]];
  const LangSwitch=(
    <div className="sa-ws-lang-switch" role="group" aria-label={t("select_language","Язык")} style={{display:"inline-flex",background:"var(--inp)",border:".5px solid var(--b1)",borderRadius:22,padding:3,gap:1}}>
      {langs.map(([label,code])=>(
        <button key={code} type="button" aria-pressed={lang===code} className={"land-lang-btn"+(lang===code?" on":"")} onClick={()=>setLang(code)}>{label}</button>
      ))}
    </div>
  );
  const SegTabs=(
    <div role="tablist" aria-label={t("auth_tabs_aria","Вход или регистрация")}
      style={{position:"relative",display:"grid",gridTemplateColumns:"1fr 1fr",background:"var(--inp)",border:".5px solid var(--b1)",borderRadius:14,padding:4,gap:0,width:"100%",maxWidth:320,margin:"0 auto"}}>
      <span aria-hidden="true" style={{position:"absolute",top:4,bottom:4,left:tab==="login"?4:"calc(50% + 0px)",width:"calc(50% - 4px)",borderRadius:10,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",boxShadow:"0 6px 18px rgba(104,54,245,.35),inset 0 1px 0 rgba(255,255,255,.18)",transition:"left .28s cubic-bezier(.34,1.56,.64,1)"}}/>
      {[["login",t("login","Войти")],["register",t("register","Регистрация")]].map(([key,label])=>{
        const on=tab===key;
        return(
          <button key={key} type="button" role="tab" aria-selected={on} onClick={()=>{setTab(key as any);setErr("");}}
            style={{position:"relative",zIndex:1,border:"none",background:"transparent",padding:"9px 10px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:on?700:600,letterSpacing:"-0.01em",color:on?"#fff":"var(--t2)",transition:"color .22s ease",textShadow:on?"0 1px 0 rgba(0,0,0,.18)":"none"}}>
            {label}
          </button>
        );
      })}
    </div>
  );
  return(
    <div className={inline?"sa-ws-auth-form":undefined}>
      {inline?(
        <div className="sa-ws-auth-toolbar" style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16}}>
          {SegTabs}
          {LangSwitch}
        </div>
      ):(
        <div style={{display:"flex",justifyContent:"flex-start",alignItems:"center",marginBottom:8,paddingRight:44,minHeight:30}}>
          {LangSwitch}
        </div>
      )}
      {inline?(
        <div style={{textAlign:"center",marginBottom:18}}>
          <div id={titleId} tabIndex={-1} className="modal-title" style={{fontSize:"clamp(18px,3.8vw,22px)",marginTop:0,marginBottom:subtitle?6:0,outline:"none",letterSpacing:"-0.02em"}}>{title||(tab==="login"?t("welcome","Добро пожаловать"):t("create_account","Создать аккаунт"))}</div>
          {subtitle&&<div className="modal-sub" style={{marginBottom:0}}>{subtitle}</div>}
        </div>
      ):(
        <div style={{textAlign:"center",marginBottom:16}}>
          <div className="modal-gem" style={{marginLeft:"auto",marginRight:"auto"}}><img src="/logo.png" alt="" width={28} height={28} style={{objectFit:"contain"}}/></div>
          <div id={titleId} className="modal-title" style={{marginTop:12,marginBottom:subtitle?4:0}}>{title||(tab==="login"?t("welcome","Добро пожаловать"):t("create_account","Создать аккаунт"))}</div>
          {subtitle&&<div className="modal-sub">{subtitle}</div>}
        </div>
      )}
      {!inline&&<div style={{marginBottom:18}}>{SegTabs}</div>}
      {tab==="register"&&<input className="modal-inp" placeholder={t("name","Имя")} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/>}
      <input type="email" className="modal-inp" placeholder={t("email","Email")} value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="email"/>
      <input type="password" className="modal-inp" placeholder={t("password","Пароль")} value={pw} onChange={e=>setPw(e.target.value)} style={{marginBottom:err?8:4}} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete={tab==="login"?"current-password":"new-password"}/>
      {err?<div className="modal-err" style={{marginBottom:10}}>{err}</div>:null}
      <button type="button" className="modal-btn" onClick={submit} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.65:1,cursor:loading?"wait":"pointer"}}>
        {loading&&<span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.35)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>}
        {tab==="login"?t("sign_in","Войти"):t("sign_up","Зарегистрироваться")}
      </button>
    </div>
  );
}

// ── AuthModal (классы overlay/modal-box из strategy-reference / strategy-shell.css) ──
function AuthModal({initialTab="login",onClose,onAuth,theme='dark',title="",subtitle=""}){
  const{t}=useLang();
  const[closing,setClosing]=useState(false);
  const boxRef=useRef<HTMLDivElement|null>(null);
  const handleCloseRef=useRef<()=>void>(()=>{});
  const handleClose=()=>{if(closing||!onClose)return;setClosing(true);setTimeout(()=>onClose(),220);};
  handleCloseRef.current=handleClose;
  useEffect(()=>{
    if(!onClose)return;
    const h=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();handleCloseRef.current();}};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[onClose]);
  useEffect(()=>{
    const root=boxRef.current;
    if(!root)return;
    const email=root.querySelector<HTMLInputElement>('input[type="email"]');
    const closeBtn=root.querySelector<HTMLButtonElement>(".modal-close");
    const target=email||closeBtn;
    requestAnimationFrame(()=>target?.focus({preventScroll:true}));
  },[]);
  const dk=theme==="dark"?"dk":"lt";
  return(
    <div className={`sa-strategy-ui ${dk} sa-modal-host`} data-theme={theme}>
      <div className={"overlay open"+(closing?" sa-overlay-fade-out":"")} style={{zIndex:1}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
        <div ref={boxRef} className={"modal-box"+(closing?" sa-modal-shrink-out":"")} style={{width:"min(440px,calc(100vw - 32px))",maxWidth:"100%",boxSizing:"border-box",maxHeight:"88vh",overflowY:"auto",position:"relative",paddingTop:26}} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          {onClose&&<button type="button" className="modal-close" onClick={handleClose} aria-label={t("close","Закрыть")}>×</button>}
          <AuthFormContent initialTab={initialTab} onAuth={onAuth} theme={theme} title={title} subtitle={subtitle} variant="modal"/>
        </div>
      </div>
    </div>
  );
}

// ── TierSelectionScreen ──
const ALL_FEATURES=[
  {key:"ai",label:"AI-советник",free:"Базовый",str:"Базовый+риски",pro:"OKR·SWOT·Конкурент",team:"McKinsey-уровень",ent:"Стратег+Финансист+Инвестор"},
  {key:"proj",label:"Проектов",free:"1",str:"3",pro:"10",team:"25",ent:"∞"},
  {key:"maps",label:"Карт на проект",free:"1",str:"3",pro:"5",team:"15",ent:"∞"},
  {key:"users",label:"Участников",free:"Только вы",str:"Только вы",pro:"3",team:"10",ent:"∞"},
  {key:"scen",label:"Сценарии & симуляция",free:false,str:"2",pro:"5",team:"15",ent:"∞"},
  {key:"inter",label:"AI-интервью при создании",free:true,str:true,pro:true,team:true,ent:true},
  {key:"gantt",label:"Gantt таймлайн",free:true,str:true,pro:true,team:true,ent:true},
  {key:"clone",label:"Клонирование карт",free:false,str:false,pro:true,team:true,ent:true},
  {key:"tmpls",label:"Шаблоны стратегий",free:false,str:false,pro:false,team:true,ent:true},
  {key:"compet",label:"Конкурентный анализ AI",free:false,str:false,pro:true,team:true,ent:true},
  {key:"econ",label:"Unit economics разбор",free:false,str:false,pro:false,team:true,ent:true},
  {key:"auto",label:"AI авто-связи на карте",free:false,str:false,pro:false,team:true,ent:true},
  {key:"png",label:"Экспорт PNG",free:true,str:true,pro:true,team:true,ent:true},
  {key:"pptx",label:"Экспорт в PowerPoint",free:false,str:false,pro:false,team:false,ent:true},
  {key:"report",label:"Ежемесячный AI-отчёт",free:false,str:false,pro:false,team:false,ent:true},
  {key:"api",label:"API-доступ к картам",free:false,str:false,pro:false,team:false,ent:true},
  {key:"bcg",label:"BCG·Porter·Blue Ocean",free:false,str:false,pro:false,team:false,ent:true},
  {key:"wl",label:"White-label",free:false,str:false,pro:false,team:false,ent:true},
  {key:"supp",label:"Приоритетная поддержка",free:false,str:false,pro:false,team:false,ent:true},
];

const TIER_MKT={
  free:{icon:"⬡",color:"#9088b0",badge:null,headline:"Попробуй бесплатно",sub:"Без карты. Навсегда.",accent:"Для первых шагов",features:["1 проект","1 карта","AI-интервью","Gantt таймлайн","Экспорт PNG"],missing:["Команда","Сценарии","Конкурентный анализ"],gradient:"linear-gradient(135deg,#9088b022,#9088b008)",glow:"#9088b0",popular:false},
  starter:{icon:"◈",color:"#12c482",badge:"🌱 Новинка",headline:"Первый платный шаг",sub:"Мягкий вход в стратегию",accent:"Лучший старт за $9",features:["3 проекта","3 карты","2 сценария","Анализ рисков AI","Gantt + PNG"],missing:["Команда","Конкурентный анализ","Шаблоны"],gradient:"linear-gradient(135deg,#12c48218,#12c48208)",glow:"#12c482",popular:false},
  pro:{icon:"◆",color:"#a050ff",badge:"🔥 Популярный",headline:"Для профессионала",sub:"Полная стратегическая мощь",accent:"73% платящих выбирают Pro",features:["10 проектов","5 карт","3 участника","Конкурентный анализ AI","OKR·SWOT·Риски","Клонирование карт"],missing:["Unit economics","Шаблоны","McKinsey-AI"],gradient:"linear-gradient(135deg,#a050ff18,#a050ff08)",glow:"#a050ff",popular:true},
  team:{icon:"✦",color:"#f09428",badge:"⭐ Лучшая ценность",headline:"Для команд",sub:"Стратегия на уровне McKinsey",accent:"В 2× больше функций чем Pro",features:["25 проектов","15 карт","10 участников","Unit economics разбор","AI авто-связи","Шаблоны стратегий"],missing:["BCG·Porter·Blue Ocean","PowerPoint экспорт","AI-отчёты"],gradient:"linear-gradient(135deg,#f0942818,#f0942808)",glow:"#f09428",popular:false,highlight:true},
  enterprise:{icon:"💎",color:"#06b6d4",badge:"💎 Топ-уровень",headline:"Без компромиссов",sub:"AI-директор по стратегии",accent:"Окупается за 1 решение",features:["∞ проектов и карт","∞ участников","AI = стратег+финансист+инвестор","BCG·Porter·Blue Ocean","PowerPoint экспорт","API-доступ"],missing:[],gradient:"linear-gradient(135deg,#06b6d418,#06b6d408)",glow:"#06b6d4",popular:false},
};

const TIER_PRICES={free:"Бесплатно",starter:"$9/мес",pro:"$29/мес",team:"$59/мес",enterprise:"$149+/мес"};
const TIER_PRICE_NUM={free:"0",starter:"9",pro:"29",team:"59",enterprise:"149+"};
const TIER_ORDER=["free","starter","pro","team","enterprise"];
const TIER_FEAT_KEY={free:"free",starter:"str",pro:"pro",team:"team",enterprise:"ent"};

function FeatureValue({val}){
  if(val===false)return <span style={{color:"var(--text6)",fontSize:13}}>—</span>;
  if(val===true)return <span style={{color:"#12c482",fontWeight:700,fontSize:14}}>✓</span>;
  return <span style={{color:"var(--text2)",fontSize:13,fontWeight:500}}>{val}</span>;
}

function TierSelectionScreen({isNew,currentUser,theme="dark",palette="indigo",onSelect,onBack}){
  const{t}=useLang();
  const isMobile=useIsMobile();
  const curTier=currentUser?.tier||"free";
  const[selected,setSelected]=useState(()=>{const idx=TIER_ORDER.indexOf(curTier);return TIER_ORDER[Math.min(idx+1,TIER_ORDER.length-1)]||"pro";});
  const[loading,setLoading]=useState(false);
  const[hovered,setHovered]=useState(null);
  const curIdx=TIER_ORDER.indexOf(curTier);
  async function proceed(){setLoading(true);await onSelect(selected);setLoading(false);}
  const sel=TIERS[selected]||TIERS.pro;
  const selMkt=TIER_MKT[selected]||TIER_MKT.pro;
  return(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} data-palette={palette} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",minHeight:"100vh",display:"flex",flexDirection:"column",overflowY:"auto",position:"relative"}}>
      <StrategyShellBg/>
      <div style={{position:"fixed",width:800,height:800,borderRadius:"50%",background:`radial-gradient(circle,${selMkt.glow}18 0%,transparent 65%)`,top:"-20%",right:"-15%",filter:"blur(100px)",pointerEvents:"none",transition:"background 1.4s ease",zIndex:0}}/>
      <div className="sa-app-topbar" style={{zIndex:2}}>
        <div className="land-logo" style={{gap:10}}>
          <div className="land-gem" style={{width:34,height:34,borderRadius:11,fontSize:13}}>SA</div>
          <span className="land-brand">Strategy AI</span>
        </div>
        {!isNew&&onBack&&<button type="button" className="btn-g" onClick={onBack}>{t("back_btn","← Назад")}</button>}
      </div>
      <div style={{position:"relative",zIndex:1,maxWidth:1300,width:"100%",margin:"0 auto",padding:isMobile?"0 16px 56px":"0 24px 80px",flex:1}}>
        <div style={{textAlign:"center",padding:isMobile?"28px 0 24px":"40px 0 44px"}}>
          <h1 style={{fontSize:isMobile?"clamp(26px,7vw,36px)":52,fontWeight:900,color:"var(--text)",letterSpacing:-2,lineHeight:1.05,marginBottom:10,animation:"slideUp .4s .1s both"}}>
            Выберите<br/>
            <span style={{background:`linear-gradient(135deg,${selMkt.glow},${selMkt.glow}99,var(--accent-1))`,backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradShift 4s ease infinite"}}>свой тариф</span>
          </h1>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(0,1fr)":"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:36,alignItems:"stretch",maxWidth:isMobile?420:"none",marginLeft:isMobile?"auto":"",marginRight:isMobile?"auto":""}}>
          {TIER_ORDER.map((k,cardIdx)=>{
            const v=TIERS[k],m=TIER_MKT[k];
            const isSel=selected===k,isCurr=k===curTier,isLower=TIER_ORDER.indexOf(k)<curIdx&&!isCurr,isHov=hovered===k&&!isSel;
            return(
              <div key={k} onClick={()=>setSelected(k)} onMouseEnter={()=>setHovered(k)} onMouseLeave={()=>setHovered(null)}
                style={{borderRadius:22,border:`2px solid ${isSel?v.color+"ee":m.highlight&&!isSel?"rgba(245,158,11,.3)":isHov?v.color+"55":"var(--border)"}`,background:isSel?`${v.color}12`:m.highlight?`${v.color}06`:"var(--surface)",cursor:"pointer",transition:"all .25s cubic-bezier(.34,1.56,.64,1)",transform:isSel?"translateY(-10px) scale(1.02)":m.highlight&&!isSel?"translateY(-3px)":isHov?"translateY(-5px)":"translateY(0)",boxShadow:isSel?`0 28px 70px ${v.color}35,0 0 0 1px ${v.color}22`:isHov?`0 16px 44px ${v.color}20`:"none",position:"relative",opacity:isLower?.45:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:`slideUp .45s ${cardIdx*.07}s both`}}>
                {(isCurr||m.badge)&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",padding:"4px 14px",borderRadius:"0 0 12px 12px",fontSize:13.5,fontWeight:800,color:"#fff",whiteSpace:"nowrap",background:isCurr?v.color:"linear-gradient(90deg,var(--accent-1),var(--accent-2))",boxShadow:`0 4px 14px ${v.color}55`}}>{isCurr?t("your_plan","● Ваш тариф"):m.badge}</div>}
                <div style={{padding:"28px 22px 20px",paddingTop:(isCurr||m.badge)?"36px":"28px"}}>
                  <div style={{width:56,height:56,borderRadius:16,background:isSel?`linear-gradient(135deg,${v.color}33,${v.color}18)`:`${v.color}12`,border:`1.5px solid ${isSel?v.color+"66":v.color+"25"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:16}}>{m.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:isSel?v.color:"var(--text)",letterSpacing:-.5,marginBottom:3}}>{v.label}</div>
                  <div style={{fontSize:13,color:"var(--text4)",marginBottom:18}}>{m.headline}</div>
                  <div style={{padding:"14px 16px",borderRadius:14,background:isSel?`${v.color}15`:"var(--surface2)",border:`1px solid ${isSel?v.color+"30":"var(--border)"}`,marginBottom:16}}>
                    {k==="free"?<div style={{fontSize:26,fontWeight:900,color:isSel?v.color:"var(--text)"}}>{t("free_plan","Бесплатно")}</div>:(
                      <div style={{display:"flex",alignItems:"baseline",gap:2}}><span style={{fontSize:13,color:isSel?v.color:"var(--text4)",fontWeight:600}}>$</span><span style={{fontSize:38,fontWeight:900,color:isSel?v.color:"var(--text)",letterSpacing:-1.5,lineHeight:1}}>{TIER_PRICE_NUM[k]}</span><span style={{fontSize:13,color:"var(--text5)",marginLeft:4}}>{t("per_month_short","/мес")}</span></div>
                    )}
                  </div>
                </div>
                <div style={{padding:"0 22px 22px",marginTop:"auto"}}>
                  {isSel?<div style={{padding:"13px",borderRadius:13,textAlign:"center",background:`linear-gradient(135deg,${v.color},${v.color}cc)`,color:"#fff",fontSize:13,fontWeight:800,animation:"tierPop .4s cubic-bezier(.34,1.56,.64,1)"}}>{t("selected","✓ Выбрано")}</div>:<div style={{padding:"11px",borderRadius:13,textAlign:"center",border:`1.5px solid ${v.color}40`,background:`${v.color}0a`,color:v.color,fontSize:13,fontWeight:700}}>{t("choose_btn","Выбрать →")}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",marginBottom:48}}>
          <button onClick={proceed} disabled={loading} style={{padding:"18px 72px",fontSize:17,fontWeight:800,borderRadius:18,border:"none",background:selected==="free"?"rgba(148,163,184,.12)":`linear-gradient(135deg,${selMkt.glow},${selMkt.glow}bb)`,color:selected==="free"?"var(--text4)":"#fff",cursor:loading?"wait":"pointer",boxShadow:selected!=="free"?`0 16px 52px ${selMkt.glow}44`:"none",display:"inline-flex",alignItems:"center",gap:14,letterSpacing:-.3}}>
            {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
            {loading?t("saving","Сохраняю…"):selected===curTier?`Остаться на ${sel.label}`:selected==="free"?"Начать бесплатно →":`Перейти на ${sel.label} — ${TIER_PRICES[selected]} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MapConflictModal ──
function MapConflictModal({existingMaps,newNodeCount,tierLabel,tierMapsCount,onReplace,onUpgrade,theme='dark'}){
  const{t}=useLang();
  const[replaceId,setReplaceId]=useState(existingMaps[0]?.id||null);
  const[loading,setLoading]=useState(false);
  async function doReplace(){if(!replaceId)return;setLoading(true);await onReplace(replaceId);}
  const mapsAllowed=tierMapsCount!=null?tierMapsCount:1;
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.7))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(16px)",padding:16}}>
      <div className="glass-panel" style={{width:"min(95vw,480px)",maxHeight:"90vh",overflowY:"auto",background:"var(--glass-panel-bg,var(--bg2))",border:"1px solid rgba(239,68,68,.35)",borderRadius:"var(--r-xl)",boxShadow:"var(--glass-shadow-accent,none),0 40px 80px rgba(0,0,0,.55)"}}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{t("map_limit","Лимит карт исчерпан")}</div>
          <div style={{fontSize:13,color:"var(--text3)",marginTop:4}}>На тарифе {tierLabel} разрешено карт: {mapsAllowed}</div>
        </div>
        <div style={{padding:"20px 24px"}}>
          {existingMaps.map(m=>(
            <div key={m.id} onClick={()=>setReplaceId(m.id)} style={{padding:"11px 14px",borderRadius:11,border:`2px solid ${replaceId===m.id?"rgba(239,68,68,.5)":"var(--border)"}`,background:replaceId===m.id?"rgba(239,68,68,.06)":"var(--surface)",cursor:"pointer",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{m.name}</div>
              <div style={{fontSize:13.5,color:"var(--text5)"}}>{m.nodes?.length||0} шагов</div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={doReplace} disabled={!replaceId||loading} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:replaceId&&!loading?"linear-gradient(135deg,#dc2626,#f04458)":"var(--surface2)",color:replaceId&&!loading?"#fff":"var(--text4)",fontSize:13,fontWeight:700,cursor:replaceId&&!loading?"pointer":"not-allowed"}}>{loading?t("replacing",t("replacing","Заменяю…")):t("replace_btn","🗑 Заменить")}</button>
            <button onClick={onUpgrade} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("upgrade_tier","✦ Расширить тариф")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SavingScreen({theme='dark'}){
  const{t}=useLang();
  return(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18,position:"relative",overflow:"hidden"}}>
      <StrategyShellBg/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
        <div style={{width:52,height:52,borderRadius:15,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,animation:"float 2s ease infinite",boxShadow:"0 8px 28px var(--accent-glow)"}}>✦</div>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>{t("saving_map","Сохраняю карту")}</div>
      </div>
    </div>
  );
}

function PostOnboardFlow({pendingMap,currentUser,theme='dark',onComplete,onBack}){
  const{t}=useLang();
  const[step,setStep]=useState(currentUser?"check":"auth");
  const[user,setUser]=useState(currentUser);
  const[isNew,setIsNew]=useState(false);
  const[targetProject,setTargetProject]=useState(null);
  const[existingMaps,setExistingMaps]=useState([]);
  const[saving,setSaving]=useState(false);
  async function afterAuth(u,newUser){setUser(u);setIsNew(newUser);if(newUser){setStep("tier");}else{await runCheck(u);}}
  async function afterTierSelect(tier){
    const upd=await patchUser(user.email,{tier});
    if(upd){setUser(upd);await runCheck(upd);}
    else{await runCheck(user);} // patchUser вернул null — используем текущего пользователя
  }
  async function runCheck(u){
    setSaving(true);const tier=TIERS[u.tier]||TIERS.free;let projs=await getProjects(u.email);let proj=projs.find(p=>p.owner===u.email);
    if(!proj){proj={id:uid(),name:"Моя стратегия",owner:u.email,members:[{email:u.email,role:"owner"}],createdAt:Date.now()};await saveProject(proj);}
    setTargetProject(proj);const maps=await getMaps(proj.id);const regMaps=maps.filter(m=>!m.isScenario);setSaving(false);
    if(regMaps.length>=tier.maps){setExistingMaps(regMaps);setStep("conflict");}else{await doSaveAndGo(proj,u,null);}
  }
  async function doSaveAndGo(proj,u,replaceMapId){
    setSaving(true);if(replaceMapId)await deleteMap(proj.id,replaceMapId);
    const map={id:uid(),name:"Карта от AI",nodes:pendingMap?.nodes||[],edges:pendingMap?.edges||[],ctx:pendingMap?.ctx||"",isScenario:false,createdAt:Date.now()};
    const saved=await saveMap(proj.id,map);setSaving(false);onComplete(u,proj,saved);
  }
  if(saving)return <SavingScreen theme={theme}/>;
  if(step==="auth")return(
    <div data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
<AuthModal initialTab="register" theme={theme} title="Сохранить карту" subtitle="Создайте аккаунт — карта сохранится автоматически" onAuth={afterAuth} onClose={onBack}/>
      <button onClick={onBack} style={{position:"absolute",top:16,left:16,padding:"5px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>{t("back_btn","← Назад")}</button>
    </div>
  );
  if(step==="tier")return <TierSelectionScreen isNew={isNew} currentUser={user} theme={theme} onSelect={afterTierSelect} onBack={()=>setStep("auth")}/>;
  if(step==="conflict")return(
    <div data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
<MapConflictModal existingMaps={existingMaps} newNodeCount={pendingMap?.nodes?.length||0} tierLabel={(TIERS[user?.tier]||TIERS.free).label} tierMapsCount={(TIERS[user?.tier]||TIERS.free).maps} onReplace={async(mapId)=>{await doSaveAndGo(targetProject,user,mapId);}} onUpgrade={()=>setStep("tier")} theme={theme}/>
    </div>
  );
  return <SavingScreen theme={theme}/>;
}

// ── Toggle (reusable) ──
function Toggle({val,onChange,label,desc}){
  return(
    <div onClick={()=>onChange(!val)} className="glass-card icard" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginBottom:6,cursor:"pointer"}}>
      <div>
        <div className="icard-title" style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{label}</div>
        {desc&&<div className="icard-desc" style={{fontSize:11,color:"var(--text4)",marginTop:1}}>{desc}</div>}
      </div>
      <div style={{width:42,height:24,borderRadius:12,background:val?"var(--accent-1)":"var(--surface2)",border:`1px solid ${val?"var(--accent-1)":"var(--border2)"}`,position:"relative",transition:"all .2s",flexShrink:0,marginLeft:16}}>
        <div style={{position:"absolute",top:2,left:val?18:2,width:18,height:18,borderRadius:"50%",background:val?"#fff":"var(--text4)",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
      </div>
    </div>
  );
}

// ── ProfileModal ──
function ProfileModal({user,onClose,onUpdate,onLogout,onChangeTier,theme="dark",onToggleTheme,palette="indigo",onPaletteChange}){
  const{t,lang,setLang}=useLang();
  const tier=TIERS[user.tier]||TIERS.free;
  const isMobile=useIsMobile();
  const[tab,setTab]=useState("profile");
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[selected,setSelected]=useState(user.tier||"free");
  const[buyPhase,setBuyPhase]=useState(null);
  const[name,setName]=useState(user.name||"");
  const[bio,setBio]=useState(user.bio||"");
  const[cp,setCp]=useState("");const[np,setNp]=useState("");const[cf,setCf]=useState("");
  const[msg,setMsg]=useState(null);const[loading,setLoading]=useState(false);
  const[cardNum,setCardNum]=useState("");const[cardName,setCardName]=useState("");const[cardExp,setCardExp]=useState("");const[cardCvv,setCardCvv]=useState("");const[cardError,setCardError]=useState(null);
  // settings state
  const[notifEmail,setNotifEmail]=useState(user.notifEmail!==false);
  const[notifPush,setNotifPush]=useState(user.notifPush!==false);
  const[autoSave,setAutoSave]=useState(user.autoSave!==false);
  const[compactMode,setCompactMode]=useState(user.compactMode||false);
  const[defaultView,setDefaultView]=useState(user.defaultView||"canvas");
  const[aiLang,setAiLang]=useState(user.aiLang||"ru");
  const[uiLang,setUiLang]=useState(lang);
  const[settingsSaved,setSettingsSaved]=useState(false);
  const[usage,setUsage]=useState<{maps?:{used:number};projects?:{used:number};scenarios?:{used:number}}|null>(null);

  useEffect(()=>{
    if(tab!=="tier"||!API_BASE)return;
    apiFetch("/api/tiers/usage").then(d=>setUsage(d.usage||null)).catch(()=>setUsage(null));
  },[tab]);

  const selTier=TIERS[selected]||TIERS.free;
  const curIdx=TIER_ORDER.indexOf(user.tier||"free");
  const isCurrentTier=selected===user.tier;
  const isUpgrade=TIER_ORDER.indexOf(selected)>curIdx;
  const fi={width:"100%",padding:"10px 13px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:9,color:"var(--text)",outline:"none",marginBottom:10,fontFamily:"'Inter',system-ui,sans-serif"};
  function formatCardNum(v){return v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();}
  function formatExp(v){const d=v.replace(/\D/g,"").slice(0,4);return d.length>2?d.slice(0,2)+"/"+d.slice(2):d;}
  async function saveName(){
    if(!name.trim())return;
    setLoading(true);
    try{
      const u=await patchUser(user.email,{name:name.trim(),bio:bio.trim()});
      if(u)onUpdate(u);
      setMsg({t:t("profile_saved","Профиль обновлён ✓"),ok:true});
    }catch(e:any){setMsg({t:e?.message||t("save_error","Ошибка сохранения"),ok:false});}
    setLoading(false);
  }
  async function changePw(){
    if(!cp||!np){setMsg({t:t("fill_all_fields","Заполните все поля"),ok:false});return;}
    if(np.length<6){setMsg({t:t("min_6_chars","Минимум 6 символов"),ok:false});return;}
    if(np!==cf){setMsg({t:t("pw_mismatch","Пароли не совпадают"),ok:false});return;}
    setLoading(true);
    if(API_BASE){
      try{
        await apiFetch("/api/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword:cp,newPassword:np})});
        setCp("");setNp("");setCf("");setMsg({t:t("pw_changed","Пароль изменён ✓"),ok:true});
      }catch(e:any){setMsg({t:e.message||t("pw_change_err","Ошибка смены пароля"),ok:false});}
      setLoading(false);return;
    }
    const a=await store.get("sa_acc")||[],acc=a.find((x:any)=>x.email===user.email);
    if(!acc||acc.pwHash!==hashPw(user.email,cp)){setMsg({t:t("wrong_pw","Неверный текущий пароль"),ok:false});setLoading(false);return;}
    await patchUser(user.email,{pwHash:hashPw(user.email,np)});
    setCp("");setNp("");setCf("");setMsg({t:t("pw_changed","Пароль изменён ✓"),ok:true});setLoading(false);
  }
  async function saveSettings(){
    setLoading(true);setMsg(null);
    try{
      const u=await patchUser(user.email,{notifEmail,notifPush,autoSave,compactMode,defaultView,aiLang,theme,palette});
      if(u)onUpdate(u);
      if(uiLang!==lang)setLang(uiLang);
      setSettingsSaved(true);
      setTimeout(()=>setSettingsSaved(false),2200);
    }catch(e:any){setMsg({t:e?.message||t("save_error","Ошибка сохранения"),ok:false});}
    setLoading(false);
  }
  async function executeBuy(){
    // Dev-аккаунт — мгновенное переключение без оплаты
    if(user.is_dev){
      setCardError(null);setBuyPhase("processing");
      await new Promise(r=>setTimeout(r,600));
      const u=await patchUser(user.email,{tier:selected});if(u)onUpdate(u);setBuyPhase("success");
      await new Promise(r=>setTimeout(r,1800));onClose();return;
    }
    // Через бэкенд — Stripe Checkout
    if(API_BASE&&selected!=="free"){
      setCardError(null);setBuyPhase("processing");
      try{
        const d=await apiFetch("/api/payments/checkout",{method:"POST",body:JSON.stringify({tierKey:selected})});
        if(d.checkoutUrl){window.location.href=d.checkoutUrl;return;}
        setCardError(t("checkout_no_url","Не удалось получить ссылку на оплату. Проверьте настройки Stripe."));
        setBuyPhase(null);
        return;
      }catch(e:any){setCardError(e.message||t("save_error","Ошибка оплаты"));setBuyPhase(null);return;}
    }
    // Fallback-имитация (если бэкенд не подключён — для тестирования)
    if(isUpgrade){
      const rawNum=cardNum.replace(/\s/g,"");
      if(rawNum.length<16){setCardError(t("card_number_ph","Введите полный номер карты (16 цифр)"));return;}
      if(!cardName.trim()){setCardError(t("card_holder_ph","Введите имя держателя"));return;}
      if(cardExp.length<5){setCardError(t("card_expiry_ph","Введите срок действия ММ/ГГ"));return;}
      if(cardCvv.length<3){setCardError(t("card_cvv_ph","Введите CVV"));return;}
    }
    setCardError(null);
    setBuyPhase("processing");await new Promise(r=>setTimeout(r,1800));
    const u=await patchUser(user.email,{tier:selected});if(u)onUpdate(u);setBuyPhase("success");
    await new Promise(r=>setTimeout(r,2400));onClose();
  }
  async function handleDeleteAccount(){
    setShowDeleteConfirm(false);
    setLoading(true);
    try{
      if(API_BASE){
        await apiFetch("/api/auth/account",{method:"DELETE"});
        clearJWT();
        onClose();onLogout();return;
      }
      const a=((await store.get("sa_acc"))||[]).filter((x:any)=>x.email!==user.email);
      await store.set("sa_acc",a);
      const allProj=(await store.get("sa_proj"))||[];
      for(const p of allProj){
        if(p.owner===user.email)await deleteProject(p.id);
        else if(p.members?.some(m=>m.email===user.email))await saveProject({...p,members:(p.members||[]).filter(m=>m.email!==user.email)});
      }
      await clearSession();
      onClose();
      onLogout();
    }catch(e){setMsg({t:t("delete_err","Ошибка при удалении"),ok:false});}
    setLoading(false);
  }
  const[closing,setClosing]=useState(false);
  const handleClose=()=>{if(closing)return;setClosing(true);setTimeout(()=>onClose(),260);};
  useEffect(()=>{const h=e=>{if(e.key==="Escape"&&!buyPhase)handleClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[buyPhase,closing]);

  const TABS=[
    ["profile","👤",t("profile_title","Профиль")],
    ["security","🔐",t("security_title","Безопасность")],
    ["settings","⚙",t("settings_title","Настройки")],
    ["stats","📊",t("stats_tab","Статистика")],
    ["tier","💳",t("billing_title","Тариф")],
  ];

  return(
    <div data-theme={theme} className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.75))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(16px)"}} onClick={e=>{if(e.target===e.currentTarget&&!buyPhase&&!showDeleteConfirm)handleClose();}}>
<div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":isMobile?"":"modal-content-pop"}`} style={{position:"relative",width:isMobile?"100%":"min(96vw,980px)",height:isMobile?"90vh":680,minHeight:520,borderRadius:20,display:"flex",flexDirection:"column",animation:isMobile&&!closing?"slideUp .3s cubic-bezier(0.22,1,0.36,1)":"none",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="sa-profile-header" style={{display:"flex",alignItems:"center",gap:14,padding:"18px 24px",flexShrink:0,borderBottom:"1px solid var(--border)",background:"var(--surface)",position:"relative",overflow:"hidden"}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"var(--accent-on-bg)",boxShadow:"0 6px 18px var(--accent-glow)"}}>{(user.name||user.email||"?")[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{user.name||t("user_word","Пользователь")}</div>
            <div style={{fontSize:13,color:"var(--text4)",marginTop:1}}>{user.email}</div>
            {user.bio&&<div style={{fontSize:13,color:"var(--text5)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:320}}>{user.bio}</div>}
          </div>
          <div className="glass-card" style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:12,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--surface)"}}>
            <span style={{fontSize:13}}>{tier.badge}</span>
            <span style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>{tier.label}</span>
          </div>
          <button onClick={handleClose} style={{width:36,height:36,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}} onMouseOver={e=>e.currentTarget.style.background="var(--surface2)"} onMouseOut={e=>e.currentTarget.style.background="var(--surface)"}>×</button>
        </div>

        {/* Tab bar */}
        <div className="sa-profile-tabs" style={{display:"flex",gap:4,padding:"8px 20px 0",flexShrink:0,borderBottom:"1px solid var(--border)",background:"var(--bg2)"}}>
          {TABS.map(([k,icon,label])=>(
            <button key={k} type="button" className={"sa-profile-tab"+(tab===k?" on":"")} onClick={()=>{setTab(k);setMsg(null);}} style={{padding:"10px 14px",border:"none",background:tab===k?"var(--accent-soft)":"transparent",color:tab===k?"var(--text)":"var(--text4)",fontSize:13.5,fontWeight:tab===k?700:500,cursor:"pointer",borderBottom:tab===k?`2px solid ${tier.color}`:"2px solid transparent",borderRadius:"10px 10px 0 0",transition:"all .15s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
              <span style={{fontSize:13}}>{icon}</span>{label}
            </button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={onLogout} style={{padding:"11px 14px",border:"none",background:"transparent",color:"#f04458",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}} onMouseOver={e=>e.currentTarget.style.opacity=".7"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
            <span>⎋</span> {t("logout","Выйти")}
          </button>
        </div>

        {/* Content — фиксированная высота для всех вкладок */}
        <div style={{flex:1,minHeight:380,overflow:"hidden",display:"flex"}}>

          {/* ── PROFILE TAB ── */}
          {tab==="profile"&&(
            <div className="tab-content" style={{flex:1,overflowY:"auto",padding:isMobile?"20px 16px":"28px 32px",minHeight:380}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?24:28,maxWidth:680}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>{t("display_name","Отображаемое имя")}</div>
                  <input style={fi} placeholder={t("display_name","Ваше имя")} value={name} onChange={e=>setName(e.target.value)} onFocus={e=>e.target.style.borderColor="var(--accent-1)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>{t("bio_label","О себе")}</div>
                  <textarea style={{...fi,height:72,resize:"vertical",lineHeight:1.5}} placeholder={t("bio_label","Краткое описание (должность, компания…)")} value={bio} onChange={e=>setBio(e.target.value)} onFocus={e=>e.target.style.borderColor="var(--accent-1)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                  <button onClick={saveName} disabled={loading||!name.trim()} style={{padding:"11px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>
                    {loading?t("saving","Сохраняю…"):t("save","Сохранить профиль")}
                  </button>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>Email</div>
                  <div style={{padding:"11px 14px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:16}}>
                    <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{user.email}</div>
                    <div style={{fontSize:13.5,color:"var(--text5)",marginTop:3}}>{t("email_no_change","Email нельзя изменить")}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>{t("account_created","Аккаунт создан")}</div>
                  <div style={{padding:"11px 14px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:16}}>
                    <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{user.createdAt?new Date(user.createdAt).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru-RU",{day:"numeric",month:"long",year:"numeric"}):"—"}</div>
                  </div>
                  <div style={{padding:"14px 16px",borderRadius:12,background:`${tier.color}10`,border:`1px solid ${tier.color}33`}}>
                    <div style={{fontSize:13,color:"var(--text4)",marginBottom:4}}>{t("current_plan","Текущий тариф")}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:18}}>{tier.badge}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:tier.color}}>{tier.label}</div>
                        <div style={{fontSize:13,color:"var(--text4)"}}>{getTierPrice(user.tier||"free",t)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {msg&&<div style={{marginTop:16,maxWidth:680,padding:"10px 15px",borderRadius:10,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#12c482":"#f04458",fontSize:13.5}}>{msg.t}</div>}
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {tab==="security"&&(
            <div className="tab-content" style={{flex:1,overflowY:"auto",padding:"28px 32px",minHeight:380}}>
              <div style={{maxWidth:420}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>{t("login_methods","Вход в аккаунт")}</div>
                <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>✉️ Email</div>
                    <div style={{fontSize:12,color:"var(--text4)",marginTop:2}}>{user.email}</div>
                  </div>
                  <div style={{padding:"4px 10px",borderRadius:8,background:user.emailVerified!==false?"rgba(16,185,129,.12)":"rgba(245,158,11,.12)",border:`1px solid ${user.emailVerified!==false?"rgba(16,185,129,.3)":"rgba(245,158,11,.3)"}`,color:user.emailVerified!==false?"#12c482":"#f09428",fontSize:12,fontWeight:700}}>
                    {user.emailVerified!==false?t("email_verified","Подтверждён"):t("email_not_verified","Не подтверждён")}
                  </div>
                </div>
                {API_BASE&&(
                  <div style={{padding:"12px 16px",borderRadius:11,background:"var(--surface2)",border:"1px solid var(--border)",marginBottom:20,fontSize:12,color:"var(--text4)"}}>
                    🔜 {t("google_login_coming","Вход через Google будет доступен в следующем обновлении.")}
                  </div>
                )}
                <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:4}}>{t("change_password","Изменить пароль")}</div>
                <div style={{fontSize:13.5,color:"var(--text4)",marginBottom:20}}>{t("pw_hint","Пароль должен быть не менее 6 символов")}</div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>{t("current_password","Текущий пароль")}</div>
                <input style={fi} type="password" placeholder={t("current_password","Текущий пароль")} value={cp} onChange={e=>setCp(e.target.value)} onFocus={e=>e.target.style.borderColor="var(--accent-1)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>{t("new_password_label","Новый пароль")}</div>
                <input style={fi} type="password" placeholder={t("pw_hint","Мин. 6 символов")} value={np} onChange={e=>setNp(e.target.value)} onFocus={e=>e.target.style.borderColor="var(--accent-1)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                <input style={fi} type="password" placeholder={t("confirm_password","Повторите новый пароль")} value={cf} onChange={e=>setCf(e.target.value)} onFocus={e=>e.target.style.borderColor="var(--accent-1)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                {np&&(
                  <div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:13,color:"var(--text4)",marginBottom:6}}>{t("pw_strength","Надёжность пароля")}</div>
                    <div style={{display:"flex",gap:3}}>
                      {[np.length>=6,/[A-Z]/.test(np),/[0-9]/.test(np),/[^a-zA-Z0-9]/.test(np)].map((ok,i)=>(
                        <div key={i} style={{flex:1,height:4,borderRadius:2,background:ok?"#12c482":"var(--border2)",transition:"background .3s"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:13,color:"var(--text5)",marginTop:4}}>{[np.length>=6&&t("chars_6plus","6+"),/[A-Z]/.test(np)&&t("uppercase_chars","A-Z"),/[0-9]/.test(np)&&"0-9",/[^a-zA-Z0-9]/.test(np)&&"!@#"].filter(Boolean).join(" · ")}</div>
                  </div>
                )}
                <button onClick={changePw} disabled={loading} style={{padding:"12px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>
                  {loading?t("saving","Сохраняю…"):t("change_pw_btn","Изменить пароль")}
                </button>
                {msg&&<div style={{padding:"10px 14px",borderRadius:9,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#12c482":"#f04458",fontSize:13.5}}>{msg.t}</div>}

                <div style={{marginTop:24,paddingTop:24,borderTop:"1px solid var(--border)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#f04458",marginBottom:8}}>{t("danger_zone","Опасная зона")}</div>
                  <div style={{padding:"14px 16px",borderRadius:11,background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.15)"}}>
                    <div style={{fontSize:13.5,color:"var(--text)",fontWeight:600}}>{t("delete_account","Удалить аккаунт")}</div>
                    <div style={{fontSize:13.5,color:"var(--text4)",marginTop:3,marginBottom:10}}>{t("all_data_deleted","Все данные будут удалены безвозвратно")}</div>
                    <button onClick={()=>setShowDeleteConfirm(true)} disabled={loading} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(239,68,68,.35)",background:"transparent",color:"#f04458",fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>{loading?t("loading_short","Загрузка…"):t("delete_account","Удалить аккаунт")}</button>
                  </div>
                </div>
                {showDeleteConfirm&&(
                  <div style={{position:"fixed",inset:0,zIndex:210,background:"var(--modal-overlay-bg,rgba(0,0,0,.6))",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowDeleteConfirm(false)}>
                    <div style={{background:"var(--bg2)",borderRadius:16,border:"1px solid var(--border)",padding:"24px 28px",maxWidth:400,width:"100%",boxShadow:"0 24px 48px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
                      <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>{t("delete_account","Удалить аккаунт")}?</div>
                      <div style={{fontSize:13.5,color:"var(--text3)",marginBottom:20}}>{t("delete_warning","Все данные будут удалены безвозвратно")}</div>
                      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                        <button onClick={()=>setShowDeleteConfirm(false)} style={{padding:"10px 20px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("cancel","Отмена")}</button>
                        <button onClick={handleDeleteAccount} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#f04458",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("delete_forever","Удалить навсегда")}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab==="settings"&&(
            <div className="tab-content" style={{flex:1,overflowY:"auto",padding:isMobile?"16px 14px":"20px 24px",minHeight:380}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?18:24,maxWidth:720}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{t("appearance","Внешний вид")}</div>
                  <div className="glass-card" style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{t("theme_label","Тема")}</div>
                      <div style={{fontSize:11,color:"var(--text4)",marginTop:1}}>{theme==="dark"?t("dark_theme_label","Тёмная"):t("light_theme_label","Светлая")}</div>
                    </div>
                    <button onClick={onToggleTheme} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.04)",color:"var(--text)",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                      {theme==="dark"?t("light_theme_label","Светлая"):t("dark_theme_label","Тёмная")}
                    </button>
                  </div>
                  {onPaletteChange&&(
                    <div className="glass-card" style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginTop:6,marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:2}}>{t("palette_label","Цветовая палитра")}</div>
                      <div style={{fontSize:11,color:"var(--text5)",marginBottom:6}}>{t("palette_hint","Цвет кнопок и акцентов")}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {[
                          {id:"indigo",label:"◆ Indigo",c1:"#6836f5",c2:"#a050ff"},
                          {id:"ocean",label:"◇ Ocean",c1:"#5b8fb9",c2:"#7ab8d4"},
                          {id:"forest",label:"◇ Forest",c1:"#5a8c7b",c2:"#6ba881"},
                          {id:"orange",label:"◇ Orange",c1:"#ea580c",c2:"#f09428"},
                          {id:"sunset",label:"◇ Sunset",c1:"#b88a6a",c2:"#c9a088"},
                          {id:"mono",label:"◇ Mono",c1:"#6b7a8a",c2:"#8a9baa"},
                        ].map(({id,label,c1,c2})=>(
                          <button key={id} onClick={()=>onPaletteChange(id)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${palette===id?"var(--accent-1)":"var(--glass-border-accent,var(--border))"}`,background:palette===id?"var(--accent-soft)":"rgba(255,255,255,.02)",color:"var(--text)",cursor:"pointer",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
                            <span style={{width:12,height:12,borderRadius:4,background:`linear-gradient(135deg,${c1},${c2})`}}/>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Toggle val={compactMode} onChange={setCompactMode} label={t("compact_mode","Компактный режим")} desc={t("compact_desc","Уменьшенные карточки узлов")}/>

                  <div className="glass-card" style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginTop:6,marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text5)",marginBottom:6}}>{t("select_language","Язык интерфейса")}</div>
                    <div style={{display:"flex",gap:5}}>
                      {[["ru","RU"],["en","EN"],["uz","UZ"]].map(([v,label])=>(
                        <button key={v} onClick={()=>setUiLang(v)} style={{flex:1,padding:"6px 4px",borderRadius:8,border:`1px solid ${uiLang===v?"var(--accent-1)":"var(--glass-border-accent,var(--border))"}`,background:uiLang===v?"var(--accent-soft)":"transparent",color:uiLang===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{fontSize:12,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:10}}>{t("strategy_maps","Карты")}</div>
                  <div className="glass-card" style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text5)",marginBottom:6}}>{t("default_view","Вид по умолчанию")}</div>
                    <div style={{display:"flex",gap:5}}>
                      {[["canvas",t("canvas_view","Канвас")],["gantt",t("gantt_view","Gantt")],["list",t("list_view","Список")]].map(([v,label])=>(
                        <button key={v} onClick={()=>setDefaultView(v)} style={{flex:1,padding:"6px 4px",borderRadius:8,border:`1px solid ${defaultView===v?"var(--accent-1)":"var(--glass-border-accent,var(--border))"}`,background:defaultView===v?"var(--accent-soft)":"transparent",color:defaultView===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle val={autoSave} onChange={setAutoSave} label={t("auto_save","Автосохранение")} desc={t("autosave_desc","Сохранять карту при каждом изменении")}/>
                </div>

                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{t("ai_assistant_title","AI-ассистент")}</div>
                  <div className="glass-card" style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",backdropFilter:"blur(10px)",border:"1px solid var(--glass-border-accent,var(--border))",marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text5)",marginBottom:6}}>{t("ai_language","Язык ответов AI")}</div>
                    <div style={{display:"flex",gap:5}}>
                      {[["ru","Русский"],["en","English"],["uz","O'zbekcha"]].map(([v,label])=>(
                        <button key={v} onClick={()=>setAiLang(v)} style={{flex:1,padding:"6px 4px",borderRadius:8,border:`1px solid ${aiLang===v?"var(--accent-1)":"var(--glass-border-accent,var(--border))"}`,background:aiLang===v?"var(--accent-soft)":"transparent",color:aiLang===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{fontSize:12,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:10}}>{t("notifications_title","Уведомления")}</div>
                  <Toggle val={notifEmail} onChange={setNotifEmail} label={t("email_notifications","Email уведомления")} desc={t("notif_email_desc","Важные обновления на почту")}/>
                  <Toggle val={notifPush} onChange={setNotifPush} label={t("push_notifications","Push уведомления")} desc={t("notif_push_desc","Уведомления в браузере")}/>
                  <div style={{fontSize:11.5,lineHeight:1.5,color:"var(--text5)",marginTop:8,padding:"10px 12px",borderRadius:11,border:"1px dashed var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.03)"}}>{t("notif_backend_note","Отправка писем и push на сервере появится после подключения уведомлений.")}</div>
                  <div style={{fontSize:11.5,lineHeight:1.5,color:"var(--text4)",marginTop:12,padding:"10px 12px",borderRadius:11,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--accent-soft)"}}>
                    <span style={{fontWeight:700,color:"var(--accent-2)"}}>{t("weekly_briefing","Еженедельный брифинг")}</span>
                    {" — "}{t("weekly_briefing_settings_hint","откройте на странице «Мои проекты» или в меню карты.")}
                  </div>
                </div>
              </div>

              <div style={{marginTop:24,maxWidth:720,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <button onClick={saveSettings} disabled={loading} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                  {loading?t("saving","Сохраняю…"):t("save_settings","Сохранить настройки")}
                </button>
                {settingsSaved&&<div style={{fontSize:13,color:"#12c482",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span> {t("settings_saved","Настройки сохранены")}</div>}
                {msg&&!settingsSaved&&<div style={{padding:"10px 14px",borderRadius:9,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#12c482":"#f04458",fontSize:13.5}}>{msg.t}</div>}
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab==="stats"&&(
            <div className="tab-content" style={{flex:1,overflowY:"auto",padding:"28px 32px",minHeight:380}}>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:20}}>{t("stats_tab","Статистика аккаунта")}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24,maxWidth:620}}>
                {[
                  {icon:"📁",label:t("billing_title","Тариф"),val:tier.label,color:tier.color},
                  {icon:"🗺",label:t("maps_available","Карт доступно"),val:fmt(tier.maps),color:"var(--accent-1)"},
                  {icon:"👥",label:t("members","Участников"),val:fmt(tier.users),color:"var(--accent-2)"},
                  {icon:"⎇",label:t("scenarios_available","Сценариев"),val:fmt(tier.scenarios),color:"#06b6d4"},
                  {icon:"📁",label:t("projects_available","Проектов"),val:fmt(tier.projects),color:"#12c482"},
                  {icon:"🤖",label:t("ai_level","AI уровень"),val:tier.ai,color:"#f09428"},
                ].map(s=>(
                  <div key={s.label} className="icard icard-stat" style={{"--icard-color":s.color,"--icard-glow":s.color+"33","--icard-bg":s.color+"09",padding:"16px",borderRadius:14,background:"var(--surface)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
                    <div className="icard-val" style={{fontSize:20,fontWeight:900,color:s.color,letterSpacing:-1}}>{s.val}</div>
                    <div className="icard-desc" style={{fontSize:13,marginTop:3}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{maxWidth:620}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:12}}>{t("current_plan","Возможности тарифа")}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {label:t("lpr2_f4","Клонирование карт"),ok:tier.clone},
                    {label:t("templates","Шаблоны стратегий"),ok:tier.templates},
                    {label:t("content_plan","Контент-план"),ok:tier.contentPlan},
                    {label:"White-label",ok:tier.wl},
                    {label:"API",ok:tier.api},
                    {label:t("export_pdf","Отчёты"),ok:tier.report},
                    {label:t("export_pptx","PowerPoint экспорт"),ok:tier.pptx},
                  ].map(f=>(
                    <div key={f.label} className="icard feat-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                      <span className="icard-title" style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>{f.label}</span>
                      <span style={{fontSize:13,fontWeight:700,color:f.ok?"#12c482":"var(--text5)"}}>{f.ok?"✓ "+t("done","Включено"):"✗ —"}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setTab("tier")} style={{marginTop:16,padding:"11px 22px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-1)",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  ↑ {t("upgrade_tier_arrow","Улучшить тариф →")}
                </button>
              </div>
            </div>
          )}

          {/* ── TIER TAB ── */}
          {tab==="tier"&&(
            <div className="tab-content" style={{display:"flex",width:"100%",overflow:"hidden",minHeight:380}}>
              <div style={{width:190,flexShrink:0,borderRight:"1px solid var(--border)",padding:"12px 8px",overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
                {TIER_ORDER.map(k=>{
                  const tierItem=TIERS[k];
                  const isSel=k===selected;
                  const isCur=k===user.tier;
                  return(
                    <button key={k} onClick={()=>setSelected(k)} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 11px",borderRadius:12,border:`1px solid ${isSel?tierItem.color+"66":"transparent"}`,background:isSel?tierItem.color+"12":"transparent",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                      <span style={{fontSize:15}}>{tierItem.badge}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13.5,fontWeight:700,color:isSel?tierItem.color:"var(--text)"}}>{tierItem.label}</div>
                        <div style={{fontSize:13.5,color:"var(--text4)",marginTop:1}}>{getTierPrice(k,t)}</div>
                      </div>
                      {isCur&&<div style={{width:6,height:6,borderRadius:"50%",background:tierItem.color,flexShrink:0}}/>}
                    </button>
                  );
                })}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"20px 22px"}}>
                {buyPhase==="processing"&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16}}>
                    <div style={{width:48,height:48,border:`3px solid ${selTier.color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{t("processing_payment","Обрабатываем платёж…")}</div>
                  </div>
                )}
                {buyPhase==="success"&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}>
                    <div style={{width:56,height:56,borderRadius:"50%",background:`${selTier.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>✓</div>
                    <div style={{fontSize:15,fontWeight:800,color:selTier.color}}>{t("tier_activated","Тариф {tier} активирован ✓").replace("{tier}",selTier.label)}</div>
                  </div>
                )}
                {!buyPhase&&(
                  <>
                    <div style={{padding:"14px 16px",borderRadius:14,background:selTier.gradient,border:`1px solid ${selTier.color}33`,marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span style={{fontSize:22}}>{selTier.badge}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:16,fontWeight:900,color:selTier.color}}>{selTier.label}</div>
                          <div style={{fontSize:13.5,color:"var(--text4)"}}>{selTier.desc}</div>
                        </div>
                        <div style={{fontSize:18,fontWeight:900,color:selTier.color}}>{getTierPrice(selected,t)}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                      {[["📁",fmt(selTier.projects),t("projects","проектов")],["🗺",fmt(selTier.maps),t("maps","карт")],["👥",fmt(selTier.users),t("members","участников")]].map(([ic,val,lbl])=>(
                        <div key={lbl} style={{borderRadius:10,padding:"10px 12px",background:"var(--surface)",border:"1px solid var(--border)",textAlign:"center"}}>
                          <div style={{fontSize:16,marginBottom:4}}>{ic}</div>
                          <div style={{fontSize:16,fontWeight:800,color:selTier.color}}>{val}</div>
                          <div style={{fontSize:13,color:"var(--text4)"}}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:16,padding:"12px 14px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:10}}>{t("tier_comparison","Сравнение тарифов")}</div>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(6,minmax(72px,1fr))":"repeat(6,1fr)",gap:0,fontSize:isMobile?11:12,minWidth:isMobile?432:"min(100%,520px)"}}>
                        <div style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",fontWeight:600,color:"var(--text4)"}}>{t("feature","Функция")}</div>
                        {TIER_ORDER.map(k=>(
                          <div key={k} style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",textAlign:"center",fontWeight:k===user.tier?700:500,color:k===user.tier?TIERS[k].color:"var(--text4)"}}>{TIERS[k].label}</div>
                        ))}
                        {ALL_FEATURES.slice(0,10).map(f=>(
                          <React.Fragment key={f.key}>
                            <div style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",color:"var(--text3)"}}>{f.label}</div>
                            {TIER_ORDER.map(k=>{
                              const v=f[TIER_FEAT_KEY[k]];
                              return(
                                <div key={k} style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",textAlign:"center"}}>
                                  {v===false?<span style={{color:"var(--text6)"}}>—</span>:v===true?<span style={{color:"#12c482",fontWeight:700}}>✓</span>:<span style={{color:"var(--text2)"}}>{String(v)}</span>}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    {isUpgrade&&!user.is_dev&&(
                      <div style={{marginBottom:16,padding:"14px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:12}}>{t("card_data_title","💳 Данные карты")}</div>
                        <input style={fi} placeholder={t("card_number_ph","Номер карты…")} value={cardNum} onChange={e=>setCardNum(formatCardNum(e.target.value))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        <input style={fi} placeholder={t("card_holder_ph","Имя держателя…")} value={cardName} onChange={e=>setCardName(e.target.value)} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <input style={{...fi,marginBottom:0}} placeholder={t("card_expiry_ph","ММ/ГГ")} value={cardExp} onChange={e=>setCardExp(formatExp(e.target.value))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                          <input style={{...fi,marginBottom:0}} placeholder={t("card_cvv_ph","CVV")} value={cardCvv} onChange={e=>setCardCvv(e.target.value.replace(/\D/g,"").slice(0,4))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        </div>
                        {cardError&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f04458",fontSize:13}}>⚠️ {cardError}</div>}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,paddingTop:12,marginTop:12,borderTop:"1px solid var(--border)"}}>
                          {["🔒 SSL","💳 Visa/MC","✓ PCI DSS"].map(b=><div key={b} style={{fontSize:13,color:"var(--text4)",fontWeight:500}}>{b}</div>)}
                        </div>
                      </div>
                    )}
                    {!isCurrentTier&&!isUpgrade&&(
                      <div style={{marginBottom:12,padding:"12px 14px",borderRadius:10,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",fontSize:13,color:"#f09428"}}>
                        <div style={{fontWeight:700,marginBottom:6}}>⚠️ {t("downgrade_warning","После смены тарифа часть данных может быть ограничена.")}</div>
                        {usage&&(usage.maps?.used>0||usage.projects?.used>0)&&(
                          <div style={{fontSize:12,marginBottom:6,opacity:.95}}>
                            {t("downgrade_you_have","У вас")}: {usage.maps?.used||0} {t("downgrade_maps_unit","карт")}, {usage.projects?.used||0} {t("downgrade_projects_unit","проектов")}
                          </div>
                        )}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                          <div style={{background:"rgba(245,158,11,.08)",borderRadius:7,padding:"6px 10px",fontSize:12}}>
                            <span style={{opacity:.7}}>{t("downgrade_limit_maps","Карт")}:</span> <strong>{selTier.maps===999?"∞":selTier.maps}</strong>
                          </div>
                          <div style={{background:"rgba(245,158,11,.08)",borderRadius:7,padding:"6px 10px",fontSize:12}}>
                            <span style={{opacity:.7}}>{t("downgrade_limit_projects","Проектов")}:</span> <strong>{selTier.projects===999?"∞":selTier.projects}</strong>
                          </div>
                        </div>
                        <div style={{fontSize:12,opacity:.8}}>{t("downgrade_excess","Данные сверх лимита станут доступны только для чтения.")}</div>
                      </div>
                    )}
                    {isCurrentTier?(
                      <div style={{padding:"13px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)",textAlign:"center",fontSize:13,color:"var(--text3)",fontWeight:600}}>{t("current_tier_badge","✓ Текущий тариф")}</div>
                    ):(
                      <button onClick={executeBuy} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${selTier.color},${selTier.color}cc)`,color:"#fff",fontSize:13.5,fontWeight:800,cursor:"pointer",boxShadow:`0 8px 24px ${selTier.color}40`,transition:"all .2s"}}
                        onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="none"}>
                        {isUpgrade?(user.is_dev?t("activate_btn","⚡ Активировать")+" "+selTier.label:"🔒 "+t("go_to_plan","Перейти на {plan} — {price}").replace("{plan}",selTier.label).replace("{price}",getTierPrice(selected,t))):t("downgrade_to","↓ Перейти на ")+selTier.label}
                      </button>
                    )}
                    {isUpgrade&&user.is_dev&&<div style={{textAlign:"center",marginTop:8,fontSize:13.5,color:"var(--text4)"}}>{t("demo_payment_skipped","Демо — оплата пропущена")}</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI: интервью и генерация карты (system prompts) ──
const OB_SYS=`Ты — опытный стратегический консультант уровня McKinsey. ГЛУБОКОЕ интервью для персонального плана.

ГЛУБИНА ПОНИМАНИЯ:
- Распознавай уровень: новичок (термины), опытный (проф. язык), эксперт (нюансы, edge cases)
- Читай между строк: неясный — уточни; короткий — углуби; выявляй НЕЯВНОЕ (конкуренты, ресурсы, страхи, сезонность, тренды, ограничения, скрытые цели)
- Эмоции: стресс/overwhelm — поддерживай; уверен — бросай вызов; сомневается — структурируй; перфекционист — фокус на действии
- Этап бизнеса: pre-seed/seed/growth — разные приоритеты

БАЗА ЗНАНИЙ: ${AI_KNOWLEDGE}

ПРАВИЛА:
- Ровно ОДИН вопрос за раз. Коротко (1–2 предложения).
- Выявляй: продукт, кто платит, ЦА, модель монетизации, узкое место, главный риск, ресурсы, дедлайны, сезонность, внешние факторы, типичные ошибки в отрасли.
- Адаптируй под отрасль. Глубокие вопросы — не поверхностные. Вопросы должны вести к actionable карте.
- Если ответ расплывчатый — задай уточняющий вопрос, но не более одного.
После 6-го ответа: READY`;

const MAP_GEN_SYS=`Создай стратегическую карту на основе интервью. МАКСИМАЛЬНАЯ ГЛУБИНА: учитывай ВСЁ из ответов.

ГЛУБОКИЙ АНАЛИЗ ПЕРЕД ГЕНЕРАЦИЕЙ:
- Отрасль, этап (pre-seed/seed/growth), ресурсы, риски, цели
- Сезонность, внешние факторы, типичные ошибки в отрасли
- Что пользователь подразумевал, но не сказал явно
- Воронка (маркетинг/продажи) или pipeline — логичная последовательность

БАЗА ЗНАНИЙ: ${AI_KNOWLEDGE}

Формат узлов:
- title: КОНКРЕТНОЕ ДЕЙСТВИЕ (глагол+объект). "Провести 15 интервью с ЦА", "Запустить лендинг и собрать 100 лидов" — НЕ "Анализ рынка"
- reason: ОБОСНОВАНИЕ — почему шаг нужен, какую проблему решает
- metric: ИЗМЕРИМЫЙ KPI — число, %, срок

СВЯЗИ: requires (A нужен для B), affects, blocks, follows. Реалистичная последовательность для отрасли. Избегай типичных ошибок (пропуск валидации, масштаб до PMF).

Верни ТОЛЬКО валидный JSON (без markdown):
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"high","progress":35,"tags":[]}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"requires","label":""}]}
7–9 узлов, X:150–900, Y:80–520. Связи — логичные (воронка, pipeline, последовательность).`;

// ── CookieConsent ──
function CookieConsent(){
  const{t}=useLang();
  const[shown,setShown]=useState(()=>{
    try{return!localStorage.getItem("sa_cookie_ok");}catch{return true;}
  });
  useEffect(()=>{bootstrapAnalyticsIfConsented();},[]);
  if(!shown)return null;
  function accept(){try{localStorage.setItem("sa_cookie_ok","1");}catch{}initAnalyticsAfterConsent();setShown(false);}
  return(
    <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"rgba(9,7,22,.92)",backdropFilter:"blur(20px) saturate(1.1)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(104,54,245,.28)",borderRadius:16,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,maxWidth:560,width:"92vw",boxShadow:"0 8px 40px rgba(0,0,0,.45),0 0 0 .5px rgba(104,54,245,.12)"}}>
      <span style={{fontSize:12,color:"rgba(188,186,224,.62)",flex:1,lineHeight:1.5}}>{t("cookie_text","🍪 Мы используем cookies для аналитики и улучшения сервиса. Продолжая, вы соглашаетесь с нашей")} <a href="/privacy" target="_blank" style={{color:"#b4a3ff",textDecoration:"underline"}}>{t("cookie_policy","Политикой конфиденциальности")}</a>.</span>
      <button onClick={accept} className="btn-interactive" style={{padding:"8px 18px",borderRadius:9,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("cookie_accept","Принять")}</button>
    </div>
  );
}

// ── Onboarding ──
function Onboarding({onDone,onBack,theme="dark"}){
  const{t}=useLang();
  const MAX_Q=6;
  const[msgs,setMsgs]=useState([]);
  const[inp,setInp]=useState("");
  const[loading,setLoading]=useState(false);
  const[generating,setGenerating]=useState(false);
  const[mapGenFailed,setMapGenFailed]=useState(false);
  const[history,setHistory]=useState([]);
  const[qCount,setQCount]=useState(0);
  const endRef=useRef(null);
  const inputRef=useRef(null);
  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  useEffect(()=>{if(!loading&&!generating){const t=setTimeout(()=>inputRef.current?.focus(),80);return()=>clearTimeout(t);}},[loading,generating]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью — задай первый вопрос."}]:hist,OB_SYS,300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{setMsgs(m=>[...m,{role:"ai",text:reply.trim()}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:t("ai_network_err","Не удалось получить ответ AI. Проверьте сеть и ключ API. Попробуйте ещё раз.")}]);
      setLoading(false);
    }
  }
  async function submit(){
    if(!inp.trim()||loading||generating)return;
    const text=inp.trim();setInp("");
    const newMsgs=[...msgs,{role:"user",text}];setMsgs(newMsgs);
    const aiMsg=msgs[msgs.length-1]?.text||"";
    const newHist=[...history,{role:"assistant",content:aiMsg},{role:"user",content:text}].filter(h=>h.content);
    setHistory(newHist);
    if(qCount>=MAX_Q){await buildMap(newHist);}else{await askNext(newHist);}
  }
  const defaultEdges=[{id:"e1",source:"n1",target:"n2",type:"requires",label:""},{id:"e2",source:"n2",target:"n4",type:"requires",label:""},{id:"e3",source:"n3",target:"n4",type:"affects",label:""}];
  async function buildMap(hist){
    setGenerating(true);setMapGenFailed(false);
    setMsgs(m=>[...m,{role:"ai",text:"Анализирую ваши ответы и строю персональную карту…"}]);
    const ctx=hist.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    try{
      const raw=await callAI([{role:"user",content:"Интервью:\n"+ctx+"\n\nСоздай стратегическую карту."}],MAP_GEN_SYS,1500);
      const clean=raw.replace(/```json|```/g,"").trim();
      const fallback=clean.match(/\{[\s\S]*\}/);
      const data=JSON.parse(fallback?fallback[0]:clean);
      onDone({nodes:data.nodes||[],edges:data.edges||[],ctx});
    }catch{
      setMapGenFailed(true);
      setMsgs(m=>[...m,{role:"ai",text:t("ai_map_fallback","AI не удалось создать карту. Нажмите «Повторить» или «Использовать шаблон».")}]);
    }finally{setGenerating(false);}
  }
  function useFallbackTemplate(){
    setMapGenFailed(false);
    const ctxFromHist=history.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    onDone({nodes:defaultNodes(),edges:defaultEdges,ctx:ctxFromHist||""});
  }
  const progress=Math.min(100,Math.round(qCount/MAX_Q*100));
  return(
    <div data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",position:"relative"}}>
<div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse 60% 40% at 50% 0%,var(--accent-glow) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",position:"relative",zIndex:10}}>
        <button onClick={onBack} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{t("back_btn","← Назад")}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>AI-интервью · {qCount}/{MAX_Q} вопросов</div>
          <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
            <div style={{height:"100%",width:progress+"%",background:"var(--gradient-accent)",borderRadius:2,transition:"width .4s ease"}}/>
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:12,maxWidth:720,margin:"0 auto",width:"100%"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
            <div style={{maxWidth:"80%",padding:"11px 15px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",background:m.role==="user"?"var(--accent-soft)":"var(--surface)",border:`1px solid ${m.role==="user"?"var(--accent-1)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
        {(loading||generating)&&(
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
            <div style={{display:"flex",gap:5,padding:"11px 15px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"4px 14px 14px 14px"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      {mapGenFailed&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:720,margin:"0 auto",width:"100%",flexWrap:"wrap"}}>
          <button onClick={()=>{setMapGenFailed(false);buildMap(history);}} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("retry","Повторить")}</button>
          <button onClick={useFallbackTemplate} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("use_template","Использовать шаблон")}</button>
        </div>
      )}
      {!generating&&!mapGenFailed&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:720,margin:"0 auto",width:"100%"}}>
          <input ref={inputRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}}
            placeholder={qCount>=MAX_Q?"Нажмите Enter для генерации карты…":"Ваш ответ…"}
            style={{flex:1,padding:"11px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"'Inter',system-ui,sans-serif"}}
            disabled={loading}/>
          <button onClick={submit} disabled={!inp.trim()||loading}
            style={{padding:"11px 22px",borderRadius:12,border:"none",background:inp.trim()&&!loading?"var(--gradient-accent)":"var(--surface)",color:inp.trim()&&!loading?"var(--accent-on-bg)":"var(--text4)",fontSize:14,fontWeight:700,cursor:inp.trim()&&!loading?"pointer":"not-allowed",transition:"all .15s"}}>
            {qCount>=MAX_Q?"Создать карту ✦":"Ответить →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── MiniMap ──
function MiniMap({nodes,edges,viewX,viewY,zoom,canvasW,canvasH,onJump,theme,statusMap}){
  const{t}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const W=180,H=110;
  if(!nodes.length)return null;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const minX=Math.min(...xs)-20,maxX=Math.max(...xs)+260,minY=Math.min(...ys)-20,maxY=Math.max(...ys)+148;
  const bw=maxX-minX||1,bh=maxY-minY||1;
  const sx=W/bw,sy=H/bh,s=Math.min(sx,sy)*.9;
  const ox=(W-bw*s)/2,oy=(H-bh*s)/2;
  const tx=n=>(n.x-minX)*s+ox,ty=n=>(n.y-minY)*s+oy;
  const vpW=(canvasW/zoom)*s,vpH=(canvasH/zoom)*s;
  const vpX=(-viewX/zoom-minX)*s+ox,vpY=(-viewY/zoom-minY)*s+oy;
  function handleClick(e){
    const rect=e.currentTarget.getBoundingClientRect();
    const cx=(e.clientX-rect.left)/W,cy=(e.clientY-rect.top)/H;
    const wx=minX+cx*bw,wy=minY+cy*bh;
    onJump(-(wx-canvasW/zoom/2)*zoom,-(wy-canvasH/zoom/2)*zoom);
  }
  return(
    <div onClick={handleClick} className="sa-mini-map-wrap" aria-label={t("minimap_hint","Миникарта")} title={t("minimap_hint","Миникарта")}
      style={{position:"absolute",bottom:28,right:28,width:W,height:H,borderRadius:14,overflow:"hidden",background:"var(--bg2)",border:".5px solid var(--b1)",boxShadow:"0 8px 24px rgba(0,0,0,.25)",cursor:"crosshair",zIndex:50}}>
      <svg width={W} height={H}>
        {edges.map(e=>{
          const s2=nodes.find(n=>n.id===e.source),t2=nodes.find(n=>n.id===e.target);
          if(!s2||!t2)return null;
          return <line key={e.id} x1={tx(s2)+12} y1={ty(s2)+7} x2={tx(t2)+12} y2={ty(t2)+7} stroke="var(--accent-1)" strokeWidth={1} opacity={0.35}/>;
        })}
        {nodes.map(n=>{
          const st=STATUS[n.status];
          return <rect key={n.id} x={tx(n)} y={ty(n)} width={24} height={14} rx={3} fill={st?st.c+"33":"var(--accent-soft)"} stroke={st?st.c:"var(--accent-1)"} strokeWidth={.8}/>;
        })}
        <rect className="sa-mini-map-vp" x={Math.max(0,vpX)} y={Math.max(0,vpY)} width={Math.min(vpW,W)} height={Math.min(vpH,H)} fill="rgba(104,54,245,.18)" stroke="var(--accent-1)" strokeWidth={1.2} strokeDasharray="4,3" pointerEvents="none"/>
      </svg>
    </div>
  );
}

// ── StatsPopup ──
function StatsPopup({nodes,edges,onClose,statusMap}){
  const{t}=useLang();
  const isMobile=useIsMobile();
  const STATUS=statusMap||getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const total=nodes.length;
  const[closing,setClosing]=useState(false);
  const handleClose=()=>{if(closing)return;setClosing(true);setTimeout(()=>onClose(),220);};
  if(total===0){
    return(
      <div className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.72))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,backdropFilter:"blur(16px)"}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
        <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{width:"min(96vw,420px)",borderRadius:20,padding:"28px 24px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:44,marginBottom:14}}>📊</div>
          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>{t("stats_title","Статистика")}</div>
          <div style={{fontSize:14,color:"var(--text4)",lineHeight:1.6}}>{t("stats_empty","Добавьте шаги на карту, чтобы увидеть аналитику.")}</div>
          <button onClick={handleClose} className="btn-interactive" style={{marginTop:20,padding:"10px 24px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("close","Закрыть")}</button>
        </div>
      </div>
    );
  }
  const done=nodes.filter(n=>n.status==="completed").length;
  const active=nodes.filter(n=>n.status==="active").length;
  const blocked=nodes.filter(n=>n.status==="blocked").length;
  const paused=nodes.filter(n=>n.status==="paused").length;
  const critical=nodes.filter(n=>n.priority==="critical").length;
  const overdue=nodes.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;
  const avgProg=total?Math.round(nodes.reduce((a,n)=>a+(n.progress||0),0)/total):0;
  const healthScore=total?Math.round(((done*1+active*.7+(total-done-active-blocked-paused)*.4)*100)/total):0;
  const statusBreakdown=Object.keys(STATUS).map(k=>{
    const count=nodes.filter(n=>n.status===k).length;
    return{k,count,pct:total?Math.round(count/total*100):0,c:STATUS[k].c,label:STATUS[k].label};
  }).filter(s=>s.count>0);
  const priorityBreakdown=Object.keys(PRIORITY).map(k=>{
    const count=nodes.filter(n=>n.priority===k).length;
    return{k,count,c:PRIORITY[k].c,label:PRIORITY[k].label};
  }).filter(p=>p.count>0);
  // SVG donut
  const R=42,cx=52,cy=52,strokeW=12;
  const circumference=2*Math.PI*R;
  let offset=0;
  const arcs=statusBreakdown.map(s=>{
    const dashLen=(s.count/total)*circumference;
    const arc={...s,dashLen,offset,dashArray:`${dashLen-1} ${circumference-dashLen+1}`};
    offset+=dashLen;
    return arc;
  });
  const healthColor=healthScore>=70?"#12c482":healthScore>=40?"#f09428":"#f04458";
  return(
    <div className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.72))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:150,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
      <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{width:isMobile?"100%":"min(96vw,620px)",maxHeight:isMobile?"88vh":"none",overflowY:"auto",borderRadius:isMobile?"18px 18px 0 0":20,padding:"24px 26px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"var(--text)",letterSpacing:-.3}}>📊 Аналитика карты</div>
            <div style={{fontSize:13.5,color:"var(--text4)",marginTop:2}}>{total} шагов · {edges.length} связей</div>
          </div>
          <button onClick={handleClose} style={{width:36,height:36,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} onMouseOver={e=>e.currentTarget.style.background="var(--surface2)"} onMouseOut={e=>e.currentTarget.style.background="var(--surface)"}>×</button>
        </div>
        {/* Top: donut + score */}
        <div style={{display:"flex",gap:22,marginBottom:20,alignItems:"center"}}>
          {/* Donut chart */}
          <div style={{position:"relative",flexShrink:0}}>
            <svg width={104} height={104}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--surface2)" strokeWidth={strokeW}/>
              {arcs.map((arc,i)=>(
                <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={arc.c} strokeWidth={strokeW}
                  strokeDasharray={arc.dashArray} strokeDashoffset={-arc.offset}
                  style={{transform:`rotate(-90deg)`,transformOrigin:`${cx}px ${cy}px`,transition:"stroke-dasharray .6s ease"}}/>
              ))}
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:healthColor,lineHeight:1}}>{healthScore}</div>
              <div style={{fontSize:12,color:"var(--text5)",fontWeight:600,marginTop:1}}>HEALTH</div>
            </div>
          </div>
          {/* Key metrics */}
          <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[[done,"✅",t("completed","Выполнено"),"#12c482"],[active,"⚡",t("in_progress","В работе"),"#06b6d4"],[blocked,"🔒","Блокировано","#f04458"],[overdue,"⚠️",t("overdue","Просрочено"),"#f09428"],[critical,"🔴","Критичных","#f04458"],[edges.length,"🔗","Связей","var(--accent-2)"]].map(([v,ic,lbl,col])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                <span style={{fontSize:13}}>{ic}</span>
                <div>
                  <div style={{fontSize:16,fontWeight:900,color:v>0?col:"var(--text4)",lineHeight:1}}>{v}</div>
                  <div style={{fontSize:12.5,color:"var(--text5)"}}>{lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Average progress bar */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:13,color:"var(--text3)",fontWeight:600}}>{t("avg_prog","Средний прогресс")}</span>
            <span style={{fontSize:13,fontWeight:900,color:"var(--accent-1)"}}>{avgProg}%</span>
          </div>
          <div style={{height:10,borderRadius:5,background:"var(--surface2)",overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",inset:0,height:"100%",width:avgProg+"%",background:"var(--gradient-accent)",borderRadius:5,transition:"width .7s cubic-bezier(.34,1.56,.64,1)"}}/>
          </div>
        </div>
        {/* Status breakdown */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>{t("by_statuses","По статусам")}</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {statusBreakdown.map(s=>(
              <div key={s.k} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:8,height:8,borderRadius:2,background:s.c,flexShrink:0}}/>
                <div style={{fontSize:13,color:"var(--text2)",width:110,flexShrink:0,fontWeight:600}}>{s.label}</div>
                <div style={{flex:1,height:5,borderRadius:3,background:"var(--surface2)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:s.pct+"%",background:s.c,borderRadius:3,transition:"width .5s ease"}}/>
                </div>
                <div style={{fontSize:13,color:"var(--text4)",width:30,textAlign:"right",fontWeight:700}}>{s.count} <span style={{color:"var(--text5)",fontWeight:400}}>{s.pct}%</span></div>
              </div>
            ))}
          </div>
        </div>
        {/* Priority breakdown */}
        {priorityBreakdown.length>0&&(
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>{t("by_priorities","По приоритетам")}</div>
            <div style={{display:"flex",gap:8}}>
              {priorityBreakdown.map(p=>(
                <div key={p.k} style={{flex:1,padding:"8px",borderRadius:10,background:`${p.c}10`,border:`1px solid ${p.c}25`,textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:p.c}}>{p.count}</div>
                  <div style={{fontSize:12.5,color:"var(--text5)",marginTop:2}}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RichEditorPanel ── (aiPanelOpen: сдвигает влево, чтобы не перекрывать AI; isMobile: полноэкранная панель)
function RichEditorPanel({node,ctx,readOnly,userName,onUpdate,onDelete,onClose,allNodes=[],allEdges=[],onScrollTo,onConnect,onError,onNotify,aiPanelOpen,isMobile,statusMap,etypeMap}){
  const{t,lang}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const ETYPE=etypeMap||getETYPE(t);
  const[tab,setTab]=useState("info");
  const[showMore,setShowMore]=useState(false);
  const[newComment,setNewComment]=useState("");
  const[aiRephrLoading,setAiRephrLoading]=useState(false);
  const[aiCommentLoading,setAiCommentLoading]=useState(false);
  const[autoConnLoading,setAutoConnLoading]=useState(false);
  const[exiting,setExiting]=useState(false);
  const handleClose=()=>{if(exiting)return;setExiting(true);setTimeout(()=>onClose(),320);};
  const comments=node.comments||[];
  const history=node.history||[];
  const accentPick=(STATUS.planning&&STATUS.planning.c)||"#6836f5";
  const COLORS=["",accentPick,(ETYPE.affects&&ETYPE.affects.c)||"#a050ff","#06b6d4","#12c482","#f09428","#f04458","#ec4899","#0891b2","#84cc16","#ea580c"];

  async function aiRephrase(){
    if(aiRephrLoading)return;
    setAiRephrLoading(true);
    const nodeEdges=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id);
    const connStr=nodeEdges.length?nodeEdges.map(e=>{const s=allNodes.find(n=>n.id===(e.source||e.from)),t=allNodes.find(n=>n.id===(e.target||e.to));return `${s?.title||""} ${e.type||"→"} ${t?.title||""}`;}).join("; "):"нет";
    try{
      const raw=await callAI([{role:"user",content:`Перефразируй шаг стратегической карты. Сделай название КОНКРЕТНЫМ ДЕЙСТВИЕМ (глагол+объект).
Текущее: ${node.title||""}
Причина: ${node.reason||"нет"}
Действие: ${node.action||"нет"}
Метрика: ${node.metric||"нет"}
Контекст: ${ctx||"стартап"}
Связи: ${connStr}

Правила: title — название (глагол+объект), reason — зачем, action — что именно сделать (конкретное действие), metric — измеримый результат. Учитывай связи и отрасль. Формулировка — actionable.
Верни ТОЛЬКО JSON: {"title":"...","reason":"...","action":"...","metric":"..."}`}],"Ты редактор стратегических карт. Делай формулировки конкретными: название + зачем + что сделать + результат. Без воды.",400);
      let p;
      try{p=JSON.parse(raw.replace(/```json|```/g,"").trim());}
      catch{const m=raw.match(/\{[\s\S]*\}/);p=m?JSON.parse(m[0]):null;}
      if(p?.title){
        const hEntry={id:uid(),type:"ai_rephrase",at:Date.now(),by:"AI ✦",before:{title:node.title},after:{title:p.title}};
        onUpdate({...p,action:p.action!=null?p.action:node.action,history:[...history,hEntry]});
      }else{onError?.(t("ai_rephrase_no_result","AI не смог перефразировать. Попробуйте ещё раз."));}
    }catch(e:any){onError?.(e?.message||t("ai_rephrase_error","Ошибка AI. Проверьте сеть и ключ API."));}
    setAiRephrLoading(false);
  }

  async function addComment(){
    const text=newComment.trim();
    if(!text)return;
    if(text.startsWith("@AI")||text.startsWith("@ai")){
      const q=text.replace(/^@[Aa][Ii]\s*/,"");
      const userMsg={id:uid(),author:userName,text,at:Date.now()};
      const aiPlaceholder={id:uid(),author:"AI ✦",text:"…",at:Date.now()+1,isAI:true};
      const base=[...comments,userMsg];
      onUpdate({comments:[...base,aiPlaceholder]});
      setNewComment("");
      setAiCommentLoading(true);
      try{
        const nodeEdges=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id);
        const connStr=nodeEdges.length?nodeEdges.map(e=>{const s=allNodes.find(n=>n.id===(e.source||e.from)),t=allNodes.find(n=>n.id===(e.target||e.to));return `${s?.title||""} ${e.type||"→"} ${t?.title||""}`;}).join("; "):"нет";
        const answer=await callAI([{role:"user",content:`Вопрос по шагу "${node.title||""}" (зачем: ${node.reason||"-"}, что сделать: ${node.action||"-"}, метрика: ${node.metric||"-"}): ${q}\nКонтекст: ${ctx||"стартап"}. Связи: ${connStr}\nОтветь кратко. Дай ТОЛЬКО конкретное действие — что сделать, зачем, как измерить. Без общих фраз.`}],"Ты AI-советник. Отвечай ТОЛЬКО конкретными действиями и измеримым результатом. Формат: что сделать → зачем → метрика. Без воды.",300);
        onUpdate({comments:[...base,{...aiPlaceholder,text:answer}]});
      }catch(e:any){onUpdate({comments:[...base,{...aiPlaceholder,text:t("ai_comment_error","Ошибка AI. Попробуйте ещё раз.")}]});onError?.(e?.message||t("ai_comment_error","Ошибка AI. Попробуйте ещё раз."));}
      setAiCommentLoading(false);
    }else{
      const c={id:uid(),author:userName,text,at:Date.now()};
      onUpdate({comments:[...comments,c]});
      setNewComment("");
    }
  }

  async function doAutoConnect(){
    if(autoConnLoading||allNodes.length<2)return;
    setAutoConnLoading(true);
    const others=allNodes.filter(n=>n.id!==node.id).map(n=>`${n.id}:${n.title}${n.reason?" ("+n.reason+")":""}`);
    const existingForNode=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id);
    const prompt=`Узел: "${node.title}" (${node.reason||"-"}, метрика: ${node.metric||"-"}).
Контекст: ${ctx||"стартап"}

Другие узлы (id:title): ${others.join("; ")}

Уже есть связей у этого узла: ${existingForNode.length}. ${existingForNode.length?existingForNode.map(e=>`${e.source||e.from}→${e.target||e.to}:${e.type}`).join(", "):""}

Связи: [{"from":"${node.id}","to":"id_другого_узла","type":"requires|affects|blocks|follows"}]. Максимум 3, только логичные. requires: A нужен для B. affects: A влияет. blocks: A блокирует. follows: B после A. Используй ID из списка "Другие узлы".`;
    try{
      const raw=await callAI([{role:"user",content:prompt}],"Ты стратег. Учитывай отрасль и бизнес-контекст. Определи логические зависимости. Верни ТОЛЬКО JSON массив [{from,to,type}]. Используй ID узлов из запроса.",400);
      const clean=raw.replace(/```json|```/g,"").trim();
      let arr;
      try{const p=JSON.parse(clean);arr=Array.isArray(p)?p:(p.connections||p.edges||[]);}catch{arr=[];}
      const valid=arr.filter(e=>e.from&&e.to&&e.from!==e.to&&allNodes.find(n=>n.id===e.to||n.id===e.from));
      const toAdd=valid.filter(ne=>!allEdges.find(ex=>(ex.source===ne.from&&ex.target===ne.to)||(ex.from===ne.from&&ex.to===ne.to)));
      if(toAdd.length>0){
        toAdd.forEach(e=>{onConnect&&onConnect({source:e.from,target:e.to,type:e.type||"requires"});});
        onNotify?.(t("links_added","🔗 Добавлено: {n} связей").replace("{n}",String(toAdd.length)),"success");
      }else{onNotify?.(t("links_optimal","Связи уже оптимальны"),"info");}
    }catch(e:any){onError?.(e?.message||t("ai_autoconnect_error","Ошибка AI. Попробуйте ещё раз."));}
    setAutoConnLoading(false);
  }

  const iS=useMemo<React.CSSProperties>(()=>({width:"100%",padding:"10px 12px",fontSize:13,background:"rgba(255,255,255,.04)",border:"1px solid var(--glass-border-accent,var(--input-border))",borderRadius:10,color:"var(--text)",outline:"none",fontFamily:"'Inter',system-ui,sans-serif",transition:"border-color .2s",backdropFilter:"blur(8px)"}),[]);
  const iSTextarea=useMemo<React.CSSProperties>(()=>({...iS,resize:"vertical",minHeight:40,maxHeight:160,overflowY:"auto",wordBreak:"break-word"}),[iS]);
  const connCount=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id).length;
  const tabs=useMemo(()=>[
    ["info","◆ "+t("tab_info","Инфо")] as const,
    ["comments",`💬${comments.length?" "+comments.length:""}`] as const,
    ["connections",`⇄${connCount?" "+connCount:""}`] as const,
    ["history",`⏱${history.length?" "+history.length:""}`] as const,
  ],[t,comments.length,connCount,history.length]);

  // focus trap внутри шторки
  const panelRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(e.key==="Escape"){e.preventDefault();handleClose();return;}
      if(e.key!=="Tab"||!panelRef.current)return;
      const focusable=panelRef.current.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if(focusable.length===0)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const panelRight=isMobile?0:aiPanelOpen?360:0;
  const panelWidth=isMobile?"100%":aiPanelOpen?320:340;
  const panelStyle: React.CSSProperties=isMobile?{position:"fixed",left:0,right:0,top:0,bottom:0,width:"100%",maxWidth:480,marginLeft:"auto",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:50,boxShadow:"-16px 0 48px rgba(0,0,0,.3)",borderRadius:0}:{position:"absolute",right:panelRight,top:0,bottom:0,width:panelWidth,borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:40,boxShadow:"-16px 0 48px rgba(0,0,0,.2)",borderRadius:"16px 0 0 0"};
  return(
    <div ref={panelRef} role="dialog" aria-modal="false" aria-label={t("editor_panel","Редактор шага")}
         className={`glass-panel panel-slide ${exiting?"panel-slide-out":""}`.trim()} style={panelStyle}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:"1px solid var(--glass-border-accent,var(--border))",flexShrink:0,background:"rgba(255,255,255,.02)",backdropFilter:"blur(12px)"}}>
        <div style={{width:10,height:10,borderRadius:3,background:STATUS[node.status]?.c||"var(--accent-1)",flexShrink:0}}/>
        <div style={{flex:1,fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{node.title||t("untitled","Без названия")}</div>
        {onScrollTo&&<IconButton size={36} onClick={()=>onScrollTo(node)} title={t("find_on_map","Найти на карте")} aria-label={t("find_on_map","Найти на карте")} style={{borderRadius:10}}>↗</IconButton>}
        <IconButton size={36} danger onClick={handleClose} title={t("close","Закрыть")} aria-label={t("close","Закрыть")} style={{borderRadius:10,fontSize:16}}>×</IconButton>
      </div>
      <div className="tabs" role="tablist" style={{margin:"10px 14px 6px",overflowX:"auto",flexShrink:0}}>
        {tabs.map(item=>{
          const k=item[0],lbl=item[1];
          const isActive=tab===k;
          return <button key={k} role="tab" aria-selected={isActive} className={"tab"+(isActive?" on":"")} onClick={()=>setTab(k)} style={{flex:1,whiteSpace:"nowrap",fontSize:12}}>{lbl}</button>;
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--text4)",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {t("title","Название")}
                {!readOnly&&<button onClick={aiRephrase} disabled={aiRephrLoading} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:aiRephrLoading?"var(--text4)":"var(--accent-2)",cursor:aiRephrLoading?"wait":"pointer",transition:"all .2s"}}>{aiRephrLoading?"…":"✨ AI"}</button>}
              </div>
              <textarea value={node.title||""} onChange={e=>!readOnly&&onUpdate({title:e.target.value})} rows={1} style={{...iSTextarea,minHeight:44,maxHeight:80}} readOnly={readOnly} placeholder={t("title","Название шага")}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--text4)",marginBottom:6}}>{t("why_label","Зачем?")} <span style={{fontSize:11,color:"var(--text5)",fontWeight:400}}>(описание)</span></div>
              <textarea value={node.reason||""} onChange={e=>!readOnly&&onUpdate({reason:e.target.value})} placeholder={t("why_placeholder","Зачем этот шаг, какой результат нужен")} rows={2} style={{...iSTextarea,minHeight:56}} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--accent-2)",marginBottom:6}}>{t("action_label","Что сделать")} <span style={{fontSize:11,color:"var(--text5)",fontWeight:400}}>(конкретное действие)</span></div>
              <textarea value={node.action||""} onChange={e=>!readOnly&&onUpdate({action:e.target.value})} placeholder={t("action_placeholder","Напр.: Провести 15 интервью с ЦА до пятницы")} rows={2} style={{...iSTextarea,minHeight:56,borderColor:"var(--accent-1)"}} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--text4)",marginBottom:6}}>{t("metric_label","Метрика")}</div>
              <input value={node.metric||""} onChange={e=>!readOnly&&onUpdate({metric:e.target.value})} style={{...iS,resize:undefined}} readOnly={readOnly}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:4}}>{t("status","Статус")}</div>
                <CustomSelect value={node.status||"planning"} onChange={v=>!readOnly&&onUpdate({status:v})} disabled={readOnly} style={{width:"100%"}} options={Object.entries(STATUS).map(([k,s]:[string,{label:string;c:string}])=>({value:k,label:s.label,dot:s.c}))}/>
              </div>
              <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:4}}>{t("priority","Приоритет")}</div>
                <CustomSelect value={node.priority||"medium"} onChange={v=>!readOnly&&onUpdate({priority:v})} disabled={readOnly} style={{width:"100%"}} options={Object.entries(PRIORITY).map(([k,p]:[string,{label:string;c:string}])=>({value:k,label:p.label,dot:p.c}))}/>
              </div>
            </div>
            <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:4}}>{t("progress","Прогресс")} <span style={{color:"var(--accent-1)",fontWeight:700}}>{node.progress||0}%</span></div>
              <input type="range" min={0} max={100} value={node.progress||0} onChange={e=>!readOnly&&onUpdate({progress:+e.target.value})} style={{width:"100%",accentColor:"var(--accent-1)"}} disabled={readOnly}/>
            </div>
            {showMore&&(
              <div style={{display:"flex",flexDirection:"column",gap:12,paddingTop:8,borderTop:"1px solid var(--border)",animation:"slideDown .25s ease"}}>
                <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:4}}>{t("node_deadline","Дедлайн")}</div>
                  <input type="date" value={node.deadline||""} onChange={e=>!readOnly&&onUpdate({deadline:e.target.value})} style={{...iS,resize:undefined}} readOnly={readOnly}/>
                </div>
                <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:4}}>{t("tags_label","Теги")}</div>
                  <input value={(node.tags||[]).join(", ")} onChange={e=>!readOnly&&onUpdate({tags:e.target.value.split(",").map(tc=>tc.trim()).filter(Boolean)})} placeholder="тег1, тег2" style={{...iS,resize:undefined}} readOnly={readOnly}/>
                </div>
                <div><div style={{fontSize:11,fontWeight:600,color:"var(--text5)",marginBottom:6}}>{t("node_color_label","Цвет")}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {COLORS.map((c,i)=>(
                      <div key={i} onClick={()=>!readOnly&&onUpdate({color:c})} style={{width:20,height:20,borderRadius:6,background:c||"var(--surface2)",border:(node.color||"")===(c)?"2px solid var(--text)":"1px solid var(--border)",cursor:readOnly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"var(--text5)",transition:"all .15s"}}>{!c&&"∅"}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button onClick={()=>setShowMore(s=>!s)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text4)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
              {showMore?"▲ "+t("collapse","Свернуть"):"▼ "+t("details","Детали")}
            </button>
            {!readOnly&&(
              <div style={{display:"flex",gap:6,paddingTop:4}}>
                {onConnect&&<button onClick={()=>onConnect({startNode:node})} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>⇒ {t("link_btn","Связать")}</button>}
                <button onClick={doAutoConnect} disabled={autoConnLoading} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:autoConnLoading?"var(--text4)":"var(--accent-2)",cursor:autoConnLoading?"wait":"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>{autoConnLoading?"…":"✦ AI"}</button>
                <button onClick={()=>onDelete(node.id)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.08)",color:"#f04458",cursor:"pointer",fontSize:12,transition:"all .2s"}}>🗑</button>
              </div>
            )}
          </div>
        )}
        {tab==="comments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {comments.length===0&&<div style={{padding:"20px",textAlign:"center",color:"var(--text5)",fontSize:13,border:"1px dashed var(--border2)",borderRadius:8}}>{t("no_comments2","Нет комментариев.")}<br/><span style={{fontSize:13}}>{t("use_ai_comment","Используйте @AI чтобы задать вопрос AI.")}</span></div>}
            {comments.map(c=>(
              <div key={c.id} style={{padding:"9px 11px",borderRadius:9,background:c.isAI?"var(--accent-soft)":"var(--surface)",border:`1px solid ${c.isAI?"var(--accent-1)":"var(--border)"}`,position:"relative"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:c.isAI?"var(--gradient-accent)":"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:c.isAI?"var(--accent-on-bg)":"var(--text4)",fontWeight:700,flexShrink:0}}>{c.isAI?"✦":(c.author||"?")[0].toUpperCase()}</div>
                  <div style={{fontSize:13.5,fontWeight:700,color:c.isAI?"var(--accent-2)":"var(--text3)"}}>{c.author}</div>
                  <div style={{fontSize:12,color:"var(--text5)",marginLeft:"auto"}}>{new Date(c.at).toLocaleString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                  {!readOnly&&!c.isAI&&<button onClick={()=>onUpdate({comments:comments.filter(x=>x.id!==c.id)})} style={{width:16,height:16,borderRadius:4,border:"none",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
                </div>
                <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{c.text}</div>
                {c.text==="…"&&aiCommentLoading&&<div style={{display:"flex",gap:3,marginTop:4}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>}
              </div>
            ))}
            {!readOnly&&(
              <div style={{marginTop:4,borderTop:"1px solid var(--border)",paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={t("comment_placeholder","Комментарий… или @AI вопрос (Ctrl+Enter)")} rows={2} onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();addComment();}}} style={{...iSTextarea,lineHeight:1.5}}/>
                <button onClick={addComment} disabled={!newComment.trim()||aiCommentLoading} style={{padding:"7px",borderRadius:8,border:"none",background:newComment.trim()&&!aiCommentLoading?"var(--gradient-accent)":"var(--surface2)",color:newComment.trim()&&!aiCommentLoading?"var(--accent-on-bg)":"var(--text4)",fontSize:13,cursor:newComment.trim()&&!aiCommentLoading?"pointer":"not-allowed",fontWeight:600}}>{aiCommentLoading?t("ai_replying","AI отвечает…"):t("send","Отправить")}</button>
              </div>
            )}
          </div>
        )}
        {tab==="connections"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(()=>{
              const allE=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id);
              if(allE.length===0)return <div style={{padding:"20px",textAlign:"center",color:"var(--text5)",fontSize:13,border:"1px dashed var(--border2)",borderRadius:8}}>{t("no_edges","Нет связей.")}<br/>{t("use_connect","Используйте ⇒ Связать или ✦ AI-связи.")}</div>;
              const outgoing=allE.filter(e=>(e.source||e.from)===node.id);
              const incoming=allE.filter(e=>(e.target||e.to)===node.id);
              function ConnSection({title,edges}){
                if(!edges.length)return null;
                return(
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{title}</div>
                    {edges.map(e=>{
                      const otherId=(e.source||e.from)===node.id?(e.target||e.to):(e.source||e.from);
                      const other=allNodes.find(n=>n.id===otherId);
                      const et=ETYPE[e.type]||ETYPE.requires;
                      return(
                        <div key={e.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:5,cursor:"pointer"}}
                          onClick={()=>onScrollTo&&onScrollTo(other)}>
                          <div style={{width:7,height:7,borderRadius:2,background:et.c,flexShrink:0}}/>
                          <div style={{flex:1,fontSize:13,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{other?.title||t("deleted","Удалён")}</div>
                          <div style={{fontSize:12,color:et.c,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{et.label}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return(
                <React.Fragment>
                  <ConnSection title={`→ ${t("outgoing","Исходящие")} (${outgoing.length})`} edges={outgoing}/>
                  <ConnSection title={`← ${t("incoming","Входящие")} (${incoming.length})`} edges={incoming}/>
                </React.Fragment>
              );
            })()}
          </div>
        )}
        {tab==="history"&&(
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {history.length===0&&<div style={{padding:"20px",textAlign:"center",color:"var(--text5)",fontSize:13,border:"1px dashed var(--border2)",borderRadius:8}}>{t("history_empty2","История изменений пуста.")}</div>}
            {[...history].reverse().map(h=>(
              <div key={h.id} style={{padding:"9px 11px",borderRadius:9,background:"var(--surface)",border:"1px solid var(--border)"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13.5,fontWeight:700,color:h.type==="ai_rephrase"?"var(--accent-2)":"var(--text3)"}}>{h.type==="ai_rephrase"?"✦ "+t("ai_rephrased","AI переформулировал"):"✏️ "+t("changed","Изменено")}</span>
                  <span style={{fontSize:12,color:"var(--text5)",marginLeft:"auto"}}>{new Date(h.at).toLocaleString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div style={{fontSize:13,color:"var(--text4)",marginBottom:3}}>{t("author","Автор")}: {h.by}</div>
                {h.before?.title&&<div style={{fontSize:13,color:"var(--text5)",padding:"3px 7px",background:"rgba(239,68,68,.04)",borderRadius:5,borderLeft:"2px solid rgba(239,68,68,.3)",marginBottom:2}}>{t("before","До")}: {h.before.title}</div>}
                {h.after?.title&&<div style={{fontSize:13,color:"var(--text3)",padding:"3px 7px",background:"rgba(16,185,129,.04)",borderRadius:5,borderLeft:"2px solid rgba(16,185,129,.3)"}}>{t("after","После")}: {h.after.title}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AiPanel ── (isMobile: полноэкранная панель)
function AiPanel({nodes,edges,ctx,tier,onAddNode,onClose,externalMsgs=[],onClearExternal,projectName="",mapName="",userName="",msgs:msgsProp,onMsgsChange,onError,isMobile,embedded=false,statusMap}){
  const{t}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const tierCfg=AI_TIER[tier]||AI_TIER.free;
  const meta={projectName,mapName,userName};
  const[localMsgs,setLocalMsgs]=useState([]);
  const isControlled=onMsgsChange&&msgsProp;
  const msgs=isControlled?msgsProp:localMsgs;
  const setMsgs=isControlled?onMsgsChange:setLocalMsgs;
  const[inp,setInp]=useState("");
  const[load,setLoad]=useState(false);
  const[exiting,setExiting]=useState(false);
  const handleClose=()=>{if(exiting)return;setExiting(true);setTimeout(()=>onClose(),320);};
  const endRef=useRef(null);
  const inpRef=useRef<HTMLInputElement>(null);
  const initRef=useRef(false);
  useLayoutEffect(()=>{
    const pending=consumePendingAiPrompt();
    if(pending)setInp(pending);
  },[]);
  const panelHealth=useMemo(()=>{
    const done=nodes.filter((n:any)=>n.status==="completed").length;
    const h=nodes.length?Math.round((done/nodes.length)*100):0;
    return{h,done};
  },[nodes]);

  // Только при первом открытии — приветствие, если чат пуст. Чат НЕ очищается при смене tier или закрытии панели.
  useEffect(()=>{
    if(msgs.length>0)return;
    const greetings={
      free:t("ai_greet_free","Привет! Я AI-стратег: помогу выбрать следующий шаг и метрику. Чипы ниже — быстрый старт."),
      starter:t("ai_greet_starter","Привет! Я ваш стратегический помощник: риски, маркетинг, продажи — в привязке к карте. Спросите или нажмите чип."),
      pro:t("ai_greet_pro","Привет! Режим Pro: SWOT, Porter, OKR, CAC/LTV, MEDDIC. Дам диагноз → действия → риск → быструю победу."),
      team:t("ai_greet_team","Добрый день. Партнёрский режим: GTM, unit economics, Blue Ocean. Executive insight и топ-приоритеты по вашей карте."),
      enterprise:t("ai_greet_enterprise","Добрый день. Коллегиум C-level: стратегия, маркетинг, продажи, финансы. Ищем non-obvious ходы и слепые зоны."),
    };
    if(!initRef.current){initRef.current=true;setMsgs([{role:"ai",text:greetings[tier]||greetings.free}]);}
  },[tier,t]);

  // Inject external messages (e.g. from autoConnect)
  useEffect(()=>{
    if(externalMsgs&&externalMsgs.length>0){
      setMsgs((m:any[])=>[...m,...externalMsgs.map((em:any)=>({role:"ai",text:em.content}))]);
      onClearExternal&&onClearExternal();
    }
  },[externalMsgs]);

  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=scrollRef.current;
    if(!el){endRef.current?.scrollIntoView({behavior:"smooth"});return;}
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<160;
    if(nearBottom||msgs.length<=1)endRef.current?.scrollIntoView({behavior:"smooth",block:"end"});
  },[msgs]);
  useEffect(()=>{if(!load)inpRef.current?.focus();},[load]);

  const quickByTier=useMemo(()=>({
    free:[t("qf_add","Что добавить?"),t("qf_risks","Главные риски?"),t("qf_premortem","Pre-mortem: что убьёт план?"),t("qf_exp","Один эксперимент на неделю"),t("qf_next","Следующий шаг?"),t("qf_stuck","Застрял — что делать?"),t("qf_wrong","Что не так?")],
    starter:[t("qs_analyze","Проанализируй карту"),t("qs_second","Second-order эффекты"),t("qs_find_risks","Найди риски"),t("qs_propose","Предложи шаги"),t("qs_msales","Маркетинг / продажи"),t("qs_start","С чего начать?"),t("qs_miss","Что упускаю?"),t("qs_wrong","Что не так?")],
    pro:[t("qp_full","Полный анализ"),t("qp_second","Second-order effects"),t("qp_bottleneck","Узкие места"),t("qp_risks","Риски и контрмеры"),t("qp_prio","Приоритизируй"),t("qp_unit","CAC/LTV и runway"),t("qp_sales","Sales pipeline"),t("qp_miss","Что я упускаю?"),t("qp_pre","Pre-mortem")],
    team:[t("qt_audit","Стратегический аудит"),t("qt_unit","Unit economics"),t("qt_gtm","GTM рекомендации"),t("qt_comp","Конкурентный анализ"),t("qt_scale","Точки масштабирования"),t("qt_blue","Blue Ocean"),t("qt_non","Non-obvious риск"),t("qt_blind","Strategic blind spots"),t("qt_cap","Капитальная эффективность")],
    enterprise:[t("qe_exec","Executive audit"),t("qe_bcg","BCG / сценарии"),t("qe_okr","OKR для карты"),t("qe_dd","Due diligence угол"),t("qe_cmo","CMO/CRO угол"),t("qe_reg","Reg / data риск"),t("qe_blind","Strategic blind spots"),t("qe_non","Non-obvious move"),t("qe_pre","Pre-mortem сценарий")],
  }),[t]);
  const allQuick=quickByTier[tier]||quickByTier.free;
  const QUICK_SHOW=4;
  const[showMoreQuick,setShowMoreQuick]=useState(false);
  const quick=showMoreQuick?allQuick:allQuick.slice(0,QUICK_SHOW);

  const aiFreeTier=tier==="free";
  async function send(text?: string){
    const q=text||inp.trim();
    if(!q||load)return;
    if(aiFreeTier){
      setMsgs(m=>[...m,{role:"user",text:q},{role:"sys",text:t("ai_free_upgrade","AI-чат доступен с тарифа Starter. Улучшите тариф в профиле →")}]);
      return;
    }
    setInp("");
    const nM=[...msgs,{role:"user",text:q}];
    setMsgs(nM);
    setLoad(true);
    const mapSummary=nodes.map(n=>`${n.title}|${n.reason||"-"}|${n.action||"-"}|${n.metric||"-"}|${STATUS[n.status]?.label||n.status}|${n.progress||0}%|${PRIORITY[n.priority]?.label||n.priority}${n.deadline?"|📅"+n.deadline:""}${n.tags?.length?"|"+n.tags.join(","):""}`).join("\n");
    const edgesSummary=edges.length?edges.map(e=>{const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);return`${s?.title||e.source} → ${t?.title||e.target}: ${e.type||"requires"}`;}).join("\n"):"нет";
    const done=nodes.filter(n=>n.status==="completed").length;
    const blocked=nodes.filter(n=>n.status==="blocked").length;
    const critical=nodes.filter(n=>n.priority==="critical"&&n.status!=="completed").length;
    const overdue=nodes.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;
    const health=nodes.length?Math.round((done/nodes.length)*100):0;
    const stats=`Health: ${health}% | Выполнено: ${done} | Заблокировано: ${blocked} | Критичных: ${critical} | Просрочено: ${overdue}`;
    const fullCtx={mapSummary,edgesSummary,stats,nodes,edges};
    const sys=tierCfg.system(ctx||"",mapSummary,meta,fullCtx);
    try{
      const maxHist=tier==="enterprise"?24:tier==="team"?20:16;
      const history=nM.slice(-maxHist).map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text}));
      const reply=await callAI(history,sys,tier==="enterprise"||tier==="team"?1500:1200);
      // Parse <ADD> tags for new nodes
      const addMatch=reply.match(/<ADD>([\s\S]*?)<\/ADD>/);
      let displayReply=reply.replace(/<ADD>[\s\S]*?<\/ADD>/g,"").trim();
      setMsgs(m=>[...m,{role:"ai",text:displayReply}]);
      if(addMatch&&onAddNode){
        try{
          const raw=addMatch[1].replace(/[\r\n]/g," ").trim();
          const fallback=raw.match(/\{[\s\S]*\}/);
          const nodeData=JSON.parse(fallback?fallback[0]:raw);
          const n={title:nodeData.title||t("new_step","Новый шаг"),reason:nodeData.reason||"",action:nodeData.action||"",metric:nodeData.metric||"",status:nodeData.status||"planning",priority:nodeData.priority||"medium",progress:nodeData.progress??0,tags:Array.isArray(nodeData.tags)?nodeData.tags:[],color:nodeData.color||""};
          onAddNode(n);
          setMsgs(m=>[...m,{role:"sys",text:"✅ "+t("step_added_to_map","Шаг добавлен на карту")+": "+n.title}]);
        }catch{setMsgs(m=>[...m,{role:"sys",text:"⚠️ "+t("ai_step_format_err","AI предложил шаг, но формат не распознан. Добавьте вручную.")}]);}
      }
    }catch(e:any){
      const msg=e?.message||t("connection_error","Ошибка подключения. Проверьте сеть.");
      setMsgs(m=>[...m,{role:"ai",text:msg}]);
      onError?.(msg);
    }
    setLoad(false);
    inpRef.current?.focus();
  }

  const aiPanelStyle: React.CSSProperties=embedded
    ? {position:"relative",width:"100%",height:isMobile?560:680,display:"flex",flexDirection:"column",zIndex:1,borderRadius:18,overflow:"hidden"}
    : (isMobile
        ? {position:"fixed",left:0,right:0,top:0,bottom:0,width:"100%",maxWidth:480,marginLeft:"auto",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:50,boxShadow:"-16px 0 48px rgba(0,0,0,.3)",borderRadius:0}
        : {position:"absolute",right:0,top:0,bottom:0,width:360,borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:45,boxShadow:"-16px 0 48px rgba(0,0,0,.2)",borderRadius:"16px 0 0 0"});
  const showCtxStrip=Boolean((mapName||"").trim()||(projectName||"").trim()||nodes.length>0);
  return(
    <div className={`glass-panel sa-ai-panel ${embedded?"":"panel-slide"} ${exiting&&!embedded?"panel-slide-out":""}`.trim()} style={{...aiPanelStyle,background:"var(--glass-panel-bg)",backdropFilter:"blur(24px)"}}>
      <div className="sa-ai-panel-header" style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",borderBottom:"1px solid var(--glass-border-accent,var(--border))",flexShrink:0,background:"rgba(255,255,255,.02)",backdropFilter:"blur(12px)",position:"relative"}}>
        <div style={{width:36,height:36,borderRadius:10,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 2px 12px var(--accent-glow)",flexShrink:0,border:"1px solid rgba(255,255,255,.2)"}}>✦</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:900,color:"var(--text)",letterSpacing:"-0.02em"}}>{t("ai_consultant","AI Советник")}</div>
          <div style={{fontSize:11,color:"var(--accent-2)",fontWeight:600,marginTop:1}}>{tierCfg.badge} {tierCfg.label}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{const g={free:t("ai_greet_free","Привет! Я AI-стратег: помогу выбрать следующий шаг и метрику. Чипы ниже — быстрый старт."),starter:t("ai_greet_starter","Привет! Я ваш стратегический помощник: риски, маркетинг, продажи — в привязке к карте. Спросите или нажмите чип."),pro:t("ai_greet_pro","Привет! Режим Pro: SWOT, Porter, OKR, CAC/LTV, MEDDIC. Дам диагноз → действия → риск → быструю победу."),team:t("ai_greet_team","Добрый день. Партнёрский режим: GTM, unit economics, Blue Ocean. Executive insight и топ-приоритеты по вашей карте."),enterprise:t("ai_greet_enterprise","Добрый день. Коллегиум C-level: стратегия, маркетинг, продажи, финансы. Ищем non-obvious ходы и слепые зоны.")};setMsgs([{role:"ai",text:g[tier]||g.free}]);}} title={t("clear_chat","Очистить чат")} style={{padding:"6px 10px",borderRadius:8,border:"1px solid var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.04)",color:"var(--text4)",cursor:"pointer",fontSize:11,fontWeight:600}}>↻</button>
          {!embedded&&<button onClick={handleClose} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.04)",color:"var(--text4)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
        </div>
      </div>
      {showCtxStrip&&(
        <div style={{padding:"12px 18px 10px",borderBottom:"1px solid var(--glass-border-accent,var(--border))",flexShrink:0}}>
          <div className="sa-ai-panel-ctx">{t("ai_panel_context_lbl","Контекст")}</div>
          <div className="sa-ai-panel-strip">
            {(mapName||"").trim()?(
              <span><span aria-hidden>📍</span>{(mapName||"").trim()}</span>
            ):(projectName||"").trim()?(
              <span><span aria-hidden>📁</span>{(projectName||"").trim()}</span>
            ):null}
            {nodes.length>0&&(
              <>
                <span aria-hidden>·</span>
                <span><span className="sa-ai-hp">{panelHealth.h}%</span> {t("ai_health_short","Health")}</span>
                <span aria-hidden>·</span>
                <span>{nodes.length} {t("steps_label","шагов")}</span>
              </>
            )}
          </div>
        </div>
      )}
      <div style={{padding:"12px 16px",borderBottom:"1px solid var(--glass-border-accent,var(--border))",flexShrink:0,background:"transparent"}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t("ai_quick_questions","Быстрые вопросы")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {quick.map(q=>(
            <button key={q} className="btn-interactive sa-ai-chip" onClick={()=>send(q)} style={{padding:"8px 12px",borderRadius:999,border:"1px solid var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.04)",backdropFilter:"blur(8px)",color:"var(--text2)",cursor:"pointer",fontSize:11,fontWeight:600}}>{q}</button>
          ))}
          {allQuick.length>QUICK_SHOW&&(
            <button onClick={()=>setShowMoreQuick(s=>!s)} className="btn-interactive sa-ai-chip" style={{padding:"8px 12px",borderRadius:999,border:"1px dashed var(--border)",background:"transparent",color:"var(--text4)",fontSize:11,fontWeight:600,cursor:"pointer"}}>
              {showMoreQuick?"▲ "+t("collapse","Свернуть"):"+ "+t("more_dots","Ещё…")}
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="sa-ai-msg-scroll" style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:14,scrollBehavior:"smooth"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":m.role==="sys"?"center":"flex-start",gap:10,alignItems:"flex-start",animation:"fadeInUp .4s cubic-bezier(0.22,1,0.36,1) forwards"}}>
            {m.role==="ai"&&<div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginTop:2,boxShadow:"0 2px 8px var(--accent-glow)"}}>◆</div>}
            <div style={{maxWidth:"88%",padding:m.role==="user"?"12px 16px":"12px 16px 12px 20px",borderRadius:m.role==="user"?"14px 14px 4px 14px":m.role==="sys"?"10px":"4px 14px 14px 14px",background:m.role==="user"?"var(--gradient-accent)":m.role==="sys"?"rgba(16,185,129,.12)":"rgba(255,255,255,.04)",backdropFilter:m.role==="user"?"none":"blur(10px)",border:m.role==="user"?"none":m.role==="sys"?"1px solid rgba(16,185,129,.25)":"1px solid var(--glass-border-accent,var(--border))",borderLeft:m.role==="ai"?"3px solid var(--accent-1)":"none",fontSize:13,lineHeight:1.6,color:m.role==="user"?"#fff":m.role==="sys"?"#12c482":"var(--text)",whiteSpace:"pre-wrap",boxShadow:m.role==="user"?"0 2px 12px var(--accent-glow)":m.role==="sys"?"none":"0 2px 12px rgba(0,0,0,.06)"}}>{m.text}</div>
          </div>
        ))}
        {load&&<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,boxShadow:"0 2px 8px var(--accent-glow)"}}>◆</div><div style={{display:"flex",gap:4,padding:"10px 14px",background:"rgba(255,255,255,.04)",backdropFilter:"blur(8px)",borderRadius:"4px 14px 14px 14px",border:"1px solid var(--glass-border-accent,var(--border))"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`,opacity:.7}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"16px 18px",borderTop:"1px solid var(--glass-border-accent,var(--border))",flexShrink:0,background:"rgba(255,255,255,.02)",backdropFilter:"blur(8px)",flexDirection:"column",display:"flex",gap:10}}>
        {aiFreeTier&&<div role="status" className="glass-card" style={{padding:"12px 14px",borderRadius:12,border:"1px solid rgba(104,54,245,.32)",background:"linear-gradient(135deg,rgba(104,54,245,.10),rgba(160,80,255,.06))",color:"var(--text2)",fontSize:12.5,display:"flex",alignItems:"center",gap:10}}>
          <span style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,flexShrink:0,boxShadow:"0 4px 14px var(--accent-glow)"}}>✦</span>
          <span style={{lineHeight:1.45}}>{t("ai_free_upgrade","AI-чат доступен с тарифа Starter. Улучшите тариф в профиле.")}</span>
        </div>}
        <div className="sa-ai-input-wrap" style={{opacity:aiFreeTier?.65:1,width:"100%"}}>
          <input ref={inpRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={aiFreeTier?t("ai_free_placeholder","Доступно с тарифа Starter"):t("ask_placeholder","Спросите о стратегии…")} disabled={aiFreeTier} style={{flex:1,minWidth:0,padding:"10px 4px 10px 0",fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',system-ui,sans-serif",transition:"opacity .2s",opacity:aiFreeTier?.7:1}}/>
          <button className="btn-interactive" onClick={()=>send()} disabled={aiFreeTier||!inp.trim()||load} style={{width:44,height:44,borderRadius:12,border:"none",flexShrink:0,background:!aiFreeTier&&inp.trim()&&!load?"var(--gradient-accent)":"rgba(255,255,255,.06)",color:!aiFreeTier&&inp.trim()&&!load?"#fff":"var(--text4)",cursor:!aiFreeTier&&inp.trim()&&!load?"pointer":"not-allowed",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:!aiFreeTier&&inp.trim()&&!load?"0 2px 12px var(--accent-glow)":"none"}}>↑</button>
        </div>
      </div>
    </div>
  );
}


// ── EdgeLine ──
function EdgeLine({edge,nodes,selected,onClick,etypeMap}){
  const{t}=useLang();
  const ETYPE=etypeMap||getETYPE(t);
  const s=nodes.find(n=>n.id===edge.source);
  const tNode=nodes.find(n=>n.id===edge.target);
  if(!s||!t)return null;
  const sx=s.x+120,sy=s.y+64,tx2=tNode.x+120,ty2=tNode.y+64;
  const sp=edgePt(sx,sy,tx2,ty2);
  const ep=edgePt(tx2,ty2,sx,sy);
  const mx=(sp.x+ep.x)/2,my=(sp.y+ep.y)/2;
  const dx=ep.x-sp.x,dy=ep.y-sp.y,len=Math.sqrt(dx*dx+dy*dy)||1;
  const nx=-dy/len,ny=dx/len,bend=Math.min(60,len*.18);
  const cpx=mx+nx*bend,cpy=my+ny*bend;
  const et=ETYPE[edge.type]||ETYPE.requires;
  const d=`M${sp.x},${sp.y} Q${cpx},${cpy} ${ep.x},${ep.y}`;
  const mid_t=.5;
  const bmx=Math.pow(1-mid_t,2)*sp.x+2*(1-mid_t)*mid_t*cpx+mid_t*mid_t*ep.x;
  const bmy=Math.pow(1-mid_t,2)*sp.y+2*(1-mid_t)*mid_t*cpy+mid_t*mid_t*ep.y;
  const tang_t=.5;
  const tax=2*(1-tang_t)*(cpx-sp.x)+2*tang_t*(ep.x-cpx);
  const tay=2*(1-tang_t)*(cpy-sp.y)+2*tang_t*(ep.y-cpy);
  const ang=Math.atan2(tay,tax)*180/Math.PI;
  return(
    <g onClick={e=>{e.stopPropagation();onClick(edge);}} role="button" tabIndex={0} aria-label={edge.label||et.label||t("edge","связь")}
       onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(edge);}}}>
      <path className="sa-edge-hit" d={d} fill="none" stroke="transparent" strokeWidth={14}/>
      <path className="sa-edge-line" d={d} fill="none" stroke={selected?"url(#sa-edge-grad)":et.c} strokeWidth={selected?2.6:1.6} strokeDasharray={et.d==="none"?"none":et.d} opacity={selected?1:.68}/>
      <polygon points="-5,-3 5,0 -5,3" fill={selected?"var(--accent-1)":et.c} transform={`translate(${ep.x},${ep.y}) rotate(${ang})`} opacity={selected?1:.75} style={{transition:"opacity .2s ease"}}/>
      {edge.label&&<text x={bmx} y={bmy-6} textAnchor="middle" fontSize={9.5} fill="var(--text3)" style={{pointerEvents:"none",userSelect:"none"}}>{edge.label}</text>}
    </g>
  );
}

// ── NodeCard ── (glass-стиль, компактность, текст без перекрытия)
function NodeCard({node,selected,focused=false,connecting,connectSource,onClick,onMouseDown,onContextMenu,theme,statusMap}){
  const{t}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const st=STATUS[node.status]||STATUS.planning;
  const pr=PRIORITY[node.priority]||PRIORITY.medium;
  const isLight=theme==="light";
  const glassBg=isLight?"rgba(255,255,255,.78)":"rgba(9,7,22,.78)";
  const bg=node.color?node.color+(isLight?"28":"22"):glassBg;
  const titleColor=selected?"var(--accent-1)":"var(--t1)";
  const reasonColor="var(--t3)";
  const statusColor="var(--t3)";
  const metricColor="var(--accent-1)";
  const progressTrack=isLight?"rgba(0,0,0,.08)":"rgba(255,255,255,.08)";
  const tagBg="var(--accent-soft)";
  const tagColor="var(--accent-2)";
  const dateColor="var(--t4)";
  const isOverdue=node.deadline&&new Date(node.deadline)<new Date()&&node.status!=="completed";
  const isConnSrc=connecting&&connectSource?.id===node.id;
  const commentCount=(node.comments||[]).length;
  const progress=node.progress||0;
  const progressW=Math.max(0,progress/100*204);
  const titleFull=node.title||t("new_step","Новый шаг");
  const titleLen=28;
  const title=titleFull.length>titleLen?titleFull.slice(0,titleLen-1)+"…":titleFull;
  const hasMeta=node.reason||node.action||node.metric;
  const hasAction=!!(node.action&&node.action.trim());
  const headerY=14;
  const reasonY=26;
  const actionY=36;
  const metricY=hasAction?46:40;
  const progressY=hasMeta?(hasAction?58:52):32;
  const progressBarH=5;
  const progressCenterY=progressY+progressBarH/2;
  const statusY=progressY+progressBarH+10;
  const tagsY=statusY+14;
  return(
    <g className="node-card sa-node-card sa-node-appear" transform={`translate(${node.x},${node.y})`}
       role="button" tabIndex={0} aria-label={`${titleFull} — ${st.label}`}
       onClick={e=>{e.stopPropagation();onClick(node,{shiftKey:e.shiftKey});}}
       onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(node,{shiftKey:e.shiftKey});}}}
       onPointerDown={e=>onMouseDown(e,node)}
       onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContextMenu?.(e.clientX,e.clientY,node);}}
       style={{cursor:connecting?"crosshair":"grab"}}>
      {selected&&<rect x={-1} y={1} width={242} height={130} rx={13} fill="var(--accent-soft)" style={{filter:"blur(8px)"}}/>}
      {focused&&<rect x={-2} y={0} width={244} height={132} rx={14} fill="transparent" stroke="var(--accent-1)" strokeWidth={2} style={{filter:"drop-shadow(0 0 12px var(--accent-glow))"}}/>}
      <rect width={240} height={128} rx={12} fill={bg}
        stroke={selected?"var(--accent-1)":isConnSrc?"#12c482":isOverdue?"#f04458":isLight?(node.color||"rgba(0,0,0,.1)"):"rgba(255,255,255,.12)"}
        strokeWidth={selected||isConnSrc||isOverdue?2:1}
        filter={selected?"url(#glow)":"none"}/>
      {selected&&<rect width={240} height={128} rx={12} fill="var(--accent-soft)"/>}
      <rect x={0} y={10} width={3} height={108} rx={1.5} fill={st.c}/>
      {/* Заголовок — полная ширина, приоритет под заголовком справа */}
      <g clipPath="url(#nodeTitleClip)"><title>{titleFull}</title><text x={14} y={headerY} fontSize={11.5} fontWeight={800} fill={titleColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>
        {title}
      </text></g>
      <rect x={198} y={headerY-6} width={36} height={12} rx={6} fill={`${pr.c}22`} stroke={`${pr.c}40`} strokeWidth={0.5}/>
      <circle cx={205} cy={headerY} r={2} fill={pr.c}/>
      <text x={211} y={headerY} fontSize={7} fontWeight={700} fill={pr.c} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>{pr.label}</text>
      {node.reason&&(
        <g><title>{node.reason}</title><text x={14} y={reasonY} fontSize={8.5} fill={reasonColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>
          {node.reason.length>48?node.reason.slice(0,46)+"…":node.reason}
        </text></g>
      )}
      {node.action&&node.action.trim()&&(
        <g><title>{node.action}</title><text x={14} y={actionY} fontSize={8} fill={metricColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle",fontWeight:600}}>
          ▸ {node.action.length>42?node.action.slice(0,40)+"…":node.action}
        </text></g>
      )}
      {node.metric&&(
        <g><title>{node.metric}</title><text x={14} y={metricY} fontSize={8} fill={metricColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>
          ◆ {node.metric.length>40?node.metric.slice(0,38)+"…":node.metric}
        </text></g>
      )}
      <rect x={14} y={progressY} width={212} height={progressBarH} rx={3} fill={progressTrack}/>
      {progress>0&&<rect x={14} y={progressY} width={Math.min(212,progressW)} height={progressBarH} rx={3} fill={node.status==="completed"?"#12c482":st.c} opacity={.9}/>}
      <text x={228} y={progressCenterY} fontSize={8} fontWeight={700} fill={st.c} textAnchor="end" style={{fontFamily:"'JetBrains Mono',monospace",dominantBaseline:"middle"}}>{progress}%</text>
      <circle cx={14} cy={statusY} r={3} fill={st.c}/>
      <text x={22} y={statusY} fontSize={8.5} fill={statusColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>{st.label}</text>
      {isOverdue&&(
        <>
          <rect x={98} y={statusY-6} width={64} height={12} rx={4} fill="rgba(239,68,68,.15)"/>
          <text x={130} y={statusY} textAnchor="middle" fontSize={8} fontWeight={700} fill="#f04458" style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>⚠ {t("overdue","просрочено")}</text>
        </>
      )}
      {node.deadline&&!isOverdue&&(
        <text x={236} y={statusY} fontSize={8} fill={dateColor} textAnchor="end" style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>📅 {node.deadline}</text>
      )}
      <g transform={`translate(14,${tagsY})`}>
        {(node.tags||[]).slice(0,2).map((tag,i)=>(
          <g key={i} transform={`translate(${i*74},0)`}>
            <rect width={68} height={12} rx={6} fill={tagBg}/>
            <text x={6} y={6} fontSize={7.5} fill={tagColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>{tag.slice(0,10)}</text>
          </g>
        ))}
        {commentCount>0&&(
          <g transform={`translate(${(node.tags||[]).length*74+6},0)`}>
            <rect width={28} height={12} rx={6} fill={tagBg}/>
            <text x={5} y={6} fontSize={7.5} fill={tagColor} style={{fontFamily:"'Inter',system-ui,sans-serif",dominantBaseline:"middle"}}>💬 {commentCount}</text>
          </g>
        )}
      </g>
      {isConnSrc&&<rect x={-2} y={-2} width={244} height={132} rx={13} fill="none" stroke="#12c482" strokeWidth={2} strokeDasharray="6,3" opacity={.8}/>}
    </g>
  );
}

// ── GanttView ──
function GanttView({nodes,onClose,statusMap,onRowClick}:{nodes:any[],onClose:()=>void,statusMap?:any,onRowClick?:(n:any)=>void}){
  const{t,lang}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const[exiting,setExiting]=useState(false);
  const handleClose=()=>{if(exiting)return;setExiting(true);setTimeout(()=>onClose(),280);};
  const withDates=nodes.filter((n:any)=>n.deadline);
  const now=new Date();
  if(withDates.length===0)return(
    <div className={exiting?"panel-slide-down-out":""} style={{position:"absolute",bottom:70,left:"50%",transform:"translateX(-50%)",background:"var(--bg2)",border:".5px solid var(--b1)",borderRadius:16,padding:"18px 24px",zIndex:30,boxShadow:"0 20px 60px rgba(0,0,0,.4)",textAlign:"center",minWidth:280,animation:exiting?"none":"fadeInUp .3s ease"}}>
      <div style={{fontSize:22,marginBottom:6}}>📅</div>
      <div style={{fontSize:13,fontWeight:700,color:"var(--text3)"}}>{t("no_deadlines","Нет дедлайнов")}</div>
      <div style={{fontSize:13.5,color:"var(--text5)",marginBottom:12}}>{t("gantt_hint","Добавьте дедлайны к шагам в редакторе")}</div>
      <button onClick={handleClose} className="btn-interactive" style={{padding:"8px 18px",borderRadius:12,border:".5px solid var(--b1)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("close","Закрыть")}</button>
    </div>
  );
  const sorted=[...withDates].sort((a:any,b:any)=>new Date(a.deadline).getTime()-new Date(b.deadline).getTime());
  const minDate=new Date(sorted[0].deadline);
  const maxDate=new Date(sorted[sorted.length-1].deadline);
  const range=Math.max(1,(maxDate.getTime()-minDate.getTime())/864e5);
  const todayPct=(()=>{
    const d=(now.getTime()-minDate.getTime())/864e5;
    if(d<0||d>range)return null;
    return (d/range)*100;
  })();
  const fmtDate=(d:Date)=>d.toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"short"});

  return(
    <div className={exiting?"gantt-panel-out":""} role="dialog" aria-label={t("gantt","Gantt")} style={{position:"absolute",bottom:0,left:0,right:0,height:240,background:"var(--bg2)",borderTop:".5px solid var(--b1)",zIndex:30,display:"flex",flexDirection:"column",animation:exiting?"none":"slideUp .28s cubic-bezier(0.22,1,0.36,1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:".5px solid var(--b1)",flexShrink:0,position:"sticky",top:0,background:"var(--bg2)",zIndex:2}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{t("gantt","📅 Gantt")}</span>
        <span style={{fontSize:13,color:"var(--text5)",flex:1}}>{t("steps_with_deadlines","{n} шагов с дедлайнами").replace("{n}",String(sorted.length))} · {fmtDate(minDate)} → {fmtDate(maxDate)}</span>
        <button className="modal-close" onClick={handleClose} aria-label={t("close","Закрыть")}>×</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"10px 14px",position:"relative"}}>
        {sorted.map((n:any)=>{
          const st=STATUS[n.status]||STATUS.planning;
          const dl=new Date(n.deadline);
          const daysFromStart=Math.max(0,(dl.getTime()-minDate.getTime())/864e5);
          const pct=Math.min(100,(daysFromStart/range)*100);
          const isPast=dl<now;
          const daysLeft=Math.ceil((dl.getTime()-now.getTime())/864e5);
          const clickable=Boolean(onRowClick);
          return(
            <div key={n.id} role={clickable?"button":undefined} tabIndex={clickable?0:-1}
                 onClick={()=>clickable&&onRowClick?.(n)}
                 onKeyDown={e=>{if(clickable&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onRowClick?.(n);}}}
                 className="sa-gantt-row"
                 style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,marginBottom:4,cursor:clickable?"pointer":"default",transition:"background .18s ease",position:"relative",minWidth:340}}>
              <div style={{width:130,fontSize:13,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0,fontWeight:600}} title={n.title}>{n.title}</div>
              <div style={{flex:1,height:22,background:"var(--surface)",borderRadius:6,position:"relative",overflow:"hidden",border:".5px solid var(--b1)"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.max(2,n.progress||0)}%`,background:st.c+"55",borderRadius:6,transition:"width .35s ease"}}/>
                <div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:10,height:10,borderRadius:3,background:isPast?"#f04458":st.c,boxShadow:"0 2px 6px rgba(0,0,0,.25)"}}/>
              </div>
              <div style={{width:90,fontSize:13,color:isPast?"#f04458":daysLeft<=7?"#f09428":"var(--text4)",textAlign:"right",flexShrink:0,fontWeight:isPast||daysLeft<=7?700:500}}>
                {isPast?t("days_overdue","просрочено {n}д.").replace("{n}",String(-daysLeft)):daysLeft===0?t("today","Сегодня"):daysLeft===1?t("tomorrow_label","завтра"):t("days_left","{n}д.").replace("{n}",String(daysLeft))}
              </div>
            </div>
          );
        })}
        {todayPct!=null&&(
          <div className="sa-gantt-today" aria-hidden style={{position:"absolute",top:8,bottom:8,left:`calc(14px + 130px + 10px + ${todayPct}% * (100% - 14px - 130px - 10px - 90px - 10px - 14px) / 100)`,width:2,background:"linear-gradient(180deg,var(--accent-1),var(--accent-2))",borderRadius:1,pointerEvents:"none",boxShadow:"0 0 12px var(--accent-glow)"}}/>
        )}
      </div>
    </div>
  );
}


// ── TrialBanner ──
function TrialBanner({user,onUpgrade}:{user:any,onUpgrade:()=>void}){
  const{t}=useLang();
  const trialVal=user?.trialEndsAt??user?.trial_ends_at;
  if(!trialVal)return null;
  const trialEnd=new Date(trialVal);
  const now=new Date();
  if(trialEnd<=now)return null;
  const daysLeft=Math.ceil((trialEnd.getTime()-now.getTime())/(1000*60*60*24));
  return(
    <div style={{background:"var(--accent-soft)",borderBottom:"1px solid var(--accent-1)",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:13}}>
      <span style={{color:"var(--accent-2)",fontWeight:600}}>⚡ {t("trial_active","Пробный период активен")} — {daysLeft} {t("trial_days_left","дней осталось")}</span>
      <button onClick={onUpgrade} style={{padding:"4px 14px",borderRadius:7,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t("upgrade","Улучшить →")}</button>
    </div>
  );
}

// ── EmailVerifyBanner ──
function EmailVerifyBanner({user,onVerified}:{user:any,onVerified?:()=>void}){
  const{t}=useLang();
  const[sent,setSent]=useState(false);
  const[loading,setLoading]=useState(false);
  // Если email уже подтверждён или нет API — не показываем
  if(!API_BASE||user?.emailVerified!==false)return null;
  async function resend(){
    if(loading||sent)return;
    setLoading(true);
    try{
      await apiFetch("/api/auth/resend-verification",{method:"POST"});
      setSent(true);
    }catch{}
    setLoading(false);
  }
  return(
    <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(239,68,68,.08))",borderBottom:"1px solid rgba(245,158,11,.3)",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:13}}>
      <span style={{color:"#f09428",fontWeight:600}}>✉️ {t("verify_email_banner","Подтвердите ваш email для полного доступа.")}</span>
      {sent?(
        <span style={{color:"#12c482",fontWeight:600,fontSize:12}}>{t("verify_email_sent","Письмо отправлено! Проверьте почту.")}</span>
      ):(
        <button onClick={resend} disabled={loading} style={{padding:"4px 14px",borderRadius:7,border:"1px solid rgba(245,158,11,.4)",background:"rgba(245,158,11,.1)",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:loading?"wait":"pointer"}}>
          {loading?"…":t("verify_email_resend","Отправить письмо")}
        </button>
      )}
    </div>
  );
}

// ── DeadlineReminders ── (показывается если есть шаги с дедлайном в ближайшие 3 дня)
function DeadlineReminders({nodes,onGoToNode,onDismiss}:{nodes:any[],onGoToNode:(id:string)=>void,onDismiss?:()=>void}){
  const{t}=useLang();
  const now=new Date();
  const soon=nodes.filter(n=>{
    if(!n.deadline||n.status==="completed")return false;
    const d=new Date(n.deadline);
    const diff=(d.getTime()-now.getTime())/(1000*60*60*24);
    return diff>=0&&diff<=3;
  });
  const overdue=nodes.filter(n=>{
    if(!n.deadline||n.status==="completed")return false;
    return new Date(n.deadline)<now;
  });
  const all=[...overdue,...soon];
  if(all.length===0)return null;
  return(
    <div style={{position:"fixed",bottom:80,right:20,zIndex:350,width:280,background:"var(--surface)",border:`1px solid ${overdue.length?"rgba(239,68,68,.4)":"rgba(245,158,11,.35)"}`,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.3)",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid var(--border)",background:overdue.length?"rgba(239,68,68,.08)":"rgba(245,158,11,.08)"}}>
        <span style={{fontSize:13,fontWeight:700,color:overdue.length?"#f04458":"#f09428"}}>⏰ {t("deadline_reminder","Напоминания")}{all.length>1?` · ${all.length}`:""}</span>
        <button onClick={()=>onDismiss?.()} title={t("dismiss","Скрыть")} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:16}}>✕</button>
      </div>
      {all.slice(0,4).map(n=>{
        const d=new Date(n.deadline);
        const diff=Math.round((d.getTime()-now.getTime())/(1000*60*60*24));
        const isOverdue=d<now;
        return(
          <div key={n.id} onClick={()=>onGoToNode(n.id)} style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",cursor:"pointer",transition:"background .15s"}}
            onMouseOver={e=>(e.currentTarget as HTMLElement).style.background="var(--hover)"}
            onMouseOut={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.title}</div>
            <div style={{fontSize:11,color:isOverdue?"#f04458":"#f09428",fontWeight:600}}>
              {isOverdue?t("days_overdue","просрочено {n}д.").replace("{n}",String(Math.abs(diff))):t("days_left","{n}д.").replace("{n}",String(diff))+" · "+n.deadline}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── VersionHistoryModal ──
function VersionHistoryModal({mapId,projectId,onRestore,onClose,onError,theme="dark",isMobile=false}:{mapId:string,projectId:string,onRestore:(v:any)=>void,onClose:()=>void,onError?:(msg:string)=>void,theme?:string,isMobile?:boolean}){
  const{t}=useLang();
  const[versions,setVersions]=useState<any[]>([]);const[loading,setLoading]=useState(false);const[restoring,setRestoring]=useState<string|null>(null);const[restoreConfirm,setRestoreConfirm]=useState<any>(null);
  const[closing,setClosing]=useState(false);
  const handleClose=()=>{if(closing)return;setClosing(true);setTimeout(()=>onClose(),220);};
  useEffect(()=>{
    if(!API_BASE)return;
    setLoading(true);
    apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions`).then(d=>setVersions(d.versions||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[mapId,projectId]);
  async function doRestore(v:any){
    setRestoring(v.id);
    if(API_BASE){
      try{await apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions/${v.id}/restore`,{method:"POST"});}
      catch(e:any){onError?.(e?.message||t("save_error","Ошибка сохранения"));setRestoring(null);return;}
    }
    onRestore(v);setRestoring(null);setRestoreConfirm(null);onClose();
  }
  return(
    <div data-theme={theme} className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
      <div className={`glass-panel ${closing?"modal-content-out":"modal-content-pop"}`} style={{borderRadius:isMobile?"18px 18px 0 0":20,width:isMobile?"100%":"min(480px,94vw)",maxHeight:isMobile?"78vh":"80vh",display:"flex",flexDirection:"column",border:"1px solid var(--glass-border-accent,var(--border))",boxShadow:"var(--glass-shadow-accent,none),0 24px 64px rgba(0,0,0,.4)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:"1px solid var(--border)",background:"var(--surface)"}}>
          <div style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>📜 {t("version_history","История версий")}</div>
          <button onClick={handleClose} style={{width:36,height:36,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {loading&&<div style={{padding:24,textAlign:"center",color:"var(--text3)"}}>…</div>}
          {!loading&&versions.length===0&&<div style={{padding:24,textAlign:"center",color:"var(--text3)",fontSize:13}}>{t("versions_empty","Нет сохранённых версий")}</div>}
          {versions.map((v,i)=>(
            <div key={v.id} style={{padding:"14px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{v.label||`Версия ${versions.length-i}`}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{new Date(v.created_at).toLocaleString()} · {v.user_email}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{Array.isArray(v.nodes)?v.nodes.length:0} {t("steps_label","шагов")}</div>
              </div>
              <button onClick={()=>setRestoreConfirm(v)} disabled={restoring===v.id} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",fontSize:12,fontWeight:700,cursor:"pointer",opacity:restoring===v.id?0.6:1}}>
                {restoring===v.id?"…":t("restore_version","Восстановить")}
              </button>
            </div>
          ))}
        </div>
      </div>
      {restoreConfirm&&<ConfirmDialog title={t("restore_version","Восстановить")} message={t("restore_confirm","Восстановить эту версию? Текущие данные будут заменены.")} confirmLabel={t("restore_version","Восстановить")} danger={false} onConfirm={()=>doRestore(restoreConfirm)} onCancel={()=>setRestoreConfirm(null)}/>}
    </div>
  );
}

// ── XSS-safe text sanitizer ──
function sanitize(str:string|undefined|null):string{
  if(!str)return"";
  return String(str).replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ── WeeklyBriefingModal ──
function WeeklyBriefingModal({nodes,mapName,user,onClose,theme="dark",onError}:{nodes:any[],mapName:string,user:any,onClose:()=>void,theme?:string,onError?:(msg:string)=>void}){
  const{t,lang}=useLang();
  const isMobile=useIsMobile();
  const[loading,setLoading]=useState(false);
  const[summary,setSummary]=useState("");
  const[closing,setClosing]=useState(false);
  const handleClose=()=>{if(closing)return;setClosing(true);setTimeout(()=>onClose(),220);};
  const done=nodes.filter((n:any)=>n.status==="completed");
  const blocked=nodes.filter((n:any)=>n.status==="blocked");
  const critical=nodes.filter((n:any)=>n.priority==="critical"&&n.status!=="completed");
  const health=nodes.length>0?Math.round((done.length/nodes.length)*100):0;
  const errMsg=t("weekly_briefing_err","Не удалось получить AI-анализ.");

  async function fetchBriefing(){
    setLoading(true);setSummary("");
    const ctx=`Карта: ${mapName}. Всего шагов: ${nodes.length}. Выполнено: ${done.length}. Заблокировано: ${blocked.length}. Критичных незавершённых: ${critical.length}. Health score: ${health}%. Шаги: ${nodes.slice(0,10).map((n:any)=>`${n.title}(${n.status})`).join(", ")}`;
    try{
      const r=await callAI([{role:"user",content:`Дай еженедельный брифинг по стратегии. ${ctx}`}],
        `Ты AI-советник. ГЛУБОКИЙ анализ: шаги, статусы, блокировки, дедлайны, health, связи — как «погоду». Учитывай риски capital efficiency и second-order effects. Читай между строк — что критично, но не очевидно. Брифинг: 1) что сделано 2) что заблокировано 3) главная рекомендация (КОНКРЕТНОЕ действие: что, зачем, как измерить). Учитывай зависимости. Non-obvious insight — что пользователь упускает? Без списков, 3-4 предложения.`,250);
      setSummary(r);
    }catch(e:any){
      setSummary(errMsg);
      onError?.(e?.message||errMsg);
    }
    setLoading(false);
  }
  useEffect(()=>{fetchBriefing();},[]);

  return(
    <div data-theme={theme} className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
      <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{borderRadius:isMobile?"18px 18px 0 0":20,width:isMobile?"100%":"min(520px,94vw)",maxHeight:isMobile?"85vh":"none",overflowY:"auto",overflowX:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:"var(--surface)",padding:"18px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>📋 {t("weekly_briefing","Еженедельный брифинг")}</div>
            <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>{mapName} · {new Date().toLocaleDateString(lang==="uz"?"uz-UZ":lang==="en"?"en-US":"ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <button onClick={handleClose} style={{width:36,height:36,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          {/* Метрики */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:t("total_steps","Всего"),value:nodes.length,color:"var(--accent-1)"},
              {label:t("done","Выполнено"),value:done.length,color:"#12c482"},
              {label:t("blocked","Заблокировано"),value:blocked.length,color:"#f04458"},
              {label:"Health",value:`${health}%`,color:health>=70?"#12c482":health>=40?"#f09428":"#f04458"},
            ].map(m=>(
              <div key={m.label} style={{textAlign:"center",padding:"12px 8px",borderRadius:12,background:"var(--bg2)",border:"1px solid var(--border)"}}>
                <div style={{fontSize:22,fontWeight:800,color:m.color}}>{m.value}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:3,fontWeight:600}}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* AI-саммари */}
          <div style={{padding:"16px 18px",borderRadius:12,background:"var(--accent-soft)",border:"1px solid var(--accent-1)",minHeight:80}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--accent-2)",marginBottom:8}}>✦ AI-анализ</div>
            {loading?(
              <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--text3)",fontSize:13}}>
                <div style={{width:16,height:16,border:"2px solid var(--accent-1)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                Анализирую карту…
              </div>
            ):(
              <div>
                <p style={{fontSize:13,color:"var(--text)",lineHeight:1.65,margin:0}}>{summary}</p>
                {summary===errMsg&&<button onClick={fetchBriefing} style={{marginTop:10,padding:"6px 14px",borderRadius:8,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t("retry","Повторить")}</button>}
              </div>
            )}
          </div>
          {/* Критичные шаги */}
          {critical.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#f87171",marginBottom:8}}>⚠️ Критичные незавершённые шаги</div>
              {critical.slice(0,3).map((n:any)=>(
                <div key={n.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:9,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",marginBottom:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#f04458",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{n.title}</span>
                  {n.deadline&&<span style={{marginLeft:"auto",fontSize:11,color:"#f87171"}}>{n.deadline}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:"0 26px 20px",display:"flex",justifyContent:"flex-end",gap:10,borderTop:"1px solid var(--border)"}}>
          <button onClick={handleClose} className="btn-interactive" style={{padding:"10px 22px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("close","Закрыть")}</button>
        </div>
      </div>
    </div>
  );
}

// ── MapEditor ──
function MapEditor({user,mapData,project,onBack,isNew,onProfile,onToggleTheme,theme,readOnly=false,aiChatMsgs,aiChatSetMsgs,focusNodeId=null,palette="indigo",onOpenContentPlanHub=null,onOpenContentPlanProject=null,onShellGlobalNav}){
  const{t,lang,setLang}=useLang();
  const isMobile=useIsMobile();
  const[accHex,setAccHex]=useState({a1:"#6836f5",a2:"#a050ff"});
  useLayoutEffect(()=>{
    try{
      const s=getComputedStyle(document.body);
      setAccHex({
        a1:(s.getPropertyValue("--accent-1")||"").trim()||"#6836f5",
        a2:(s.getPropertyValue("--accent-2")||"").trim()||"#a050ff",
      });
    }catch{}
  },[palette,theme]);
  const STATUS=useMemo(()=>{const b=getSTATUS(t);return{...b,planning:{...b.planning,c:accHex.a1}};},[t,accHex.a1]);
  const ETYPE=useMemo(()=>{const b=getETYPE(t);return{...b,requires:{...b.requires,c:accHex.a1},affects:{...b.affects,c:accHex.a2}};},[t,accHex.a1,accHex.a2]);
  const[nodes,setNodes]=useState(mapData?.nodes||defaultNodes());
  const[edges,setEdges]=useState(mapData?.edges||[]);
  const[selNode,setSelNode]=useState(null);
  const[selEdge,setSelEdge]=useState(null);
  const[ctxMenu,setCtxMenu]=useState<{x:number,y:number,node?:any}|null>(null);
  const[selNodes,setSelNodes]=useState<Set<string>>(new Set());
  const[showAI,setShowAI]=useState(false);
  const[showStats,setShowStats]=useState(false);
  const[connecting,setConnecting]=useState(false);
  const[connectSrc,setConnectSrc]=useState(null);
  const[showMini,setShowMini]=useState(true);
  const[search,setSearch]=useState("");
  const[pendingAiMsgs,setPendingAiMsgs]=useState([]);
  const aiChatMsgsLocal = aiChatMsgs || [];
  const setAiChatMsgsLocal = aiChatSetMsgs || (()=>{});
  const[statusFilter,setStatusFilter]=useState("all");
  const[toasts,setToasts]=useState([]);
  const[saveState,setSaveState]=useState("saved");
  const[undoStack,setUndoStack]=useState([]);
  const[redoStack,setRedoStack]=useState([]);
  const[showShortcuts,setShowShortcuts]=useState(false);
  const[clipboard,setClipboard]=useState(null);
  const[showSim,setShowSim]=useState(false);
  const[showTemplates,setShowTemplates]=useState(false);
  const[showGantt,setShowGantt]=useState(false);
  const[showTour,setShowTour]=useState(false);
  const[exporting,setExporting]=useState(false);
  const[searchQ,setSearchQ]=useState("");
  const[showSearch,setShowSearch]=useState(false);
  const[showOnboarding,setShowOnboarding]=useState(false);
  const[allMaps,setAllMaps]=useState([]);
  const[showVersions,setShowVersions]=useState(false);
  const[showDeadlines,setShowDeadlines]=useState(true);
  const[showBriefing,setShowBriefing]=useState(false);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  // WebSocket presence
  const[onlineUsers,setOnlineUsers]=useState<any[]>([]);
  const[remoteCursors,setRemoteCursors]=useState<Record<string,{x:number,y:number,name:string,email:string}>>({});
  const socketRef=useRef<any>(null);
  const importRef=useRef<any>(null);
  const svgRef=useRef<any>(null);
  const dragging=useRef<any>(null);
  const panning=useRef<any>(null);
  const viewRef=useRef({x:0,y:0,zoom:0.85});
  const[view,setView]=useState({x:0,y:0,zoom:0.85});
  const focusPulseRef=useRef<any>(null);
  const[focusPulseId,setFocusPulseId]=useState<string|null>(null);
  const W=typeof window!=="undefined"?window.innerWidth:1400;
  const H=typeof window!=="undefined"?window.innerHeight:900;

  function addToast(msg:string,type="info"){
    const id=uid();
    setToasts((t:any[])=>[...t,{id,msg,type}]);
    // автоудаление через 4.3s — тост сам вызовет onClose после анимации (4s + 0.26s выход)
    setTimeout(()=>setToasts((t:any[])=>t.filter((x:any)=>x.id!==id)),4300);
  }
  function pushUndo(n:any,e:any){setUndoStack((s:any[])=>[...s.slice(-29),{nodes:n,edges:e}]);setRedoStack([]);}

  useEffect(()=>{
    if(!focusNodeId)return;
    const n=nodes.find((x:any)=>x.id===focusNodeId);
    if(!n)return;
    const z=1.05;
    const nx=-n.x+W/2, ny=-n.y+H/2;
    setView({x:nx,y:ny,zoom:z});
    viewRef.current={x:nx,y:ny,zoom:z};
    setSelNode(n);
    setFocusPulseId(n.id);
    if(focusPulseRef.current)clearTimeout(focusPulseRef.current);
    focusPulseRef.current=setTimeout(()=>setFocusPulseId(null),1600);
    return()=>{ if(focusPulseRef.current)clearTimeout(focusPulseRef.current); };
  },[focusNodeId,nodes.length]);

  // Флаг: текущее изменение nodes/edges пришло от удалённого коллеги (не сохраняем локально)
  const remoteUpdateRef=useRef(false);

  // ── WebSocket: подключаемся если есть API и карта имеет ID ──
  useEffect(()=>{
    if(!API_BASE||!mapData?.id||!user||readOnly)return;
    let socket:any;
    try{
      const token=getJWT();
      socket=ioClient(API_BASE,{transports:["websocket","polling"],auth:{token}});
      socketRef.current=socket;
      socket.io.on("reconnect_attempt",()=>{
        const t=getJWT();
        if(t)socket.auth={...socket.auth,token:t};
      });
      socket.emit("join-map",{mapId:mapData.id,userName:user.name||user.email});
      socket.on("join-error",(payload:any)=>{
        addToast(payload?.message||t("ws_join_denied","Нет доступа к совместному редактированию"),"error");
        try{socket.disconnect();}catch{}
        socketRef.current=null;
      });
      socket.on("user-joined",(data:any)=>setOnlineUsers((u:any[])=>[...u.filter(x=>x.email!==data.email),data]));
      socket.on("user-left",(data:any)=>setOnlineUsers((u:any[])=>u.filter(x=>x.email!==data.email)));
      socket.on("node-move",({nodeId,x,y}:any)=>{
        remoteUpdateRef.current=true;
        setNodes((ns:any[])=>ns.map((n:any)=>n.id===nodeId?{...n,x,y}:n));
      });
      socket.on("node-update",({node}:any)=>{
        remoteUpdateRef.current=true;
        setNodes((ns:any[])=>ns.map((n:any)=>n.id===node.id?{...n,...node}:n));
      });
      socket.on("node-add",({node}:any)=>{
        remoteUpdateRef.current=true;
        setNodes((ns:any[])=>[...ns.filter((n:any)=>n.id!==node.id),node]);
      });
      socket.on("node-delete",({nodeId}:any)=>{
        remoteUpdateRef.current=true;
        setNodes((ns:any[])=>ns.filter((n:any)=>n.id!==nodeId));
      });
      socket.on("edge-update",({edges:es}:any)=>{
        remoteUpdateRef.current=true;
        setEdges(es);
      });
      socket.on("cursor-move",({email,name,x,y}:any)=>setRemoteCursors(c=>({...c,[email]:{x,y,name,email}})));
    }catch(e){/* WebSocket недоступен — работаем без него */}
    return()=>{socket?.emit("leave-map",{mapId:mapData.id});socket?.disconnect();socketRef.current=null;setOnlineUsers([]);};
  },[mapData?.id,user?.email]);

  useEffect(()=>{document.title=`${mapData?.name||project?.name||"Карта"} — Strategy AI`;return()=>{document.title="Strategy AI";};},[mapData?.name,project?.name]);

  // Состояние единого AI-чата живёт в App и прокидывается сюда

  // Трансляция перемещения узла через WebSocket
  function emitNodeMove(nodeId:string,x:number,y:number){
    socketRef.current?.emit("node-move",{mapId:mapData?.id,nodeId,x,y});
  }
  function emitNodeUpdate(node:any){
    socketRef.current?.emit("node-update",{mapId:mapData?.id,node});
  }
  function emitEdgeUpdate(edges:any[]){
    if(!readOnly)socketRef.current?.emit("edge-update",{mapId:mapData?.id,edges});
  }
  function setEdgesUser(updater:(prev:any[])=>any[]){
    setEdges(prev=>{const next=updater(prev);emitEdgeUpdate(next);return next;});
  }
  function undo(){if(!undoStack.length)return;const prev=undoStack[undoStack.length-1];setRedoStack(r=>[...r,{nodes,edges}]);setNodes(prev.nodes);setEdges(prev.edges);setUndoStack(s=>s.slice(0,-1));}
  function redo(){if(!redoStack.length)return;const next=redoStack[redoStack.length-1];setUndoStack(s=>[...s,{nodes,edges}]);setNodes(next.nodes);setEdges(next.edges);setRedoStack(r=>r.slice(0,-1));}

  function updateNode(n){pushUndo(nodes,edges);setNodes(ns=>ns.map(x=>x.id===n.id?n:x));}
  function deleteNode(id){
    pushUndo(nodes,edges);
    setNodes(ns=>ns.filter(x=>x.id!==id));
    setEdges(es=>{const next=es.filter(e=>e.source!==id&&e.target!==id);if(!readOnly)socketRef.current?.emit("edge-update",{mapId:mapData?.id,edges:next});return next;});
    setSelNode(null);
    if(!readOnly)socketRef.current?.emit("node-delete",{mapId:mapData?.id,nodeId:id});
  }
  function duplicateNode(n){const copy={...n,id:uid(),x:n.x+60,y:n.y+60,title:n.title+" (копия)",comments:[],history:[]};pushUndo(nodes,edges);setNodes(ns=>[...ns,copy]);if(!readOnly)socketRef.current?.emit("node-add",{mapId:mapData?.id,node:copy});}
  function importJSON(){importRef.current?.click();}
  function handleImportFile(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const raw=ev.target?.result;
        if(typeof raw!=="string")return;
        const d=JSON.parse(raw);
        if(d.nodes||d.edges){
          pushUndo(nodes,edges);
          const newEdges=d.edges||[];
          setNodes((d.nodes||[]).map(n=>({...n,comments:n.comments||[],history:n.history||[]})));
          setEdges(newEdges);
          emitEdgeUpdate(newEdges);
          setTimeout(fitView,100);
          addToast(t("imported_steps","✅ Импортировано: {n} шагов").replace("{n}",String((d.nodes||[]).length)),"success");
        }else addToast(t("json_invalid","Некорректный формат JSON"),"error");
      }catch{addToast(t("file_read_err","Ошибка чтения файла"),"error");}
      e.target.value="";
    };
    r.readAsText(f);
  }

  function addNode(){
    const v=viewRef.current;
    const mapX=snap((W/2-v.x)/v.zoom-120);
    const mapY=snap((H/2-v.y)/v.zoom-64);
    const n={id:uid(),x:mapX,y:mapY,title:t("new_step_title","Новый шаг"),reason:"",action:"",metric:"",status:"planning",priority:"medium",progress:0,tags:[],color:"",comments:[],history:[]};
    pushUndo(nodes,edges);setNodes(ns=>[...ns,n]);setSelNode(n);
    if(!readOnly)socketRef.current?.emit("node-add",{mapId:mapData?.id,node:n});
  }
  function addNodeAt(clientX:number,clientY:number){
    const rect=svgRef.current?.getBoundingClientRect();
    if(!rect)return addNode();
    const v=viewRef.current;
    const cx=clientX-rect.left,cy=clientY-rect.top;
    const mapX=snap((cx-v.x)/v.zoom-120);
    const mapY=snap((cy-v.y)/v.zoom-64);
    const n={id:uid(),x:mapX,y:mapY,title:t("new_step_title","Новый шаг"),reason:"",action:"",metric:"",status:"planning",priority:"medium",progress:0,tags:[],color:"",comments:[],history:[]};
    pushUndo(nodes,edges);setNodes(ns=>[...ns,n]);setSelNode(n);
    if(!readOnly)socketRef.current?.emit("node-add",{mapId:mapData?.id,node:n});
  }

  async function exportPNG(){
    if(!svgRef.current||exporting)return;
    setExporting(true);
    try{
      const svg=svgRef.current;
      const svgClone=svg.cloneNode(true);
      const isDark=theme!=="light";
      const bg=isDark?"#050410":"#ece9ff";
      const bgRect=document.createElementNS("http://www.w3.org/2000/svg","rect");
      bgRect.setAttribute("width","100%");bgRect.setAttribute("height","100%");bgRect.setAttribute("fill",bg);
      svgClone.insertBefore(bgRect,svgClone.firstChild);
      const svgStr=new XMLSerializer().serializeToString(svgClone);
      const blob=new Blob([svgStr],{type:"image/svg+xml;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement("canvas");
        canvas.width=svg.clientWidth*2;canvas.height=svg.clientHeight*2;
        const ctx=canvas.getContext("2d");
        ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.scale(2,2);ctx.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        canvas.toBlob(b=>{
          const a=document.createElement("a");
          a.href=URL.createObjectURL(b);
          a.download=`${mapData?.name||project?.name||"strategy"}.png`;
          a.click();
          setExporting(false);
          addToast(t("png_exported","PNG экспортирован ✓"),"success");
        },"image/png");
      };
      img.onerror=()=>setExporting(false);
      img.src=url;
    }catch{setExporting(false);}
  }

  function exportJSON(){
    const data={name:mapData?.name||project?.name||"map",ctx:mapData?.ctx,nodes,edges,exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`${((mapData?.name||project?.name||"strategy").replace(/\s+/g,"-"))}.json`;a.click();
    URL.revokeObjectURL(url);
    addToast(t("json_exported","JSON экспортирован ✓"),"success");
  }

  async function shareMap(){
    const mapPayload={name:mapData?.name||project?.name||"",nodes,edges,ctx:mapData?.ctx||""};
    const projectName=project?.name||"";
    let url="";
    if(API_BASE){
      try{
        const d=await apiFetch("/api/shares",{
          method:"POST",
          body:JSON.stringify({mapId:mapData?.id,projectId:project?.id,projectName,mapData:mapPayload}),
        });
        url=d.url;
      }catch(e:any){addToast(e.message||t("share_create_err","Ошибка создания ссылки"),"error");return;}
    } else {
      const shareId=uid();
      await store.set("sa_share_"+shareId,{map:mapPayload,projectName,createdAt:Date.now()});
      url=(typeof window!=="undefined"?window.location.origin+window.location.pathname:"")+"?share="+shareId;
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(url);
      else{const ta=document.createElement("textarea");ta.value=url;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}
      addToast(t("share_copied","Ссылка скопирована. Откройте её для просмотра карты."),"success");
    }catch{addToast(url,"info");}
  }

  function exportPDF(){
    const title=mapData?.name||project?.name||"Strategy Map";
    const rows=nodes.map((n:any)=>`<tr><td>${sanitize(n.title)}</td><td>${sanitize(n.status)||"-"}</td><td>${n.progress!=null?n.progress+"%":"-"}</td><td>${sanitize(n.deadline)||"-"}</td><td>${sanitize(n.metric)||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitize(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>@page{margin:20mm 15mm}body{font-family:'Inter',system-ui,sans-serif;padding:0;color:#08061a;font-size:13px;background:#fff}
h1{font-size:22px;font-weight:700;color:#08061a;margin:0 0 6px;letter-spacing:-.02em}
.meta{color:rgba(70,58,130,.55);font-size:12px;margin-bottom:20px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid rgba(104,80,220,.14);padding:8px 11px;text-align:left}
th{background:rgba(104,54,245,.08);font-weight:600;font-size:12px;color:#232060}
tr:nth-child(even){background:rgba(236,233,255,.35)}
</style></head><body>
<h1>${sanitize(title)}</h1>
<p class="meta">${new Date().toLocaleDateString()} · ${nodes.length} ${t("steps_label","шагов")} · Strategy AI</p>
<table><thead><tr><th>${t("step","Шаг")}</th><th>${t("status","Статус")}</th><th>${t("progress","Прогресс")}</th><th>${t("deadline","Дедлайн")}</th><th>${t("metric","Метрика")}</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
    const w=window.open("","_blank");
    if(!w){addToast(t("popup_blocked","Разрешите всплывающие окна для экспорта"),"warn");return;}
    w.document.write(html);w.document.close();
    w.onload=()=>{w.print();(w as any).onafterprint=()=>w.close();};
  }

  async function exportPPTX(){
    const title=sanitize(mapData?.name||project?.name||"Strategy Map");
    const date=new Date().toLocaleDateString("ru-RU");
    const hasRealPptx=TIERS[user?.tier||"free"]?.pptx;
    if(hasRealPptx){
      try{
        const pres=new pptxgen();
        pres.title=title;
        pres.author="Strategy AI";
        const titleSlide=pres.addSlide();
        titleSlide.addText(title,{x:0.5,y:1.5,w:9,h:1,fontSize:44,bold:true,color:"08061a"});
        titleSlide.addText(`${t("strategy_map","Стратегическая карта")} · ${date} · ${nodes.length} ${t("steps_label","шагов")}`,{x:0.5,y:2.5,w:9,h:0.5,fontSize:18,color:"9088b0"});
        for(let i=0;i<nodes.length;i++){
          const n=nodes[i];
          const slide=pres.addSlide();
          slide.addText(sanitize(n.title||""),{x:0.5,y:0.3,w:9,h:0.8,fontSize:28,bold:true,color:"08061a"});
          slide.addText(`${n.status||"planning"} · ${n.priority||"medium"}`,{x:0.5,y:1.1,w:9,h:0.3,fontSize:12,color:"9088b0"});
          if(n.reason)slide.addText(sanitize(n.reason).slice(0,500),{x:0.5,y:1.5,w:9,h:1.5,fontSize:14,color:"6c6480",valign:"top"});
          if(n.metric)slide.addText(`🎯 ${sanitize(n.metric)}`,{x:0.5,y:3.2,w:9,h:0.4,fontSize:14,color:"6836f5",bold:true});
          slide.addText(`${n.progress||0}%${n.deadline?` · ${t("deadline","Дедлайн")}: ${n.deadline}`:""}`,{x:0.5,y:3.7,w:9,h:0.3,fontSize:12,color:"9088b0"});
        }
        const fname=`${title.replace(/[^a-zA-Zа-яА-Я0-9\s-]/g,"").slice(0,40)}.pptx`;
        await pres.writeFile({fileName:fname});
        addToast(t("export_pptx","⬇ PPTX")+" ✓","success");
      }catch(e:any){addToast(e?.message||t("save_error","Ошибка экспорта"),"error");}
      return;
    }
    const statusColors:Record<string,string>={completed:"#12c482",active:"#6836f5",planning:"#9088b0",paused:"#f09428",blocked:"#f04458"};
    const prioColors:Record<string,string>={critical:"#f04458",high:"#f09428",medium:"#6836f5",low:"#a8a4c8"};
    const slides=nodes.map((n:any,i:number)=>`
      <div class="slide">
        <div class="slide-num">${i+1} / ${nodes.length}</div>
        <div class="slide-tag" style="background:${statusColors[n.status]||"#9088b0"}20;color:${statusColors[n.status]||"#9088b0"};border:1px solid ${statusColors[n.status]||"#9088b0"}40">${n.status||"planning"}</div>
        <div class="prio-tag" style="background:${prioColors[n.priority]||"#9088b0"}20;color:${prioColors[n.priority]||"#9088b0"}">${n.priority||"medium"}</div>
        <h2>${sanitize(n.title)}</h2>
        ${n.reason?`<p class="reason">${sanitize(n.reason)}</p>`:""}
        ${n.metric?`<div class="metric">🎯 ${sanitize(n.metric)}</div>`:""}
        <div class="progress-wrap"><div class="progress-bar" style="width:${n.progress||0}%"></div></div>
        <div class="prog-label">${n.progress||0}%${n.deadline?` · ${t("deadline","Deadline")}: ${n.deadline}`:""}</div>
      </div>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
@page{size:297mm 210mm landscape;margin:0}
*{box-sizing:border-box}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
body{font-family:'Inter',system-ui,sans-serif;background:#ece9ff;margin:0;padding:0}
.title-slide{width:297mm;height:210mm;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(104,54,245,.35),transparent 55%),linear-gradient(145deg,#12081f 0%,#050410 48%,#0c0622 100%);page-break-after:always}
.title-slide h1{font-size:42px;font-weight:800;color:#eaeaf8;margin:0 0 12px;text-align:center;letter-spacing:-.03em}
.title-slide p{font-size:18px;color:rgba(188,186,224,.62);margin:0}
.slide{width:297mm;height:210mm;padding:28mm 20mm 20mm;position:relative;display:flex;flex-direction:column;justify-content:center;page-break-after:always;border-top:4px solid #6836f5;background:#fff}
.slide-num{position:absolute;top:12mm;right:14mm;font-size:11px;color:rgba(70,58,130,.45)}
.slide-tag{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px;margin-right:6px}
.prio-tag{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px}
h2{font-size:32px;font-weight:800;color:#08061a;margin:0 0 12px;line-height:1.2;letter-spacing:-.02em}
.reason{font-size:16px;color:rgba(35,28,80,.78);margin:0 0 16px;line-height:1.6}
.metric{font-size:15px;color:#6836f5;font-weight:600;margin-bottom:16px;padding:10px 16px;background:rgba(104,54,245,.1);border:1px solid rgba(104,80,220,.18);border-radius:12px;display:inline-block}
.progress-wrap{height:10px;background:rgba(104,80,220,.12);border-radius:5px;margin-bottom:6px;max-width:400px}
.progress-bar{height:10px;background:linear-gradient(90deg,#6836f5,#a050ff);border-radius:5px;transition:width .3s}
.prog-label{font-size:13px;color:rgba(70,58,130,.45)}
@media print{.slide,.title-slide{display:flex!important}}
</style></head><body>
<div class="title-slide"><h1>${title}</h1><p>Стратегическая карта · ${date} · ${nodes.length} шагов</p></div>
${slides}
</body></html>`;
    const w=window.open("","_blank");
    if(!w){addToast(t("popup_blocked","Разрешите всплывающие окна для экспорта"),"warn");return;}
    w.document.write(html);w.document.close();
    setTimeout(()=>{w.print();},500);
    addToast(t("export_pptx","⬇ PPTX")+" — "+t("export_pptx_print_hint","откроется окно печати"),"success");
  }

  function fitView(){
    if(!nodes.length)return;
    const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs)+240,minY=Math.min(...ys),maxY=Math.max(...ys)+128;
    const pad=60;
    const scaleX=(W-pad*2)/(maxX-minX||1),scaleY=(H-120)/(maxY-minY||1);
    const zoom=Math.max(.2,Math.min(1.5,Math.min(scaleX,scaleY)));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const nx=W/2-cx*zoom,ny=(H-60)/2-cy*zoom;
    viewRef.current={x:nx,y:ny,zoom};setView({x:nx,y:ny,zoom});
  }

  function autoLayout(){
    const sorted=topSort(nodes,edges);
    const newNodes=nodes.map(n=>{
      const idx=sorted.findIndex(s=>s.id===n.id);
      const safeIdx=idx<0?nodes.indexOf(n):idx;
      const col=safeIdx%4,row=Math.floor(safeIdx/4);
      return{...n,x:snap(60+col*300),y:snap(60+row*180)};
    });
    pushUndo(nodes,edges);setNodes(newNodes);addToast(t("layout_applied","⌥ Авто-раскладка применена"),"info");
    setTimeout(fitView,50);
  }

  async function autoConnect(){
    if(nodes.length<2){addToast(t("min_2_steps","Нужно минимум 2 шага"),"info");return;}
    addToast(t("ai_analyzing_links","🔗 AI анализирует логику карты…"),"info");
    const ctx=nodes.map(n=>`ID: ${n.id}\nНазвание: ${n.title}${n.reason?`\nОписание: ${n.reason}`:""}${n.metric?`\nМетрика: ${n.metric}`:""}${n.status?`\nСтатус: ${n.status}`:""}${n.deadline?`\nДедлайн: ${n.deadline}`:""}${n.tags?.length?`\nТеги: ${n.tags.join(", ")}`:""}`)
      .join("\n\n");
    const existingEdges=edges.map(e=>`${e.source} → ${e.target} (${e.type||"requires"})`).join(", ")||"нет";
    try{
      const r=await callAI([{role:"user",content:
`Ты — стратегический аналитик. Определи ТОЛЬКО логически обоснованные причинно-следственные связи между шагами.

ШАГИ:
${ctx}

УЖЕ СУЩЕСТВУЮЩИЕ СВЯЗИ: ${existingEdges}

БАЗА ЗНАНИЙ (учитывай при анализе): ${AI_KNOWLEDGE}

ПРАВИЛА:
- requires: A нужен для B (без A нельзя B). affects: A влияет на B. blocks: A блокирует B. follows: B после A.
- Учитывай отрасль: маркетинг (воронка TOFU/MOFU/BOFU), продажи (pipeline, BANT), стратегию (последовательность шагов)
- НЕ добавляй связи "по теме" — только логические зависимости. Максимум 6 новых связей.
- Если блокировка/зависимость — обоснуй в reason. Используй ID из шагов (id, не title).

Верни ТОЛЬКО валидный JSON (без markdown):
{
  "connections": [{"source":"id1","target":"id2","type":"requires","reason":"кратко почему эта связь логична"}],
  "summary": "2-3 предложения: что обнаружил в логике карты и почему добавил именно эти связи"
}`
      }],"Верни ТОЛЬКО JSON без markdown. Думай как стратег. Учитывай отрасль и бизнес-контекст.",900);
      const clean=r.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const newConns=parsed.connections||[];
      const filtered=newConns.filter(e=>
        e.source&&e.target&&e.source!==e.target&&
        nodes.find(n=>n.id===e.source)&&
        nodes.find(n=>n.id===e.target)&&
        !edges.find(ex=>ex.source===e.source&&ex.target===e.target)
      );
      if(filtered.length){
        pushUndo(nodes,edges);
        setEdgesUser(es=>[...es,...filtered.map(e=>({...e,id:uid(),label:e.reason||""}))]);
        addToast(t("links_added","🔗 Добавлено: {n} связей").replace("{n}",String(filtered.length)),"success");
        // Open AI panel and show reasoning
        setShowAI(true);
        setSelNode(null);
        const reasonLines=filtered.map(e=>{
          const src=nodes.find(n=>n.id===e.source)?.title||e.source;
          const tgt=nodes.find(n=>n.id===e.target)?.title||e.target;
          const typeLabel={requires:"→ требует",affects:"→ влияет на",blocks:"→ блокирует",follows:"→ следует после"}[e.type]||"→";
          return `• **${src}** ${typeLabel} **${tgt}**\n  ${e.reason||""}`;
        }).join("\n");
        const msg=`🔗 **AI-связи добавлены (${filtered.length})**\n\n${reasonLines}\n\n---\n${parsed.summary||""}`;
        // inject as AI message into chat
        setPendingAiMsgs(prev=>[...prev,{role:"assistant",content:msg,ts:Date.now()}]);
      } else {
        addToast(t("links_optimal","Связи уже оптимальны — добавить нечего"),"info");
        setShowAI(true);
        setPendingAiMsgs(prev=>[...prev,{role:"assistant",content:`🔍 **Анализ связей завершён**\n\n${parsed.summary||"Все логические связи уже присутствуют на карте. AI не нашёл новых обоснованных зависимостей."}`,ts:Date.now()}]);
      }
    }catch(err:any){
      const msg=err?.message||"";
      const hint=msg.includes("429")||msg.includes("лимит")?t("ai_rate_limit_hint","Превышен лимит запросов. Подождите минуту."):msg.includes("network")||msg.includes("fetch")?t("ai_network_err","Проверьте интернет и ключ API."):t("ai_error","Ошибка AI-анализа");
      addToast(hint,"error");
    }
  }

  // load allMaps + trigger onboarding
  useEffect(()=>{
    (async()=>{
      const ms=await getMaps(project.id);
      setAllMaps(ms);
      if(isNew&&(!mapData?.nodes||mapData.nodes.length===0)){
        setShowOnboarding(true);
      } else if(isNew&&mapData?.nodes?.length>0){
        const toured=sessionStorage.getItem("sa_toured");
        if(!toured){sessionStorage.setItem("sa_toured","1");setShowTour(true);}
      }
    })();
    setTimeout(fitView,120);
  },[]);

  // save
  useEffect(()=>{
    if(readOnly)return;
    if(user?.autoSave===false)return; // Учёт настройки автосохранения
    // Если изменение пришло от коллеги — не запускаем autosave, сбрасываем флаг
    if(remoteUpdateRef.current){remoteUpdateRef.current=false;return;}
    setSaveState("saving");
    const tid=setTimeout(async()=>{
      try{
        const map={...mapData,nodes,edges,updatedAt:Date.now()};
        await saveMap(project.id,map);
        setSaveState("saved");
      }catch(e:any){
        setSaveState("error");
        if(!e?.message?.includes("MAP_LIMIT")){
          console.warn("Autosave failed:",e?.message);
        }
      }
    },900);
    return()=>clearTimeout(tid);
  },[nodes,edges,user?.autoSave]);

  // beforeunload — предупреждение при уходе с несохранёнными изменениями
  useEffect(()=>{
    if(readOnly)return;
    const h=(e:BeforeUnloadEvent)=>{if(saveState==="saving"||saveState==="error"){e.preventDefault();}};
    window.addEventListener("beforeunload",h);return()=>window.removeEventListener("beforeunload",h);
  },[saveState,readOnly]);

  // keyboard
  useEffect(()=>{
    function onKey(e){
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
      if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      else if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))){e.preventDefault();redo();}
      else if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==="A"){e.preventDefault();setShowAI(a=>!a);if(selNode)setSelNode(null);}
      else if((e.ctrlKey||e.metaKey)&&e.key==="c"&&selNode){setClipboard(selNode);addToast(t("copied","📋 Скопировано"),"info");}
      else if((e.ctrlKey||e.metaKey)&&e.key==="v"&&clipboard){const copy={...clipboard,id:uid(),x:clipboard.x+60,y:clipboard.y+60};pushUndo(nodes,edges);setNodes(ns=>[...ns,copy]);addToast(t("pasted","📋 Вставлено"),"info");}
      else if(e.key==="Escape"){if(ctxMenu)setCtxMenu(null);else{setConnecting(false);setConnectSrc(null);setSelNode(null);setSelNodes(new Set());}}
      else if((e.key==="Delete"||e.key==="Backspace")&&(selNode||selNodes.size)&&!connecting){
        const toDel=selNodes.size?Array.from(selNodes):[selNode.id];
        pushUndo(nodes,edges);
        setNodes(ns=>ns.filter(n=>!toDel.includes(n.id)));
        setEdgesUser(es=>es.filter(e=>!toDel.includes(e.source)&&!toDel.includes(e.target)));
        setSelNodes(new Set());setSelNode(null);
      }
      else if((e.key==="Delete"||e.key==="Backspace")&&selEdge){pushUndo(nodes,edges);setEdgesUser(es=>es.filter(x=>x.id!==selEdge.id));setSelEdge(null);}
      else if(e.key==="?"||e.key==="/"){ setShowShortcuts(s=>!s);}
      else if((e.ctrlKey||e.metaKey)&&e.key==="a"){e.preventDefault();if(nodes.length){setSelNodes(new Set(nodes.map(n=>n.id)));setSelNode(nodes[0]);}}
      else if((selNode||selNodes.size)&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
        e.preventDefault();
        const d=e.shiftKey?40:10;
        const dx=e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0;
        const dy=e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0;
        const ids=selNodes.size?selNodes:new Set([selNode.id]);
        setNodes(ns=>ns.map(n=>ids.has(n.id)?{...n,x:snap(n.x+dx),y:snap(n.y+dy)}:n));
      }
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[selNode,selEdge,selNodes,clipboard,connecting,undoStack,redoStack,nodes,edges,ctxMenu]);

  function onSvgMouseDown(e){
    const isTouch=e.pointerType==="touch";
    const isEmptyBg=e.target===svgRef.current||e.target?.tagName==="svg"||e.target?.getAttribute?.("data-canvas-bg")==="1";
    const wantPan=isTouch||e.button===1||(e.button===0&&(e.altKey||isEmptyBg));
    if(wantPan&&isEmptyBg){
      panning.current={startX:e.clientX-viewRef.current.x,startY:e.clientY-viewRef.current.y};
      e.preventDefault();return;
    }
    if(isEmptyBg){
      setSelNode(null);setSelEdge(null);
      if(connecting){setConnecting(false);setConnectSrc(null);}
    }
  }
  function onSvgMouseMove(e){
    if(panning.current){
      const x=e.clientX-panning.current.startX,y=e.clientY-panning.current.startY;
      viewRef.current={...viewRef.current,x,y};setView(v=>({...v,x,y}));e.preventDefault();return;
    }
    if(dragging.current){
      const{node,startMX,startMY,startNX,startNY,offsets}=dragging.current;
      const dx=(e.clientX-startMX)/viewRef.current.zoom,dy=(e.clientY-startMY)/viewRef.current.zoom;
      if(offsets){setNodes(ns=>ns.map(n=>offsets[n.id]!==undefined?{...n,x:snap(offsets[n.id].x+dx),y:snap(offsets[n.id].y+dy)}:n));}
      else{setNodes(ns=>ns.map(n=>n.id===node.id?{...n,x:snap(startNX+dx),y:snap(startNY+dy)}:n));}
    }
  }
  function onSvgMouseUp(){panning.current=null;if(dragging.current){dragging.current=null;}}
  function onWheel(e){
    e.preventDefault();
    const factor=e.deltaY<0?1.1:0.91;
    const nx=viewRef.current.zoom*factor;
    if(nx<0.2||nx>3)return;
    const rect=svgRef.current?.getBoundingClientRect();
    const cx=rect?e.clientX-rect.left:W/2,cy=rect?e.clientY-rect.top:H/2;
    const newX=cx-(cx-viewRef.current.x)*factor,newY=cy-(cy-viewRef.current.y)*factor;
    viewRef.current={x:newX,y:newY,zoom:nx};setView({x:newX,y:newY,zoom:nx});
  }
  function onNodeMouseDown(e,node){
    if(readOnly)return;
    if(e.pointerType!=="touch"&&e.button!==0)return;
    if(connecting){
      if(connectSrc&&connectSrc.id!==node.id){
        if(!edges.find(ex=>ex.source===connectSrc.id&&ex.target===node.id)){
          const ne={id:uid(),source:connectSrc.id,target:node.id,type:"requires",label:""};
          pushUndo(nodes,edges);setEdgesUser(es=>[...es,ne]);
        }
      }else{setConnectSrc(node);}
      return;
    }
    e.stopPropagation();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    const ids=selNodes.size?selNodes:new Set([node.id]);
    const offsets=ids.size>1?Object.fromEntries(nodes.filter(n=>ids.has(n.id)).map(n=>[n.id,{x:n.x,y:n.y}])):undefined;
    dragging.current={node,startMX:e.clientX,startMY:e.clientY,startNX:node.x,startNY:node.y,offsets};
  }
  function onNodeClick(node,ev?:{shiftKey?:boolean}){
    if(connecting){return;}
    if(ev?.shiftKey){
      const next=new Set(selNodes);
      if(next.has(node.id))next.delete(node.id);else next.add(node.id);
      setSelNodes(next);
      setSelNode(next.size?(next.has(node.id)?node:nodes.find(n=>next.has(n.id))||null):null);
    }else{
      setSelNode(node);setSelEdge(null);setSelNodes(new Set([node.id]));
    }
  }
  function startConnect(node){setConnecting(true);setConnectSrc(node);setSelNode(null);}
  function scrollToNode(node){
    const nx=W/2-node.x*viewRef.current.zoom-120*viewRef.current.zoom;
    const ny=H/2-node.y*viewRef.current.zoom-64*viewRef.current.zoom;
    viewRef.current={...viewRef.current,x:nx,y:ny};setView(v=>({...v,x:nx,y:ny}));
  }

  const filteredNodes=nodes.filter(n=>{
    if(statusFilter!=="all"&&n.status!==statusFilter)return false;
    if(!search)return true;
    const q=search.toLowerCase();
    return n.title?.toLowerCase().includes(q)||n.reason?.toLowerCase().includes(q)||(n.tags||[]).some(t=>t.toLowerCase().includes(q));
  });
  const hiddenIds=new Set(nodes.filter(n=>!filteredNodes.find(f=>f.id===n.id)).map(n=>n.id));

  const tier=TIERS[user?.tier||"free"]||TIERS.free;
  const rightPanelOpen=selNode||showAI;
  const[bgMode,setBgMode]=useState("grid"); // grid = точки + --map-canvas (strategy-reference.html) | stars | none
  const toolbarStyle={display:"flex",alignItems:"center",gap:5};
  const btnStyle=(active)=>({padding:"6px 12px",borderRadius:10,border:`1px solid ${active?"var(--accent-1)":"var(--border)"}`,background:active?"var(--accent-soft)":"transparent",color:active?"var(--accent-2)":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",transition:"all .2s"});
  const sep=<div style={{width:1,height:24,background:"var(--border)",margin:"0 6px",flexShrink:0,borderRadius:1}}/>;
  const ib=(active,title,onClick,children,extraStyle={})=>(
    <button onClick={onClick} title={title} aria-label={title} style={{width:38,height:38,borderRadius:12,border:"none",background:active?"var(--accent-soft)":"transparent",color:active?"var(--accent-2)":"var(--text4)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",...extraStyle}}
      onMouseOver={e=>{if(!active)e.currentTarget.style.background="var(--surface)";}} onMouseOut={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
      {children}
    </button>
  );
  const tb=(active,onClick,children,titleOrStyle?:string|object,extraStyle={})=>{
    const opts: {title?: string} & Record<string, unknown>=typeof titleOrStyle==="string"?{title:titleOrStyle,...extraStyle}:{...(titleOrStyle && typeof titleOrStyle==="object"?titleOrStyle:{}),...extraStyle};
    const {title,...style}=opts;
    return (
    <button onClick={onClick} title={title} style={{height:38,padding:"0 16px",borderRadius:12,border:"none",background:active?"var(--accent-soft)":"transparent",color:active?"var(--accent-2)":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,transition:"all .2s",display:"flex",alignItems:"center",gap:8,...style}}
      onMouseOver={e=>{if(!active)e.currentTarget.style.background="var(--surface)";}} onMouseOut={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
      {children}
    </button>
  );};
  const retrySave=async()=>{setSaveState("saving");try{await saveMap(project.id,{...mapData,nodes,edges,updatedAt:Date.now()});setSaveState("saved");}catch{setSaveState("error");}};
  const saveVersion=async()=>{if(!API_BASE||!project?.id||!mapData?.id)return;try{const lbl=t("version_save_label","Промежуточная версия")+" "+new Date().toLocaleString("ru",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});await apiFetch(`/api/projects/${project.id}/maps/${mapData.id}/versions`,{method:"POST",body:JSON.stringify({label:lbl,nodes,edges,ctx:mapData?.ctx||""})});addToast(t("version_saved","Версия сохранена ✓"),"success");}catch(e:any){addToast(e?.message||t("save_error","Ошибка"),"error");}};

  function handleShellNav(nav:StrategyShellNav){
    if(nav==="ai"){setShowAI(true);return;}
    if(nav==="scenarios"){setShowSim(true);return;}
    if(nav==="timeline"){setShowGantt(true);return;}
    if(nav==="insights"){setShowStats(true);return;}
    if(nav==="settings"){onProfile();return;}
    if(nav==="map")return;
    if(nav==="team"){addToast(t("shell_team_hint","Участники проекта — в карточке проекта и в профиле."),"info");return;}
    onShellGlobalNav?.(nav);
  }
  const shellUi=!!user&&!isMobile;

  const _mapMain=(
    <>
{readOnly&&(
        <div style={{flexShrink:0,background:"rgba(148,163,184,.12)",borderBottom:"1px solid var(--border)",padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:12.5,color:"var(--text3)",fontWeight:600}}>
          <span>👁</span> {t("read_only_banner","Режим просмотра — вы можете просматривать карту, но не редактировать")}
        </div>
      )}
      {shellUi&&(
        <div className="sa-topbar">
          <div className="tb-l">
            <div className="tb-title-wrap">
              <span className="tb-title">{mapData?.name||t("shell_strategy_map","Карта стратегии")}</span>
              <span className="tb-sub">{project?.name||""}</span>
              <span className="tb-flow">{t("workspace_flow_hint_map","Шаги и связи — контекст для сценариев, Gantt и AI.")}</span>
            </div>
          </div>
          <div className="tb-r">
            {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)}/>}
            {!readOnly&&(
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:saveState==="saving"?"#f09428":saveState==="error"?"#f04458":"#12c482"}}>
                {saveState==="saving"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> {t("saving","Сохраняю")}</>:saveState==="error"?<>✗ {t("save_error","Ошибка")}</>:<>✓ {t("saved_short","Сохранено")}</>}
              </div>
            )}
            {!readOnly&&user&&(
              <button type="button" className="btn-ic" onClick={onProfile} title={t("profile_title","Профиль")} aria-label={t("profile_title","Профиль")}>{(user?.name||user?.email||"U")[0].toUpperCase()}</button>
            )}
          </div>
        </div>
      )}
      {/* ── TOOLBAR — 2 rows ── */}
      <div className={shellUi?"sa-map-toolbar-rows":undefined} style={{flexShrink:0,zIndex:30,borderBottom:"1px solid var(--glass-border-accent,var(--border))",background:shellUi?"transparent":"var(--bg2)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",boxShadow:shellUi?"none":"0 1px 0 var(--glass-border-accent,var(--border))"}}>

        {/* ROW 1 — primary actions + search */}
        <div style={{minHeight:60,display:"flex",alignItems:"center",gap:isMobile?10:12,padding:isMobile?"10px 16px":shellUi?"0 20px":"0 24px",borderBottom:"1px solid var(--border)",flexWrap:isMobile?"wrap":shellUi?"wrap":undefined}}>

          {/* LEFT: nav + breadcrumb + edit */}
          <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12,flexShrink:0,minWidth:0}}>
            {tb(false,onBack,<>{t("back_btn","← Назад")}</>,t("back_to_project","Вернуться в проект"))}
            {project?.name&&mapData?.name&&!isMobile&&(
              <span style={{fontSize:13,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}} title={`${project.name} → ${mapData.name}`}>
                {project.name} <span style={{opacity:.6}}>→</span> {mapData.name}
              </span>
            )}
            {!readOnly&&<>{sep}
            <button className="btn-interactive sa-tbar-btn--add" onClick={addNode} title={t("add_step_hint","Добавить шаг (клик на пустое место)")} style={{height:40,padding:isMobile?"0 14px":"0 18px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:14,fontWeight:700,flexShrink:0,display:"flex",alignItems:"center",gap:8,boxShadow:"0 2px 12px var(--accent-glow)"}}>
              <span style={{fontSize:17,lineHeight:1}}>+</span> {t("step_short","Шаг")}
            </button>
            <button onClick={()=>{setConnecting(c=>!c);setConnectSrc(null);}} title={connecting?t("cancel","Отмена"):t("link_mode_hint","Режим связи: клик на источник, затем на цель")}
              style={{height:40,padding:isMobile?"0 12px":"0 16px",borderRadius:12,border:"none",background:connecting?"var(--accent-soft)":"var(--surface)",color:connecting?"var(--accent-2)":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
              {connecting?<><span style={{color:"#f04458"}}>✕</span> {isMobile?t("cancel_short","Отм."):t("cancel","Отмена")}</>:<>{isMobile?"⇒":t("link_btn","⇒ Связать")}</>}
            </button>
            {sep}
            {ib(!undoStack.length,"Отменить (Ctrl+Z)",undo,<>↩</>,{opacity:undoStack.length?.9:.35})}
            {ib(!redoStack.length,"Повторить (Ctrl+Y)",redo,<>↪</>,{opacity:redoStack.length?.9:.35})}
            </>}
          </div>

          {sep}

          {/* CENTER: search + filter */}
          <div style={{flex:isMobile?undefined:1,display:"flex",alignItems:"center",gap:isMobile?4:6,justifyContent:"center",minWidth:0,flexShrink:isMobile?0:undefined}}>
            {!isMobile&&<div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"var(--text4)",pointerEvents:"none"}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по шагам…"
                style={{padding:"10px 14px 10px 38px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",width:220,fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"}}/>
            </div>}
            {isMobile&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍" style={{padding:"6px 10px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",width:60,fontFamily:"inherit"}}/>}
            <CustomSelect value={statusFilter} onChange={v=>setStatusFilter(v)}
              options={[{value:"all",label:isMobile?t("all_statuses_short","Статусы"):t("all_statuses","Все статусы")},...Object.entries(STATUS).map(([k,s])=>({value:k,label:s.label,dot:s.c}))]}
              style={{minWidth:isMobile?72:100}}/>
            <div style={{fontSize:13,color:"var(--text4)",fontWeight:600,padding:"6px 12px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)",whiteSpace:"nowrap",flexShrink:0}}>
              {filteredNodes.length}{search||statusFilter!=="all"?`/${nodes.length}`:""}{isMobile?"":" шагов"}
            </div>
          </div>

          {sep}

          {/* RIGHT: user + save */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {!shellUi&&ib(false,"Переключить тему",onToggleTheme,theme==="dark"?<>☀️</>:<>🌙</>)}
            {!shellUi&&API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)}/>}
            {readOnly?(
              <div style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",fontSize:13,fontWeight:600,color:"var(--text4)"}}>{t("read_only","Только просмотр")}</div>
            ):(
              <>
            {!shellUi&&(
            <button onClick={onProfile} title={t("profile_title","Профиль")} aria-label={t("profile_title","Профиль")}
              style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${tier.color}55`,background:`linear-gradient(135deg,${tier.color}cc,${tier.color}44)`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {(user?.name||user?.email||"U")[0].toUpperCase()}
            </button>
            )}
            {!shellUi&&(
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:saveState==="saving"?"#f09428":saveState==="error"?"#f04458":"#12c482",transition:"color .25s ease, opacity .25s ease"}}>
              {saveState==="saving"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> {t("saving","Сохраняю")}</>:saveState==="error"?<><span>✗</span> {t("save_error","Ошибка сохранения")} <button className="btn-interactive" onClick={retrySave} style={{marginLeft:4,padding:"2px 8px",borderRadius:6,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.1)",color:"#f04458",cursor:"pointer",fontSize:12,fontWeight:700}}>{t("retry","Повторить")}</button></>:<><span style={{animation:"successPop .35s ease"}}>✓</span> {t("saved_short","Сохранено")}</>}
            </div>
            )}
              </>
            )}
          </div>
        </div>

        {user&&onOpenContentPlanHub&&(
          <div className={shellUi?"sa-map-cp-strip":undefined} style={{padding:shellUi?undefined:"10px 16px",borderBottom:shellUi?undefined:"1px solid var(--border)",background:shellUi?undefined:"var(--surface2)"}}>
            <div className={shellUi?"cp-strip-label":undefined} style={{fontSize:10.5,fontWeight:800,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.08,textAlign:"center",marginBottom:shellUi?0:8}}>{t("cp_map_strip_label","Контент-план и разделы")}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:shellUi?14:12,flexWrap:"wrap"}}>
              <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={isMobile}/>
              {onOpenContentPlanProject&&project?.id&&(
                <button type="button" className={shellUi?"btn-g":"btn-interactive"} onClick={()=>onOpenContentPlanProject()} title={t("cp_from_map_hint","Открыть контент-план этого проекта в полноэкранном режиме")}
                  style={shellUi?{height:32,fontSize:11.5,padding:"0 14px",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:6,color:"var(--acc)"}:{padding:"8px 16px",borderRadius:10,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--accent-soft)",color:"var(--accent-1)",cursor:"pointer",fontSize:13,fontWeight:800,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:8}}>
                  <span aria-hidden>✍️</span>{t("cp_from_map_btn","Контент-план проекта")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ROW 2 — view tools + panels + export (в shell вторая строка — экспорт, без вылезания за экран) */}
        <div style={{minHeight:shellUi?56:52,display:"flex",alignItems:"center",gap:isMobile?6:shellUi?12:10,padding:isMobile?"10px 16px":shellUi?"10px 20px":"0 24px",flexWrap:isMobile?"wrap":shellUi?"wrap":"nowrap",width:"100%",minWidth:0,boxSizing:"border-box"}}>

          {/* View tools */}
          <div style={{display:"flex",alignItems:"center",gap:isMobile?4:shellUi?8:6,flexShrink:0}}>
            {!isMobile&&<span style={{fontSize:shellUi?13:12,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginRight:2}}>Вид</span>}
            {tb(false,fitView,<>{isMobile?"⊡":<>⊡ {t("fit_view","Вписать")}</>}</>,t("fit_view_hint","Вписать карту в экран"))}
            {selNode&&tb(false,()=>scrollToNode(selNode),<>{isMobile?"◎":<>◎ {t("center_on","К узлу")}</>}</>,t("center_on_hint","Центрировать на выбранном шаге"))}
            {!readOnly&&tb(false,autoLayout,<>{isMobile?"⌥":t("auto_layout","⌥ Расклад")}</>,t("auto_layout_hint","Автоматическая раскладка по связям"))}
            {!readOnly&&tb(false,autoConnect,<>{isMobile?"🔗":t("ai_links","🔗 AI-связи")}</>,t("ai_links_hint","AI предложит связи между шагами"))}
          </div>

          {sep}

          {/* Canvas bg */}
          <div style={{display:"flex",alignItems:"center",gap:shellUi?6:2,flexShrink:0}}>
            {!isMobile&&<span style={{fontSize:shellUi?13:12,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginRight:2}}>{t("bg_label","Фон")}</span>}
            {[["grid","⊞","Точки"],["stars","✦","Звёзды"],["none","○","Чисто"]].map(([m,icon,label])=>(
              <button key={m} onClick={()=>setBgMode(m)} title={`Фон: ${label}`}
                style={{height:30,padding:"0 10px",borderRadius:8,border:"none",background:bgMode===m?"rgba(104,54,245,.15)":"transparent",color:bgMode===m?"#a5b4fc":"var(--text4)",cursor:"pointer",fontSize:14,fontWeight:600,flexShrink:0,transition:"all .2s"}}>
                {icon}
              </button>
            ))}
          </div>

          {sep}

          {/* Panels */}
          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
            {ib(showAI,t("ai_consultant_hint","AI-консультант (Ctrl+Shift+A)"),()=>setShowAI((a:boolean)=>!a),<>✦ AI</>,{width:"auto",padding:"0 10px",fontSize:13,fontWeight:600,color:showAI?"#b4a3ff":"#c4b5ff",borderColor:showAI?"rgba(104,54,245,.5)":"rgba(104,54,245,.28)",background:showAI?"rgba(104,54,245,.14)":"rgba(104,54,245,.07)"})}
            {ib(showMini,t("minimap_hint","Миникарта"),()=>setShowMini((m:boolean)=>!m),<>🗺</>)}
            {ib(false,t("stats_title","Статистика"),()=>setShowStats(true),<>📊</>)}
            {ib(false,t("weekly_briefing","Еженедельный брифинг"),()=>setShowBriefing(true),<>📋</>)}
            {ib(showTour,t("map_tour","Тур по карте"),()=>setShowTour(true),<>🎯</>)}
            {ib(false,t("shortcuts_title","Горячие клавиши")+" (?)",()=>setShowShortcuts(true),<>⌨️</>)}
            {!readOnly&&ib(showDeadlines,t("deadline_reminder","Напоминания о дедлайнах"),()=>setShowDeadlines((d:boolean)=>!d),<>⏰</>,{borderColor:showDeadlines?"rgba(245,158,11,.5)":"",background:showDeadlines?"rgba(245,158,11,.08)":"",color:showDeadlines?"#f09428":""})}
          </div>

          {sep}

          {/* Panels: Simulation, Templates, Gantt */}
          <div style={{display:"flex",alignItems:"center",gap:shellUi?6:3,flexShrink:0}}>
            {!readOnly&&<button onClick={()=>setShowSim(true)} title={t("simulation_hint","Симуляция выполнения стратегии")}
              style={{height:shellUi?30:26,padding:shellUi?"0 12px":"0 10px",borderRadius:8,border:shellUi?"1px solid rgba(104,54,245,.35)":"1px solid rgba(14,165,233,.3)",background:shellUi?"rgba(104,54,245,.1)":"rgba(14,165,233,.07)",color:shellUi?"#c4b5fd":"#38bdf8",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              ⎇ Симуляция
            </button>}
            {!readOnly&&(TIERS[user?.tier||"free"]?.templates)&&(
              <button onClick={()=>setShowTemplates(true)} title={t("templates_hint","Шаблоны карт")}
                style={{height:shellUi?30:26,padding:shellUi?"0 12px":"0 10px",borderRadius:8,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                📋 Шаблоны
              </button>
            )}
            <button onClick={()=>setShowGantt(g=>!g)} title={t("gantt_title","Диаграмма Ганта")}
              style={{height:shellUi?30:26,padding:shellUi?"0 12px":"0 10px",borderRadius:8,border:`1px solid ${showGantt?"rgba(16,185,129,.5)":"rgba(16,185,129,.2)"}`,background:showGantt?"rgba(16,185,129,.14)":"rgba(16,185,129,.06)",color:"#34d399",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              📅 Gantt
            </button>
          </div>

          {sep}

          {/* Export/Import */}
          <div style={{display:"flex",alignItems:"center",gap:shellUi?8:8,flexShrink:shellUi?undefined:0,flexWrap:"wrap",minWidth:0,maxWidth:"100%",...(shellUi?{flexBasis:"100%",width:"100%",paddingTop:8,marginTop:4,borderTop:"1px solid var(--b1)"}:{})}}>
            <span style={{fontSize:shellUi?13:12,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginRight:4,flexShrink:0}}>{t("export_label","Экспорт")}</span>
            <button className="sa-tbar-btn" onClick={exportPNG} disabled={exporting} title={t("export_png_title","Скачать PNG")}
              style={{height:shellUi?36:32,padding:shellUi?"0 14px":"0 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0}}>
              {exporting?"…":"⬇ PNG"}
            </button>
            <button className="sa-tbar-btn" onClick={exportJSON} title={t("export_json_title","Скачать JSON")}
              style={{height:shellUi?36:32,padding:shellUi?"0 14px":"0 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0}}>
              ⬇ JSON
            </button>
            <button className="sa-tbar-btn" onClick={exportPDF} title={t("export_pdf_hint","PDF через печать браузера (Ctrl+P → Сохранить как PDF)")}
              style={{height:shellUi?36:32,padding:shellUi?"0 14px":"0 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0}}>
              ⬇ PDF
            </button>
            <button className="sa-tbar-btn--danger" onClick={exportPPTX} title={t("export_pptx","Скачать PPTX")}
              style={{height:shellUi?36:32,padding:shellUi?"0 14px":"0 12px",borderRadius:10,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.06)",color:"#f87171",cursor:"pointer",fontSize:shellUi?14:13,fontWeight:600,flexShrink:0}}>
              ⬇ PPTX
            </button>
            {/* Версии */}
            {API_BASE&&mapData?.id&&(
              <>
                {!readOnly&&<button className="sa-tbar-btn--accent" onClick={saveVersion} title={t("save_version_btn","Сохранить версию")}
                  style={{height:32,padding:"0 12px",borderRadius:10,border:"1px solid rgba(104,54,245,.3)",background:"rgba(104,54,245,.08)",color:"#b4a3ff",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>📸 {t("save_version_short","Версия")}</button>}
                <button className="sa-tbar-btn--accent" onClick={()=>setShowVersions(true)} title={t("version_history","История версий")}
                  style={{height:32,padding:"0 12px",borderRadius:10,border:"1px solid rgba(104,54,245,.3)",background:"rgba(104,54,245,.08)",color:"#b4a3ff",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
                  📜 {!isMobile&&t("version_history_short","История")}
                </button>
              </>
            )}
            {/* Онлайн-пользователи */}
            {onlineUsers.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"0 8px",height:26,borderRadius:6,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)"}}>
                {onlineUsers.slice(0,3).map(u=>(
                  <div key={u.email} title={u.name||u.email} style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#12c482,#34d399)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid var(--surface)"}}>
                    {(u.name||u.email||"?")[0].toUpperCase()}
                  </div>
                ))}
                <span style={{fontSize:11,color:"#34d399",fontWeight:600}}>{onlineUsers.length}</span>
              </div>
            )}
            {!readOnly&&<><button onClick={importJSON} title="Загрузить JSON"
              style={{height:32,padding:"0 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.background="var(--surface)";}} onMouseOut={e=>{e.currentTarget.style.background="transparent";}}>
              ⬆ JSON
            </button>
            <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={handleImportFile}/>
            <button onClick={shareMap} title={t("share_map","Поделиться картой")}
              style={{height:32,padding:"0 14px",borderRadius:10,border:"1px solid rgba(16,185,129,.35)",background:"rgba(16,185,129,.08)",color:"#34d399",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.background="rgba(16,185,129,.14)";}} onMouseOut={e=>{e.currentTarget.style.background="rgba(16,185,129,.08)";}}>
              🔗 {t("share_btn","Поделиться")}
            </button>
            </>}
          </div>

        </div>
      </div>
      {/* canvas — в оболочке макета: .sa-screen-map + .sa-canvas-wrap (точки через :: при grid) */}
      <div className="sa-screen-map screen on" style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <div
        className={"sa-canvas-wrap"+(bgMode!=="grid"?" sa-canvas-no-dots":"")}
        style={{
          flex:1,
          position:"relative",
          overflow:"hidden",
          ...(bgMode==="grid"?{}:{}),
          ...(bgMode==="stars"&&theme==="dark"?{background:"var(--map-canvas, #08061a)"}:{}),
          ...(bgMode==="none"?{background:"var(--bg)"}:{}),
        }}>
        {/* stars — только тёмная тема; SVG rect прозрачный иначе звёзды не видны */}
        {bgMode==="stars"&&theme==="dark"&&(
          <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
            <SparklesCanvas density={175} speed={0.35} minSz={0.3} maxSz={1.0} color="#ffffff" style={{opacity:.4}}/>
          </div>
        )}
        {showSearch&&(
          <div style={{position:"absolute",top:56,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,padding:"8px 10px",boxShadow:"0 8px 30px rgba(0,0,0,.4)",display:"flex",gap:8,alignItems:"center",minWidth:280,animation:"slideDown .15s ease"}}>
            <span style={{color:"var(--text4)",fontSize:13}}>🔍</span>
            <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Поиск по названию шага…"
              onKeyDown={e=>{if(e.key==="Escape"){setShowSearch(false);setSearchQ("");}}}
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:"var(--text)",fontSize:13,fontFamily:"inherit"}}/>
            {searchQ&&<span style={{fontSize:13,color:"var(--text4)",fontWeight:600}}>{nodes.filter(n=>n.title.toLowerCase().includes(searchQ.toLowerCase())).length} найдено</span>}
            <button onClick={()=>{setShowSearch(false);setSearchQ("");}} style={{width:20,height:20,borderRadius:5,border:"none",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        )}
        <svg ref={svgRef} width="100%" height="100%"
          onPointerDown={onSvgMouseDown} onPointerMove={onSvgMouseMove} onPointerUp={onSvgMouseUp} onPointerLeave={onSvgMouseUp}
          onWheel={onWheel} style={{cursor:panning.current?"grabbing":"grab",display:"block",touchAction:"none"}}
          onClick={e=>{const t=e.target as Element;if(t===svgRef.current||t?.tagName==="svg"||t?.getAttribute?.("data-canvas-bg")==="1"){setSelNode(null);setSelEdge(null);setCtxMenu(null);}}}
          onDoubleClick={e=>{const t=e.target as Element;if(!readOnly&&(t===svgRef.current||t?.tagName==="svg"||t?.getAttribute?.("data-canvas-bg")==="1")){e.preventDefault();addNodeAt(e.clientX,e.clientY);}}}
          onContextMenu={e=>{const t=e.target as Element;if(t===svgRef.current||t?.tagName==="svg"||t?.getAttribute?.("data-canvas-bg")==="1"){e.preventDefault();if(!readOnly)setCtxMenu({x:e.clientX,y:e.clientY});}}}>
          <defs>
            <clipPath id="nodeTitleClip"><rect x={14} y={2} width={178} height={16} rx={2}/></clipPath>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <linearGradient id="sa-edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-1)"/>
              <stop offset="100%" stopColor="var(--accent-2)"/>
            </linearGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x%40},${view.y%40})`}>
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--grid)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={bgMode==="grid"||(bgMode==="stars"&&theme==="dark")?"transparent":"var(--bg)"} data-canvas-bg="1"/>
          <g transform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
            {edges.filter(e=>!hiddenIds.has(e.source)&&!hiddenIds.has(e.target)).map(e=>(
              <EdgeLine key={e.id} edge={e} nodes={nodes} selected={selEdge?.id===e.id} etypeMap={ETYPE} onClick={ed=>{setSelEdge(ed);setSelNode(null);}}/>
            ))}
            {filteredNodes.map(n=>(
              <NodeCard key={n.id} node={n} selected={selNode?.id===n.id||selNodes.has(n.id)} focused={focusPulseId===n.id} connecting={connecting} connectSource={connectSrc} onClick={onNodeClick} onMouseDown={onNodeMouseDown} onContextMenu={(x,y,nd)=>{if(!readOnly)setCtxMenu({x,y,node:nd});}} theme={theme} statusMap={STATUS}/>
            ))}
          </g>
          {connecting&&(
            <text x={W/2} y={36} textAnchor="middle" fontSize={13} fill="var(--accent-2)" fontWeight={700} style={{pointerEvents:"none",fontFamily:"'Inter',system-ui,sans-serif"}}>
              {connectSrc?`Выберите цель для "${connectSrc.title?.slice(0,20)}"…`:"Нажмите на исходный узел…"}
            </text>
          )}
        </svg>
        {/* Empty state: no nodes at all */}
        {nodes.length===0&&!showOnboarding&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:5}}>
            <div style={{textAlign:"center",padding:32}}>
              <div style={{fontSize:56,marginBottom:16,opacity:.6}}>🗺️</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text2)",marginBottom:8}}>{t("map_empty_title","Карта пуста")}</div>
              <div style={{fontSize:14,color:"var(--text4)"}}>{t("map_empty_hint","Нажмите + Шаг, дважды кликните на фон или перетащите фон для перемещения.")}</div>
            </div>
          </div>
        )}
        {/* Empty state: filter/search returned no results */}
        {nodes.length>0&&filteredNodes.length===0&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:5}}>
            <div style={{textAlign:"center",padding:32,background:"var(--surface)",borderRadius:16,border:"1px solid var(--border)",boxShadow:"0 8px 32px rgba(0,0,0,.3)"}}>
              <div style={{fontSize:40,marginBottom:12}}>🔍</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text2)",marginBottom:6}}>{t("search_no_results","Ничего не найдено")}</div>
              <div style={{fontSize:13,color:"var(--text4)"}}>{t("search_no_results_hint","Сбросьте поиск или фильтр статусов.")}</div>
            </div>
          </div>
        )}
        {/* edge label editor */}
        {selEdge&&!selNode&&!readOnly&&(
          <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--glass-border-accent,var(--border))",borderRadius:12,boxShadow:"var(--shadow,0 16px 40px rgba(0,0,0,.7))",zIndex:40,animation:"slideUp .2s ease"}}>
            <span style={{fontSize:13,color:"var(--text4)",fontWeight:600}}>{t("edge_type","Тип связи:")}</span>
            <CustomSelect
              value={selEdge.type||"requires"}
              onChange={v=>{const ne={...selEdge,type:v};pushUndo(nodes,edges);setEdgesUser(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}}
              options={Object.entries(ETYPE).map(([k,e])=>({value:k,label:e.label,dot:e.c}))}
            />
            <input value={selEdge.label||""} onChange={e=>{const ne={...selEdge,label:e.target.value};setEdgesUser(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}} placeholder="Подпись…" style={{fontSize:13,padding:"5px 10px",background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit",width:120}}/>
            <button onClick={()=>{pushUndo(nodes,edges);setEdgesUser(es=>es.filter(x=>x.id!==selEdge.id));setSelEdge(null);}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#f04458",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑 Удалить</button>
          </div>
        )}
        {ctxMenu&&(
          <div className="modal-scale" style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,zIndex:400,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:18,boxShadow:"0 20px 56px rgba(0,0,0,.35)",padding:"12px 0",minWidth:240,backdropFilter:"blur(16px)"}}>
            {ctxMenu.node?(
              <>
                <div style={{padding:"12px 20px",fontSize:12,color:"var(--text4)",borderBottom:"1px solid var(--border)"}}>{ctxMenu.node.title?.slice(0,24)}{(ctxMenu.node.title||"").length>24?"…":""}</div>
                <button onClick={()=>{scrollToNode(ctxMenu.node);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--text2)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>↗ {t("center_on_node","Центрировать")}</button>
                {!readOnly&&<>
                  <button onClick={()=>{duplicateNode(ctxMenu.node);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--text2)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>📋 {t("duplicate","Дублировать")}</button>
                  <button onClick={()=>{setClipboard(ctxMenu.node);addToast(t("copied","📋 Скопировано"),"info");setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--text2)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>📄 {t("copy_short","Копировать")}</button>
                  <button onClick={()=>{startConnect(ctxMenu.node);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--text2)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>⇒ {t("link_btn","Связать")}</button>
                  <button onClick={()=>{const ids=selNodes.size>1?Array.from(selNodes):[ctxMenu.node.id];pushUndo(nodes,edges);setNodes(ns=>ns.filter(n=>!ids.includes(n.id)));setEdgesUser(es=>es.filter(e=>!ids.includes(e.source)&&!ids.includes(e.target)));setSelNodes(new Set());setSelNode(null);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"#f04458",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>🗑 {selNodes.size>1?t("delete_selected","Удалить выбранные")+` (${selNodes.size})`:t("delete","Удалить")}</button>
                </>}
              </>
            ):(
              !readOnly&&<button onClick={()=>{addNodeAt(ctxMenu.x,ctxMenu.y);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--text2)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>+ {t("add_step_here","Добавить шаг здесь")}</button>
            )}
          </div>
        )}
        {ctxMenu&&<div style={{position:"fixed",inset:0,zIndex:399}} onClick={()=>setCtxMenu(null)}/>}
        {showMini&&<MiniMap nodes={nodes} edges={edges} viewX={view.x} viewY={view.y} zoom={view.zoom} canvasW={W} canvasH={H} onJump={(x,y)=>{viewRef.current={...viewRef.current,x,y};setView(v=>({...v,x,y}));}} theme={theme} statusMap={STATUS}/>}
        {toasts.map(toast=><Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToasts(ts=>ts.filter(x=>x.id!==toast.id))}/>)}
        {selNode&&(
          <RichEditorPanel
            node={selNode}
            aiPanelOpen={showAI}
            isMobile={isMobile}
            ctx={mapData?.ctx||""}
            readOnly={readOnly}
            userName={user?.name||user?.email||"Пользователь"}
            allNodes={nodes}
            allEdges={edges}
            onUpdate={(patch)=>{
              const n={...selNode,...patch};
              const hEntry=(patch.title&&patch.title!==selNode.title)?{id:uid(),type:"edit",at:Date.now(),by:user?.name||user?.email||"user",before:{title:selNode.title},after:{title:patch.title}}:null;
              const fullNode={...n,history:hEntry?[...(selNode.history||[]),hEntry]:(selNode.history||[])};
              pushUndo(nodes,edges);
              updateNode(fullNode);
              setSelNode(fullNode);
              if(!readOnly)emitNodeUpdate(fullNode);
            }}
            onDelete={(id)=>{deleteNode(id);}}
            onClose={()=>setSelNode(null)}
            onScrollTo={scrollToNode}
            onConnect={(cfg)=>{
              if(cfg.startNode){startConnect(cfg.startNode);}
              else if(cfg.source&&cfg.target){
                const ne={id:uid(),source:cfg.source,target:cfg.target,type:cfg.type||"requires",label:""};
                pushUndo(nodes,edges);setEdgesUser(es=>[...es,ne]);
              }
            }}
            onError={(msg)=>addToast(msg,"error")}
            onNotify={(msg,type)=>addToast(msg,type||"info")}
            statusMap={STATUS}
            etypeMap={ETYPE}
          />
        )}
        {showAI&&<AiPanel isMobile={isMobile} nodes={nodes} edges={edges} ctx={mapData?.ctx||""} tier={user?.tier||"free"} projectName={project?.name||""} mapName={mapData?.name||""} userName={user?.name||user?.email||""} msgs={aiChatMsgsLocal} onMsgsChange={setAiChatMsgsLocal} onAddNode={(n)=>{const nn={...n,id:uid(),x:snap((-view.x/view.zoom)+W/view.zoom/2-120+Math.random()*80),y:snap((-view.y/view.zoom)+H/view.zoom/2-64+Math.random()*80),comments:[],history:[]};pushUndo(nodes,edges);setNodes(ns=>[...ns,nn]);if(!readOnly)socketRef.current?.emit("node-add",{mapId:mapData?.id,node:nn});}} onClose={()=>setShowAI(false)} externalMsgs={pendingAiMsgs} onClearExternal={()=>setPendingAiMsgs([])} onError={(msg)=>addToast(msg,"error")} statusMap={STATUS}/>}
        {showStats&&<StatsPopup nodes={nodes} edges={edges} onClose={()=>setShowStats(false)} statusMap={STATUS}/>}
        {showTemplates&&<TemplateModal tier={user?.tier} onSelect={(tmpl:any)=>{setShowTemplates(false);if(tmpl){pushUndo(nodes,edges);setNodes(tmpl.nodes.map((n:any)=>({...n,comments:[],history:[]})));setEdges(tmpl.edges);emitEdgeUpdate(tmpl.edges);setTimeout(fitView,100);setPendingAiMsgs([{role:"ai",text:t("ai_customize_template_offer","Я применил шаблон. Хотите подстроить его под ваш бизнес? Напишите, чем вы занимаетесь и какая цель — я адаптирую шаги под вас.")}]);setShowAI(true);}}} onClose={()=>setShowTemplates(false)} theme={theme}/>}
        {showGantt&&<GanttView nodes={nodes} onClose={()=>setShowGantt(false)} statusMap={STATUS} onRowClick={(n:any)=>{setSelNode(n);setShowGantt(false);}}/>}
        {showTour&&<MapTour onDone={()=>setShowTour(false)}/>}
        {showSim&&<SimulationModal mapData={{...mapData,nodes,edges}} allProjectMaps={allMaps} onClose={()=>setShowSim(false)} theme={theme} statusMap={STATUS}/>}
        {showOnboarding&&<InMapOnboarding project={project} tier={user?.tier} theme={theme} onDone={(mapObj:any)=>{setShowOnboarding(false);const es=mapObj.edges||[];setNodes(mapObj.nodes||[]);setEdges(es);emitEdgeUpdate(es);setTimeout(fitView,200);}} onSkip={()=>{setShowOnboarding(false);setNodes(defaultNodes());}}/>}
        {showBriefing&&(
          <WeeklyBriefingModal nodes={nodes} mapName={mapData?.name||"Карта"} user={user} onClose={()=>setShowBriefing(false)} theme={theme} onError={(msg)=>addToast(msg,"error")}/>
        )}
        {showVersions&&mapData?.id&&(
          <VersionHistoryModal
            mapId={mapData.id} projectId={project?.id||""} theme={theme} isMobile={isMobile}
            onRestore={(v:any)=>{pushUndo(nodes,edges);const es=v.edges||[];setNodes(v.nodes||[]);setEdges(es);emitEdgeUpdate(es);addToast(t("version_restored","Версия восстановлена"),"success");}}
            onError={(msg)=>addToast(msg,"error")}
            onClose={()=>setShowVersions(false)}
          />
        )}
        {/* Напоминания о дедлайнах */}
        {showDeadlines&&!readOnly&&(
          <DeadlineReminders nodes={nodes} onDismiss={()=>setShowDeadlines(false)} onGoToNode={(id:string)=>{
            const n=nodes.find((x:any)=>x.id===id);
            if(n){setView({x:-n.x+W/2,y:-n.y+H/2,zoom:1});viewRef.current={x:-n.x+W/2,y:-n.y+H/2,zoom:1};setSelNode(n);}
          }}/>
        )}
        {/* Удалённые курсоры (WebSocket presence) */}
        {Object.values(remoteCursors).map((c:any)=>(
          <div key={c.email} style={{position:"fixed",left:c.x,top:c.y,pointerEvents:"none",zIndex:500,transform:"translate(-50%,-50%)"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"var(--accent-1)",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}/>
            <div style={{position:"absolute",top:12,left:12,background:"var(--accent-1)",color:"var(--accent-on-bg,#fff)",padding:"2px 6px",borderRadius:5,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{c.name||c.email}</div>
          </div>
        ))}
        {showShortcuts&&(
          <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.6))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={()=>setShowShortcuts(false)}>
            <div className="glass-panel glass-panel-lg" style={{borderRadius:isMobile?"18px 18px 0 0":24,padding:"32px 36px",maxWidth:440,width:isMobile?"100%":"90%",maxHeight:isMobile?"78vh":"none",overflowY:isMobile?"auto":"visible",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:16}}>⌨️ Горячие клавиши</div>
              <p style={{fontSize:12,color:"var(--text4)",marginBottom:12}}>💡 {t("shortcuts_copy_hint","Выделите узел, Ctrl+C — копировать, Ctrl+V — вставить. Комбинации можно копировать из этой подсказки.")}</p>
              {[["Ctrl+Z / Ctrl+Y","Отменить / Повторить"],["Ctrl+Shift+A","Открыть AI-советник"],["Ctrl+F","Поиск шагов"],["Ctrl+A","Выбрать все узлы"],["Ctrl+C","Копировать шаг"],["Ctrl+V","Вставить шаг"],["Delete / Backspace","Удалить выбранное"],["Shift+клик","Мультивыбор узлов"],["Двойной клик на фон","Добавить шаг в точке"],["ПКМ на узле/фоне","Контекстное меню"],["Escape","Снять выбор / закрыть меню"],["← → ↑ ↓","Двигать шаг (Shift=×4)"],["Перетащить фон","Панорамировать"],["Scroll","Масштаб"],["?","Эта подсказка"]].map(row=>(
                <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                  <code style={{fontSize:13,background:"var(--surface)",padding:"2px 7px",borderRadius:5,color:"var(--accent-1)",fontFamily:"'JetBrains Mono',monospace"}}>{row[0]}</code>
                  <span style={{fontSize:13,color:"var(--text3)"}}>{row[1]}</span>
                </div>
              ))}
              <button onClick={()=>setShowShortcuts(false)} style={{marginTop:16,width:"100%",padding:"10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("close","Закрыть")}</button>
            </div>
          </div>
        )}

        {showNotifs&&(
          <NotificationsCenterModal
            open={showNotifs}
            onClose={()=>setShowNotifs(false)}
            isMobile={isMobile}
            zIndex={260}
            notifs={notifs}
            setNotifs={setNotifs}
            notifUnread={notifUnread}
            setNotifUnread={setNotifUnread}
            notifLoading={notifLoading}
            lang={lang}
            t={t}
            loadNotifications={loadNotifications}
            showItemMeta={false}
            deleteGlyph="×"
            onFollowLink={async(n:any)=>{if(n.link)window.location.href=n.link;}}
          />
        )}
        <div className={"zoom-ctrl"+(shellUi?" map-toolbar":"")+" glass-card"} style={{position:"absolute",bottom:shellUi?20:28,left:shellUi?"50%":28,transform:shellUi?"translateX(-50%)":undefined,display:"flex",gap:8,alignItems:"center",zIndex:30,padding:"10px 16px",borderRadius:16,border:shellUi?"none":undefined,boxShadow:shellUi?undefined:"var(--glass-shadow-accent,none),0 8px 32px rgba(0,0,0,.2)"}}>
          <button className="zoom-ctrl-btn" onClick={()=>{const nz=Math.min(3,view.zoom*1.2);viewRef.current={...viewRef.current,zoom:nz};setView(v=>({...v,zoom:nz}));}} title={t("zoom_in","Увеличить")} style={{width:36,height:36,borderRadius:10,border:"none",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          <div style={{fontSize:14,color:"var(--text3)",fontWeight:700,minWidth:48,textAlign:"center"}}>{Math.round(view.zoom*100)}%</div>
          <button className="zoom-ctrl-btn" onClick={()=>{const nz=Math.max(.2,view.zoom*.83);viewRef.current={...viewRef.current,zoom:nz};setView(v=>({...v,zoom:nz}));}} title={t("zoom_out","Уменьшить")} style={{width:36,height:36,borderRadius:10,border:"none",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
          {shellUi&&(
            <>
              <div className="mt-sep" aria-hidden/>
              <button type="button" className={"mt-btn"+(showAI?" on":"")} onClick={()=>setShowAI(a=>!a)} title={t("ai_consultant_hint","AI-консультант (Ctrl+Shift+A)")} aria-label={t("ai_consultant_hint","AI-консультант")} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"0 8px",minWidth:"auto"}}><span aria-hidden>✦</span><span style={{fontSize:10.5,fontWeight:700}}>AI</span></button>
              <button type="button" className="mt-btn" onClick={fitView} title={t("fit_view_hint","Вписать карту в экран")}>⊡</button>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
  return shellUi?(
    <div className={"sa-strategy-ui sa-v-app "+(theme==="dark"?"dk":"lt")} data-theme={theme} data-palette={palette} style={{width:"100%",height:"100%",minHeight:"100vh",maxHeight:"100vh",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <StrategyShellBg/>
      <div className="sa-app" style={{flex:1,minHeight:0,minWidth:0,display:"flex",overflow:"hidden",position:"relative",zIndex:1}}>
        <StrategyShellSidebar
          theme={theme}
          onToggleTheme={onToggleTheme}
          activeNav="map"
          onNavigate={handleShellNav}
          tierLabel={tier.label}
          tierColor={tier.color}
          onTierClick={onProfile}
          lang={lang}
          onLang={code=>setLang(code)}
          userName={user?.name||""}
          userEmail={user?.email||""}
          scenarioCount={0}
          onUserCard={onProfile}
          showContentPlan={!!onOpenContentPlanHub}
          onContentPlan={onOpenContentPlanHub||undefined}
          showTrialBanner={(user?.tier||"free")==="free"}
          onLogoClick={() => onShellGlobalNav?.("projects")}
          t={t}
        />
        <div className="sa-main" style={{flex:1,minWidth:0,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>{_mapMain}</div>
        <FloatingAiAssistant t={t} variant="app" onOpenFullChat={() => setShowAI(true)} />
      </div>
    </div>
  ):(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} data-palette={palette} style={{width:"100%",maxWidth:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",position:"relative",overflow:"hidden",boxSizing:"border-box"}}>
      <StrategyShellBg/>
      <div style={{flex:1,minHeight:0,position:"relative",zIndex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>{_mapMain}</div>
      <FloatingAiAssistant t={t} variant="app" onOpenFullChat={() => setShowAI(true)} />
    </div>
  );
}

// ── Главная навигация: Стратегия ↔ Контент-план (отдельная услуга) ──
function MainWorkspaceNav({mode,onStrategy,onContentPlan,t,isMobile}:{mode:"strategy"|"contentPlan";onStrategy:()=>void;onContentPlan:()=>void;t:(k:string,fb?:string)=>string;isMobile:boolean}){
  // gradient-pill слайдер — как в AuthFormContent
  const isStrategy=mode==="strategy";
  const fz=isMobile?12:12.5;
  const pad=isMobile?"6px 14px":"7px 18px";
  const tabs:Array<{key:"strategy"|"contentPlan";label:string;tip:string;onClick:()=>void}>=[
    {key:"strategy",label:t("nav_workspace_strategy","Стратегия"),tip:t("nav_workspace_strategy_tip","Карты проектов, шаги, Gantt"),onClick:onStrategy},
    {key:"contentPlan",label:t("nav_workspace_content","Контент-план"),tip:t("nav_workspace_content_tip","Публикации и календарь по проектам"),onClick:onContentPlan},
  ];
  return(
    <div role="tablist" aria-label={t("workspace_nav_aria","Разделы приложения")}
      style={{position:"relative",display:"inline-grid",gridTemplateColumns:"1fr 1fr",background:"var(--inp)",border:".5px solid var(--b1)",borderRadius:12,padding:3,gap:0}}>
      <span aria-hidden="true" style={{position:"absolute",top:3,bottom:3,left:isStrategy?3:"calc(50% + 0px)",width:"calc(50% - 3px)",borderRadius:9,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",boxShadow:"0 6px 18px rgba(104,54,245,.3),inset 0 1px 0 rgba(255,255,255,.18)",transition:"left .28s cubic-bezier(.34,1.56,.64,1)"}}/>
      {tabs.map(tb=>{
        const on=mode===tb.key;
        return(
          <button key={tb.key} type="button" role="tab" aria-selected={on} aria-disabled={on} title={on?undefined:tb.tip} onClick={on?undefined:tb.onClick}
            style={{position:"relative",zIndex:1,border:"none",background:"transparent",padding:pad,borderRadius:9,cursor:on?"default":"pointer",fontFamily:"inherit",fontSize:fz,fontWeight:on?700:600,letterSpacing:"-0.01em",color:on?"#fff":"var(--t2)",transition:"color .22s ease",textShadow:on?"0 1px 0 rgba(0,0,0,.18)":"none",whiteSpace:"nowrap"}}>
            {tb.label}
          </button>
        );
      })}
    </div>
  );
}

function formatNotifTimestamp(createdAt:any,lang:string){
  if(!createdAt)return"—";
  try{return new Date(createdAt).toLocaleString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}
  catch{return"—";}
}

/** Единая модалка списка уведомлений (хаб контент-плана, проекты, карта, список проектов). */
function NotificationsCenterModal({open,onClose,isMobile,zIndex=220,notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,lang,t,loadNotifications,showItemMeta=true,deleteGlyph="🗑",onFollowLink}:{open:boolean;onClose:()=>void;isMobile:boolean;zIndex?:number;notifs:any[];setNotifs:(fn:any)=>void;notifUnread:number;setNotifUnread:(fn:any)=>void;notifLoading:boolean;lang:string;t:(k:string,fb?:string)=>string;loadNotifications:()=>Promise<void>;showItemMeta?:boolean;deleteGlyph?:string;onFollowLink:(n:any)=>void|Promise<void>}){
  if(!open)return null;
  async function markReadIfNeeded(n:any){
    if(n.is_read)return;
    await readNotification(n.id);
    setNotifs((xs:any[])=>xs.map((x:any)=>x.id===n.id?{...x,is_read:true}:x));
    setNotifUnread((u:number)=>Math.max(0,u-1));
  }
  return(
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="glass-panel glass-panel-lg" role="dialog" aria-modal="true" aria-label={t("notif_center","Уведомления")} style={{width:isMobile?"100%":"min(92vw,560px)",maxHeight:isMobile?"78vh":"80vh",borderRadius:isMobile?"18px 18px 0 0":22,overflow:"hidden",display:"flex",flexDirection:"column",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:10,background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--text4)",fontWeight:900}} aria-hidden>N</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:900,color:"var(--text)"}}>{t("notif_center","Уведомления")}</div>
            <div style={{fontSize:12.5,color:"var(--text5)"}}>{notifUnread>0?t("notif_unread_n","Непрочитанных: {n}").replace("{n}",String(notifUnread)):t("notif_all_read","Все прочитано")}</div>
          </div>
          <button type="button" className="btn-interactive" onClick={async()=>{await readAllNotifications();await loadNotifications();}} style={{padding:"7px 10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:800}}>
            {t("notif_read_all","Прочитать все")}
          </button>
          <button type="button" onClick={onClose} aria-label={t("close","Закрыть")} style={{width:30,height:30,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"10px 12px",overflow:"auto"}}>
          {notifLoading&&notifs.length===0?(
            <div style={{padding:"18px 10px",color:"var(--text5)",fontSize:13}}>{t("loading_short","Загрузка…")}</div>
          ):notifs.length===0?(
            <div style={{padding:"22px 10px",color:"var(--text5)",fontSize:13,textAlign:"center"}}>{t("notif_empty","Пока нет уведомлений")}</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {notifs.map((n:any)=>(
                <div key={n.id} className="glass-card" style={{padding:"12px 14px",borderRadius:14,border:`1px solid ${n.is_read?"var(--border)":"var(--glass-border-accent,var(--border))"}`,background:"var(--surface)"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",marginTop:6,background:n.is_read?"var(--border2)":"var(--accent-1)",boxShadow:n.is_read?"none":"0 0 0 3px var(--accent-soft)"}} aria-hidden/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:900,color:"var(--text)",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title||t("notification","Уведомление")}</div>
                      {n.body&&<div style={{fontSize:12.8,color:"var(--text4)",lineHeight:1.45,whiteSpace:"pre-wrap"}}>{n.body}</div>}
                      {showItemMeta&&(
                        <div style={{fontSize:12,color:"var(--text6)",marginTop:8,display:"flex",gap:10,flexWrap:"wrap"}}>
                          <span>{formatNotifTimestamp(n.created_at,lang)}</span>
                          {n.type&&<span>· {String(n.type)}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                      {!n.is_read&&(
                        <button type="button" className="btn-interactive" aria-label={t("notif_mark_read","Прочитано")} onClick={()=>markReadIfNeeded(n)} style={{padding:"6px 10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:800}}>✓</button>
                      )}
                      <button type="button" className="btn-interactive" aria-label={t("notif_delete","Удалить уведомление")} onClick={async()=>{await deleteNotification(n.id);setNotifs((xs:any[])=>xs.filter((x:any)=>x.id!==n.id));if(!n.is_read)setNotifUnread((u:number)=>Math.max(0,u-1));}} style={{padding:"6px 10px",borderRadius:10,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:12,fontWeight:900}}>
                        {deleteGlyph}
                      </button>
                      {n.link&&(
                        <button type="button" className="btn-interactive" aria-label={t("notif_open_link","Открыть ссылку")} onClick={async()=>{await markReadIfNeeded(n);await Promise.resolve(onFollowLink(n));}} style={{padding:"6px 10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:900}}>↗</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AiHubModal({open,onClose,isMobile,zIndex=230,t,hint,children}:{open:boolean;onClose:()=>void;isMobile:boolean;zIndex?:number;t:(k:string,fb?:string)=>string;hint:string;children:React.ReactNode}){
  if(!open)return null;
  return(
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="glass-panel glass-panel-lg" role="dialog" aria-modal="true" aria-label={t("ai_hub_title","✦ AI (единый чат)")} style={{width:isMobile?"100%":"min(92vw,720px)",maxHeight:isMobile?"86vh":"86vh",borderRadius:isMobile?"18px 18px 0 0":22,overflow:"hidden",display:"flex",flexDirection:"column",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10,background:"var(--surface)"}}>
          <div style={{width:30,height:30,borderRadius:10,background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text3)",fontWeight:900}} aria-hidden>✦</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:900,color:"var(--text)"}}>{t("ai_hub_title","✦ AI (единый чат)")}</div>
            <div style={{fontSize:12.5,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={hint}>{hint}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close","Закрыть")} style={{width:30,height:30,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:12}}>{children}</div>
      </div>
    </div>
  );
}

// ── Хаб контент-плана: те же проекты, что и в стратегии ──
function ContentPlanHubPage({user,theme,onBackToStrategy,onOpenProject,onLogout,onUpgrade,onProfile,onToggleTheme,aiChatMsgs,aiChatSetMsgs,onSelectProject,onOpenMap}){
  const{t,lang}=useLang();
  const isMobile=useIsMobile();
  const[projects,setProjects]=useState<any[]>([]);
  const[mapsByProj,setMapsByProj]=useState<Record<string,any[]>>({});
  const[loading,setLoading]=useState(true);
  const[showAIHub,setShowAIHub]=useState(false);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  const tier=TIERS[user?.tier||"free"]||TIERS.free;

  useEffect(()=>{(async()=>{setLoading(true);try{const ps=await getProjects(user.email);setProjects(ps);const mm:Record<string,any[]>={};for(const p of ps){mm[p.id]=await getMaps(p.id);}setMapsByProj(mm);}catch{setProjects([]);setMapsByProj({});}finally{setLoading(false);}})();},[user?.email]);
  useEffect(()=>{document.title=t("cp_doc_hub_title","Strategy AI — Контент-план");},[t]);

  const allMapsForAI=Object.values(mapsByProj).flatMap((arr:any)=>Array.isArray(arr)?arr:[]);
  const aiNodes=allMapsForAI.flatMap((m:any)=>m.nodes||[]).slice(0,220);
  const aiEdges=allMapsForAI.flatMap((m:any)=>m.edges||[]).slice(0,260);
  const aiCtx=`Портфель (контент-план): ${(projects||[]).slice(0,20).map((p:any)=>`«${p.name||"Проект"}»`).join(", ")}. Проектов: ${(projects||[]).length}, карт загружено: ${allMapsForAI.length}.`;

  return(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      <StrategyShellBg/>
      <div style={{flex:1,minHeight:0,minWidth:0,display:"flex",flexDirection:"column",position:"relative",zIndex:1,overflow:"hidden"}}>
      <div className="sa-app-topbar">
        <div className="atb-cluster" style={{minWidth:0}}>
          <div className="land-logo" style={{gap:10}}>
            <div className="land-gem" style={{width:32,height:32,borderRadius:10,fontSize:12}}>SA</div>
            <span className="land-brand" style={{fontSize:15}}>Strategy AI</span>
          </div>
        </div>
        {!isMobile&&(
          <div style={{flex:1,display:"flex",justifyContent:"center",minWidth:0}}>
            <MainWorkspaceNav mode="contentPlan" onStrategy={onBackToStrategy} onContentPlan={()=>{}} t={t} isMobile={false}/>
          </div>
        )}
        <div className="atb-cluster" style={{marginLeft:isMobile?0:"auto"}}>
          <div className="tpill" onClick={onToggleTheme} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onToggleTheme();}} aria-label={t("toggle_theme_tip","Сменить тему оформления")}>
            <div className={`tpi${theme==="dark"?" on":""}`}>☽</div>
            <div className={`tpi${theme==="light"?" on":""}`}>☀</div>
          </div>
          <button type="button" className="btn-g" onClick={()=>setShowAIHub(true)} title={t("ai_hub_title","✦ AI (единый чат)")} style={{height:32,fontSize:11.5,padding:"0 12px",display:"inline-flex",alignItems:"center",gap:6}}>
            <span aria-hidden>✦</span>{!isMobile&&t("ai_hub_btn_short","AI-чат")}
          </button>
          {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
          <button type="button" className="btn-g" onClick={onProfile} style={{height:32,padding:"0 12px",gap:8,display:"inline-flex",alignItems:"center",maxWidth:isMobile?44:220}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,var(--acc),var(--acc2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.name||user.email||"?")[0].toUpperCase()}</span>
            {!isMobile&&<><span style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name||user.email?.split("@")[0]||"?"}</span><span style={{fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase"}}>{tier.label}</span></>}
          </button>
          <button type="button" className="btn-g" onClick={onLogout} style={{height:32,fontSize:11.5,color:"var(--red)"}}>{t("logout","Выйти")}</button>
        </div>
      </div>
      {isMobile&&(
        <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",background:"var(--bg2)",display:"flex",justifyContent:"center"}}>
          <MainWorkspaceNav mode="contentPlan" onStrategy={onBackToStrategy} onContentPlan={()=>{}} t={t} isMobile={true}/>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",padding:isMobile?16:28,position:"relative",zIndex:5}}>
        <div style={{maxWidth:"min(1240px,100%)",width:"100%",margin:"0 auto"}}>
          <GlowCard panelVariant glowColor="accent" customSize width="100%" className="sa-ref-panel sa-ref-panel--lift sa-page-reveal sa-pr-d1" style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <span className="sa-cp-hub-hero-ic" style={{width:44,height:44,borderRadius:14,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 4px 20px var(--accent-glow)"}}>✍️</span>
              <div style={{flex:1,minWidth:0}}>
                <h1 style={{fontSize:isMobile?20:26,fontWeight:900,color:"var(--text)",letterSpacing:-.6,margin:0}}>{t("cp_hub_title","Контент-план")}</h1>
                <div style={{fontSize:13.5,color:"var(--text4)",marginTop:4,maxWidth:"min(720px,100%)"}}>{t("cp_hub_subtitle","Отдельный рабочий режим: публикации и календарь по проектам из вашей стратегии. Шаги карт подтягиваются для привязки идей.")}</div>
                <div style={{fontSize:12,color:"var(--text4)",marginTop:10,maxWidth:640,lineHeight:1.45}}>{t("cp_hub_nav_hint","Подсказка: переключатель «Стратегия» в шапке ведёт к списку проектов; оттуда же открываются карты и шаги.")}</div>
              </div>
            </div>
            {!tier.contentPlan&&(
              <div style={{marginTop:14,padding:"12px 16px",borderRadius:12,border:"1px dashed var(--border2)",background:"var(--surface)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("cp_hub_locked","Тариф Pro и выше")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:10}}>{t("cp_hub_locked_hint","Контент-план как услуга доступен с Pro — AI и вы наполняете ленту в связке со стратегическими шагами.")}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
                  {onUpgrade&&<button type="button" className="btn-interactive" onClick={onUpgrade} style={{padding:"9px 18px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 14px var(--accent-glow)"}}>{t("upgrade_to_pro","Перейти на Pro")}</button>}
                  <button type="button" className="btn-interactive" onClick={onBackToStrategy} style={{padding:"9px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("cp_preview_strategy","Посмотреть стратегию")}</button>
                </div>
              </div>
            )}
          </GlowCard>
          {loading?(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {[1,2,3].map(i=><div key={i} style={{height:130,borderRadius:16,background:"var(--surface)",animation:"pulse 1.5s ease infinite",border:"1px solid var(--border)"}}/>)}
            </div>
          ):projects.length===0?(
            <div style={{textAlign:"center",padding:48,border:"1px dashed var(--border2)",borderRadius:16,background:"var(--surface)"}}>
              <div style={{fontSize:36,marginBottom:8}}>📂</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text3)"}}>{t("cp_no_projects","Пока нет проектов")}</div>
              <div style={{fontSize:13,color:"var(--text5)",marginTop:8,maxWidth:400,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>{t("cp_create_in_strategy","Создайте проект в разделе «Стратегия» — он появится и здесь.")}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginTop:20}}>
                <button type="button" className="btn-interactive" onClick={onBackToStrategy} style={{padding:"11px 22px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:14,fontWeight:800,boxShadow:"0 4px 18px var(--accent-glow)"}}>{t("cp_go_strategy","Перейти в стратегию")}</button>
              </div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
              {projects.map((p:any,i:number)=>{
                const maps=mapsByProj[p.id]||[];
                const nMaps=maps.length;
                const nNodes=maps.reduce((acc:number,m:any)=>acc+(m.nodes?.length||0),0);
                return(
                  <button key={p.id} type="button" className="btn-interactive card-stagger sa-cp-hub-card" disabled={!tier.contentPlan} aria-label={tier.contentPlan?t("cp_card_aria_open","Открыть контент-план проекта {name}").replace("{name}",p.name||""):t("cp_card_aria_locked","Разблокировать Pro для контент-плана")}
                    onClick={()=>{if(!tier.contentPlan){onUpgrade&&onUpgrade();return;}onOpenProject(p,maps);}} style={{textAlign:"left",padding:"20px 22px",borderRadius:18,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--surface)",cursor:tier.contentPlan?"pointer":"not-allowed",opacity:tier.contentPlan?1:.78,display:"flex",flexDirection:"column",gap:12,animationDelay:`${Math.min(i,8)*0.05}s`}}>
                    <div style={{fontSize:16,fontWeight:900,color:"var(--text)",letterSpacing:-.3}}>{p.name||t("untitled","Без названия")}</div>
                    <div style={{fontSize:12.5,color:"var(--text5)",display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span>{t("cp_stat_maps","{n} карт").replace("{n}",String(nMaps))}</span>
                      <span>·</span>
                      <span>{t("cp_stat_steps","{n} шагов").replace("{n}",String(nNodes))}</span>
                    </div>
                    <div style={{marginTop:"auto",paddingTop:4}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,fontSize:12.5,fontWeight:800,border:tier.contentPlan?"none":"1px dashed var(--border2)",background:tier.contentPlan?"var(--gradient-accent)":"var(--surface2)",color:tier.contentPlan?"var(--accent-on-bg)":"var(--text4)",boxShadow:tier.contentPlan?"0 2px 12px var(--accent-glow)":"none"}}>
                        {tier.contentPlan?<>✍️ {t("cp_open_plan_btn","Открыть план")}</>:<>🔒 {t("cp_locked_cta_short","Нужен Pro")}</>}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showNotifs&&onSelectProject&&onOpenMap&&(
        <NotificationsCenterModal
          open={showNotifs}
          onClose={()=>setShowNotifs(false)}
          isMobile={isMobile}
          zIndex={220}
          notifs={notifs}
          setNotifs={setNotifs}
          notifUnread={notifUnread}
          setNotifUnread={setNotifUnread}
          notifLoading={notifLoading}
          lang={lang}
          t={t}
          loadNotifications={loadNotifications}
          onFollowLink={async(n:any)=>{
            if(!n.link)return;
            try{
              const u=new URL(n.link,window.location.origin);
              const open=(u.searchParams.get("open")||"").toLowerCase();
              const projectId=u.searchParams.get("projectId")||"";
              const mapId=u.searchParams.get("mapId")||"";
              const nodeId=u.searchParams.get("nodeId")||"";
              if(open==="contentplan"&&projectId){
                const p=projects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onOpenProject(p,mapsByProj[projectId]||[]);return;}
              }
              if(open==="project"&&projectId){
                const p=projects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onSelectProject(p);return;}
              }
              if(open==="map"&&projectId&&mapId){
                const p=projects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onOpenMap({id:mapId},p,false,false,nodeId||null);return;}
              }
            }catch{}
            window.location.href=n.link;
          }}
        />
      )}

      {showAIHub&&(
        <AiHubModal open={showAIHub} onClose={()=>setShowAIHub(false)} isMobile={isMobile} t={t} hint={t("ai_hub_hint_cp","Тот же чат, что в стратегии. Контекст — проекты и карты, открытые в разделе контент-плана.")}>
          <AiPanel embedded={true} isMobile={isMobile} nodes={aiNodes} edges={aiEdges} ctx={aiCtx} tier={user?.tier||"free"} projectName={t("cp_hub_title","Контент-план")} mapName="" userName={user?.name||user?.email||""} msgs={aiChatMsgs||[]} onMsgsChange={aiChatSetMsgs||(()=>{})} onAddNode={()=>{}} onClose={()=>{}} externalMsgs={[]} onClearExternal={()=>{}} onError={()=>{}} statusMap={getSTATUS(t)}/>
        </AiHubModal>
      )}
      <FloatingAiAssistant t={t} variant="app" onOpenFullChat={() => setShowAIHub(true)} />
    </div></div>
  );
}

// ── Контент-план одного проекта (полноэкранно, как карта) ──
function ContentPlanProjectPage({user,project,maps,theme,onBackToHub,onOpenStrategyProject,onLogout,onChangeTier,onUpgrade,onProfile,onToggleTheme,aiChatMsgs,aiChatSetMsgs,onSelectProject,onOpenMap,onSwitchContentPlanProject}){
  const{t,lang}=useLang();
  const isMobile=useIsMobile();
  const tier=TIERS[user?.tier||"free"]||TIERS.free;
  const[showAIHub,setShowAIHub]=useState(false);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  const[allProjects,setAllProjects]=useState<any[]>([]);

  useEffect(()=>{document.title=`${project?.name||"Проект"} — ${t("cp_doc_suffix","Контент-план")}`;},[project?.name,t]);
  useEffect(()=>{(async()=>{try{setAllProjects(await getProjects(user.email));}catch{setAllProjects([]);}})();},[user?.email]);

  const aiNodes=(maps||[]).flatMap((m:any)=>m.nodes||[]).slice(0,220);
  const aiEdges=(maps||[]).flatMap((m:any)=>m.edges||[]).slice(0,260);
  const aiCtx=`Контент-план проекта «${project?.name||"Проект"}». Карты: ${(maps||[]).length}. Шагов стратегии в контексте: ${aiNodes.length}.`;

  return(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      <StrategyShellBg/>
      <div style={{flex:1,minHeight:0,minWidth:0,display:"flex",flexDirection:"column",position:"relative",zIndex:1,overflow:"hidden"}}>
      <div className="sa-app-topbar">
        <div className="atb-cluster" style={{minWidth:0,flex:isMobile?"1 1 100%":undefined}}>
          <button type="button" className="sa-back-ic" onClick={onBackToHub} title={t("cp_back_hub_tip","К списку проектов в контент-плане")} aria-label={t("cp_back_hub","Все проекты")}>←</button>
          <div style={{minWidth:0,maxWidth:isMobile?"calc(100% - 48px)":"280px"}}>
            <div className="tb-title" style={{fontSize:isMobile?14:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✍️ {project?.name||t("untitled","Проект")}</div>
            <div className="tb-sub">{t("cp_project_sub","Контент-план и календарь")}</div>
          </div>
        </div>
        {!isMobile&&(
          <div style={{flex:"1 1 200px",display:"flex",justifyContent:"center",minWidth:0}}>
            <MainWorkspaceNav mode="contentPlan" onStrategy={onOpenStrategyProject} onContentPlan={()=>{}} t={t} isMobile={false}/>
          </div>
        )}
        <div className="atb-cluster" style={{marginLeft:isMobile?0:"auto"}}>
          <button type="button" className="btn-g" onClick={onOpenStrategyProject} title={t("cp_open_strategy_tip","Картами и шагами в проекте")} style={{height:32,fontSize:11.5,padding:"0 12px",display:"inline-flex",alignItems:"center",gap:6,color:"var(--acc)"}}>
            <span aria-hidden>🗺</span>{isMobile?"":t("cp_open_strategy","Карты проекта")}
          </button>
          <div className="tpill" onClick={onToggleTheme} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onToggleTheme();}} aria-label={t("toggle_theme_tip","Сменить тему оформления")}>
            <div className={`tpi${theme==="dark"?" on":""}`}>☽</div>
            <div className={`tpi${theme==="light"?" on":""}`}>☀</div>
          </div>
          <button type="button" className="btn-g" onClick={()=>setShowAIHub(true)} title={t("ai_hub_title","✦ AI (единый чат)")} style={{height:32,fontSize:11.5,padding:"0 12px",display:"inline-flex",alignItems:"center",gap:6}}>
            <span aria-hidden>✦</span>{!isMobile&&t("ai_hub_btn_short","AI-чат")}
          </button>
          {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
          <button type="button" className="btn-g" onClick={onProfile} style={{height:32,padding:"0 12px",gap:8,display:"inline-flex",alignItems:"center",maxWidth:isMobile?40:200}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,var(--acc),var(--acc2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.name||user.email||"?")[0].toUpperCase()}</span>
            {!isMobile&&<><span style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name||user.email?.split("@")[0]||"?"}</span><span style={{fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase"}}>{tier.label}</span></>}
          </button>
          <button type="button" className="btn-g" onClick={onLogout} style={{height:32,fontSize:11.5,color:"var(--red)"}}>{t("logout","Выйти")}</button>
        </div>
      </div>
      {isMobile&&(
        <div style={{padding:"8px 14px",borderBottom:".5px solid var(--b1)",background:"var(--top)",display:"flex",justifyContent:"center"}}>
          <MainWorkspaceNav mode="contentPlan" onStrategy={onOpenStrategyProject} onContentPlan={()=>{}} t={t} isMobile={true}/>
        </div>
      )}
      <div className="sa-page-reveal" style={{flex:1,overflow:"auto",padding:isMobile?"12px 14px":"18px 22px"}}>
        {!tier.contentPlan?(
          <div className="sa-ref-panel sa-ref-panel--lift sa-page-reveal sa-pr-d1" style={{textAlign:"center",padding:"40px 28px",maxWidth:440,margin:"0 auto",borderStyle:"dashed"}}>
            <div style={{fontSize:40,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🔒</div>
            <div className="modal-title" style={{marginBottom:8}}>{t("content_plan_locked_title","Контент-план доступен на Pro")}</div>
            <div className="modal-sub" style={{marginBottom:22}}>{t("content_plan_locked_hint_inline","Оформите Pro в профиле — откроются календарь, привязка к шагам стратегии и AI-подсказки по ленте.")}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
              {onUpgrade&&<button type="button" className="btn-p lg" onClick={onUpgrade}>{t("upgrade_to_pro","Перейти на Pro")}</button>}
              <button type="button" className="btn-g lg" style={{minWidth:200,justifyContent:"center"}} onClick={onOpenStrategyProject}>{t("cp_back_to_maps_only","Только карты проекта")}</button>
            </div>
          </div>
        ):(
          <div className="sa-page-reveal sa-pr-d1"><ContentPlanTab projectId={project.id} projectName={project.name||""} maps={maps} user={user} theme={theme} lang={lang} t={t} onChangeTier={onChangeTier}/></div>
        )}
      </div>

      {showNotifs&&onSelectProject&&onOpenMap&&(
        <NotificationsCenterModal
          open={showNotifs}
          onClose={()=>setShowNotifs(false)}
          isMobile={isMobile}
          zIndex={220}
          notifs={notifs}
          setNotifs={setNotifs}
          notifUnread={notifUnread}
          setNotifUnread={setNotifUnread}
          notifLoading={notifLoading}
          lang={lang}
          t={t}
          loadNotifications={loadNotifications}
          onFollowLink={async(n:any)=>{
            if(!n.link)return;
            try{
              const u=new URL(n.link,window.location.origin);
              const open=(u.searchParams.get("open")||"").toLowerCase();
              const projectId=u.searchParams.get("projectId")||"";
              const mapId=u.searchParams.get("mapId")||"";
              const nodeId=u.searchParams.get("nodeId")||"";
              if(open==="contentplan"&&projectId&&onSwitchContentPlanProject){
                if(projectId===project?.id){setShowNotifs(false);return;}
                const p=allProjects.find((x:any)=>x.id===projectId);
                if(p){
                  setShowNotifs(false);
                  const ms=await getMaps(p.id);
                  onSwitchContentPlanProject(p,Array.isArray(ms)?ms:[]);
                  return;
                }
              }
              if(open==="project"&&projectId){
                const p=allProjects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onSelectProject(p);return;}
              }
              if(open==="map"&&projectId&&mapId){
                const p=allProjects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onOpenMap({id:mapId},p,false,false,nodeId||null);return;}
              }
            }catch{}
            window.location.href=n.link;
          }}
        />
      )}

      {showAIHub&&(
        <AiHubModal open={showAIHub} onClose={()=>setShowAIHub(false)} isMobile={isMobile} t={t} hint={t("ai_hub_hint_cp_project","Контекст — карты и шаги текущего проекта в режиме контент-плана.")}>
          <AiPanel embedded={true} isMobile={isMobile} nodes={aiNodes} edges={aiEdges} ctx={aiCtx} tier={user?.tier||"free"} projectName={project?.name||""} mapName={t("cp_doc_suffix","Контент-план")} userName={user?.name||user?.email||""} msgs={aiChatMsgs||[]} onMsgsChange={aiChatSetMsgs||(()=>{})} onAddNode={()=>{}} onClose={()=>{}} externalMsgs={[]} onClearExternal={()=>{}} onError={()=>{}} statusMap={getSTATUS(t)}/>
        </AiHubModal>
      )}
      <FloatingAiAssistant t={t} variant="app" onOpenFullChat={() => setShowAIHub(true)} />
    </div></div>
  );
}

// ── ProjectsPage ──
type ProjectLite={id:string;name:string;owner:string;members?:Array<{email:string;role:string}>;createdAt?:number;created_at?:number};
type MapLite={id:string;name?:string;isScenario?:boolean;nodes?:any[];edges?:any[]};

function ProjectsPage({user,onSelectProject,onOpenMap,onLogout,onChangeTier,onProfile,theme,onToggleTheme,aiChatMsgs,aiChatSetMsgs,onOpenContentPlanHub,onOpenContentPlanProject}){
  const{t,lang,setLang}=useLang();
  const isMobile=useIsMobile();
  const ROLES=getROLES(t);
  const[projects,setProjects]=useState<ProjectLite[]>([]);
  const[maps,setMaps]=useState<Record<string,MapLite[]>>({});
  const[toast,setToast]=useState<{msg:string;type:string}|null>(null);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[searching,setSearching]=useState(false);
  const[searchResults,setSearchResults]=useState<any[]>([]);
  const[creating,setCreating]=useState(false);
  const[newName,setNewName]=useState("");
  const[delId,setDelId]=useState<string|null>(null);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  const[showAIHub,setShowAIHub]=useState(false);
  const[showBriefing,setShowBriefing]=useState(false);
  const tier=TIERS[user?.tier||"free"]||TIERS.free;

  const[loadErr,setLoadErr]=useState<string|null>(null);
  async function loadProjects(){
    setLoadErr(null);setLoading(true);
    try{
      const ps=await getProjects(user.email);setProjects(ps);
      const mm:Record<string,MapLite[]>={};
      for(const p of ps){mm[p.id]=await getMaps(p.id);}
      setMaps(mm);
    }catch(e:any){setLoadErr(e?.message||t("load_error","Ошибка загрузки"));setProjects([]);setMaps({});}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadProjects();},[]);

  useEffect(()=>{document.title=loading?t("doc_title_loading","Strategy AI — Загрузка…"):t("doc_title_projects","Strategy AI — Проекты");},[loading,t]);

  useEffect(()=>{
    if(!API_BASE){setSearchResults([]);return;}
    const q=(search||"").trim();
    if(q.length<2){setSearchResults([]);setSearching(false);return;}
    setSearching(true);
    const t=setTimeout(async()=>{
      try{
        const d=await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
        setSearchResults(Array.isArray(d?.results)?d.results:[]);
      }catch{setSearchResults([]);}
      setSearching(false);
    },250);
    return()=>clearTimeout(t);
  },[search]);

  async function createProject(){
    if(!newName.trim())return;
    if(projects.filter(p=>p.owner===user.email).length>=tier.projects){setToast({msg:t("project_limit","Лимит проектов"),type:"error"});setTimeout(()=>setToast(null),3000);return;}
    const p={id:uid(),name:newName.trim(),owner:user.email,members:[{email:user.email,role:"owner"}],createdAt:Date.now()};
    try{
      const saved=await saveProject(p);
      const finalP=saved||p;
      setProjects(ps=>[...ps,finalP]);
      setMaps(m=>({...m,[finalP.id]:[]}));
      setNewName("");setCreating(false);
      setToast({msg:t("project_created","Проект создан"),type:"success"});setTimeout(()=>setToast(null),3000);
    }catch(e:any){setToast({msg:e?.message||t("save_error","Ошибка сохранения"),type:"error"});setTimeout(()=>setToast(null),4000);}
  }
  async function deleteProj(id){
    try{
      await deleteProject(id);setProjects(ps=>ps.filter(p=>p.id!==id));
      const nm={...maps};delete nm[id];setMaps(nm);setDelId(null);
    }catch(e:any){setDelId(null);setToast({msg:e?.message||t("delete_project_err","Ошибка при удалении проекта"),type:"error"});setTimeout(()=>setToast(null),4000);}
  }

  const filtered=projects.filter((p:ProjectLite)=>p.name.toLowerCase().includes(search.toLowerCase()));
  const myCount=projects.filter((p:ProjectLite)=>p.owner===user.email).length;
  const atLimit=myCount>=tier.projects;
  const lastProj=useMemo<ProjectLite|null>(()=>{try{const s=localStorage.getItem("sa_last_project");if(!s)return null;const j=JSON.parse(s);return projects.find((p:ProjectLite)=>p.id===j.id||p.name===j.name)||null;}catch{return null;}},[projects]);
  const lastMapData=useMemo<MapLite|null>(()=>{if(!lastProj)return null;try{const s=localStorage.getItem("sa_last_map");if(!s)return null;const j=JSON.parse(s);const ms=maps[lastProj.id]||[];return ms.find((m:MapLite)=>m.id===j.id||m.name===j.name)||null;}catch{return null;}},[lastProj,maps]);
  const allMapsForAI=Object.values(maps||{}).flatMap((arr:any)=>Array.isArray(arr)?arr:[]);
  const aiNodes=allMapsForAI.flatMap((m:any)=>m.nodes||[]).slice(0,220);
  const aiEdges=allMapsForAI.flatMap((m:any)=>m.edges||[]).slice(0,260);
  const aiCtx=`Портфель проектов пользователя: ${(projects||[]).slice(0,20).map((p:any)=>`«${p.name||"Проект"}»`).join(", ")}. Всего проектов: ${(projects||[]).length}. Всего карт загружено: ${allMapsForAI.length}.`;

  function handleProjectsShellNav(nav:StrategyShellNav){
    if(nav==="projects")return;
    if(nav==="settings"){onProfile();return;}
    if(nav==="map"){
      if(lastMapData&&lastProj)onOpenMap(lastMapData,lastProj,false,false);
      else if(lastProj)onSelectProject(lastProj);
      else{setToast({msg:t("shell_open_map_hint","Создайте проект и откройте карту."),type:"error"});setTimeout(()=>setToast(null),3200);}
      return;
    }
    if(nav==="contentPlan"){onOpenContentPlanHub?.();return;}
    if(nav==="ai"){setShowAIHub(true);return;}
    if(nav==="scenarios"){setToast({msg:t("shell_scenarios_hint","Откройте карту проекта — там доступна симуляция сценариев."),type:"info"});setTimeout(()=>setToast(null),3500);return;}
    if(nav==="timeline"){setToast({msg:t("shell_timeline_hint","Откройте карту — диаграмма Gantt на панели инструментов."),type:"info"});setTimeout(()=>setToast(null),3500);return;}
    if(nav==="insights"){setToast({msg:t("shell_insights_hint","Откройте карту — статистика на панели инструментов."),type:"info"});setTimeout(()=>setToast(null),3500);return;}
    if(nav==="team"){setToast({msg:t("shell_team_hint","Участники отображаются в карточке каждого проекта."),type:"info"});setTimeout(()=>setToast(null),3500);return;}
  }
  const shellUi=!isMobile;
  const scenarioBadgeCount=allMapsForAI.filter((m:any)=>m.isScenario).length;

  const _projMain=(
    <>
{toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"14px 24px",borderRadius:14,border:`1px solid ${toast.type==="error"?"rgba(239,68,68,.4)":"rgba(16,185,129,.4)"}`,background:toast.type==="error"?"rgba(239,68,68,.15)":"rgba(16,185,129,.15)",color:toast.type==="error"?"#f87171":"#34d399",fontSize:14,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.3)",animation:"slideUp .3s ease",backdropFilter:"blur(12px)"}}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
      )}
      {!shellUi&&(
      <div className="sa-app-topbar">
        <div className="atb-cluster" style={{minWidth:0}}>
          <div className="land-logo" style={{gap:10}}>
            <div className="land-gem" style={{width:32,height:32,borderRadius:10,fontSize:12}}>SA</div>
            <span className="land-brand" style={{fontSize:15}}>Strategy AI</span>
          </div>
        </div>
        {!isMobile&&onOpenContentPlanHub&&(
          <div style={{flex:1,display:"flex",justifyContent:"center",minWidth:0}}>
            <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={false}/>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?6:8,flexShrink:0}}>
          <button onClick={onToggleTheme} style={{padding:"5px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{theme==="dark"?"☀️":"🌙"}</button>
          <button type="button" className="btn-interactive" onClick={()=>setShowAIHub(true)} title={t("ai_hub_title","✦ AI (единый чат)")} style={{padding:"6px 12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:800,display:"inline-flex",alignItems:"center",gap:6}}>
            <span aria-hidden>✦</span>{t("ai_hub_btn_short","AI-чат")}
          </button>
          {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
          <button type="button" className="btn-g" onClick={onProfile} style={{height:32,padding:"0 12px",gap:8,display:"inline-flex",alignItems:"center",maxWidth:isMobile?44:220}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,var(--acc),var(--acc2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.name||user.email||"?")[0].toUpperCase()}</span>
            {!isMobile&&<><span style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name||user.email?.split("@")[0]||"?"}</span><span style={{fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase"}}>{tier.label}</span></>}
          </button>
          <button type="button" className="btn-g" onClick={onLogout} style={{height:32,fontSize:11.5,color:"var(--red)"}}>{t("logout","Выйти")}</button>
        </div>
      </div>
      )}
      {shellUi&&(
        <div className="sa-topbar">
          <div className="tb-l">
            <div className="tb-title-wrap">
              <span className="tb-title">{t("your_projects","Мои проекты")}</span>
              <span className="tb-sub">{myCount}{tier.projects==="∞"?"":" / "+tier.projects} · {tier.label}</span>
              <span className="tb-flow">{t("workspace_flow_hint_projects","Проект → карта → сценарии, таймлайн и AI — одна логика работы.")}</span>
            </div>
          </div>
          <div className="tb-r" style={{flexWrap:"wrap",justifyContent:"flex-end"}}>
            {onOpenContentPlanHub&&<MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={false}/>}
            <button type="button" className="btn-g" onClick={()=>setShowAIHub(true)} title={t("ai_hub_title","✦ AI (единый чат)")} style={{height:32,fontSize:11.5,padding:"0 12px",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
              <span aria-hidden>✦</span>{t("ai_hub_btn_short","AI-чат")}
            </button>
            {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
          </div>
        </div>
      )}
      <div className={shellUi?"scr":undefined} style={{flex:1,overflowY:shellUi?undefined:"auto",padding:shellUi?0:isMobile?16:24,position:"relative",zIndex:5,minHeight:0}}>
        <div style={{maxWidth:shellUi?"min(1440px,100%)":960,width:"100%",margin:"0 auto"}}>
          {isMobile&&onOpenContentPlanHub&&(
            <div style={{marginBottom:18}}>
              <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={true}/>
            </div>
          )}
          <div className="sa-projects-sticky-head" style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:20,marginBottom:24,position:"sticky",top:0,zIndex:20,padding:"14px 4px",margin:"0 -4px 24px",background:"color-mix(in srgb,var(--bg) 72%,transparent)",backdropFilter:"blur(18px)",borderBottom:".5px solid var(--b1)"}}>
            <div>
              <h1 style={{fontSize:isMobile?18:22,fontWeight:900,color:"var(--text)",letterSpacing:-.5,marginBottom:2}}>{t("your_projects","Мои проекты")}</h1>
              <div style={{fontSize:13.5,color:"var(--text3)"}}>{t("projects_of_limit","{cur} из {max} проектов").replace("{cur}",String(myCount)).replace("{max}",tier.projects==="∞"?"∞":String(tier.projects))}</div>
            </div>
            {!isMobile&&<div style={{flex:1}}/>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:isMobile?1:undefined}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search_projects_hint","Поиск по проектам и картам…")} className="input-smooth" style={{padding:"10px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",width:isMobile?"100%":220,minWidth:isMobile?undefined:140,fontFamily:"inherit"}}/>
                {API_BASE&&((search||"").trim().length>=2)&&(searching||searchResults.length>0)&&(
                  <div className="glass-panel drop-panel" style={{position:"absolute",top:"calc(100% + 8px)",left:0,right:0,zIndex:50,borderRadius:14,border:"1px solid var(--glass-border-accent,var(--border))",overflow:"hidden",boxShadow:"var(--glass-shadow-accent,none),0 22px 60px rgba(0,0,0,.35)"}}>
                    <div style={{padding:"10px 12px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:"var(--surface)"}}>
                      <div style={{fontSize:12.5,fontWeight:900,color:"var(--text)"}}>{t("search_results","Результаты поиска")}</div>
                      <div style={{fontSize:12,color:"var(--text5)"}}>{searching?t("loading_short","Загрузка…"):`${searchResults.length}`}</div>
                    </div>
                    <div style={{maxHeight:360,overflow:"auto",padding:"8px 8px 10px",background:"var(--surface)"}}>
                      {searching&&searchResults.length===0?(
                        <div style={{padding:"10px 8px",fontSize:12.5,color:"var(--text5)"}}>{t("loading_short","Загрузка…")}</div>
                      ):searchResults.length===0?(
                        <div style={{padding:"10px 8px",fontSize:12.5,color:"var(--text5)"}}>{t("search_empty","Ничего не найдено")}</div>
                      ):(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {searchResults.slice(0,24).map((r:any)=>(
                            <button key={`${r.type}:${r.id}`} className="btn-interactive" onClick={async()=>{
                              try{
                                const proj=projects.find((p:any)=>p.id===r.projectId)||{id:r.projectId,name:r.subtitle||"Проект"};
                                if(r.type==="map"){
                                  onOpenMap({id:r.id},proj,false,false);
                                }else if(r.type==="node"){
                                  onOpenMap({id:r.mapId},proj,false,false,r.id);
                                }
                                setSearchResults([]);setSearch("");
                              }catch{}
                            }} style={{textAlign:"left",padding:"10px 12px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
                              <div style={{width:26,height:26,borderRadius:9,background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:"var(--text4)"}}>
                                {r.type==="map"?"M":"N"}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:900,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title||t("untitled","Без названия")}</div>
                                <div style={{fontSize:12.5,color:"var(--text5)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.subtitle||""}</div>
                                {r.highlight&&<div style={{fontSize:12.5,color:"var(--text4)",marginTop:6,lineHeight:1.4,opacity:.95}}>{String(r.highlight)}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=>{if(atLimit){return;}setCreating(true);}} className="btn-smooth" style={{padding:"8px 18px",borderRadius:10,border:"none",background:atLimit?"var(--surface)":"var(--gradient-accent)",color:atLimit?"var(--text4)":"var(--accent-on-bg)",cursor:atLimit?"not-allowed":"pointer",fontSize:13,fontWeight:700,flexShrink:0,boxShadow:atLimit?"none":"0 2px 12px var(--accent-glow)"}} title={atLimit?t("projects_limit_tip","Лимит {n} проектов для {tier}").replace("{n}",String(tier.projects)).replace("{tier}",tier.label):t("new_project","+ Новый проект")}>+ {t("project_short","Проект")}</button>
            </div>
          </div>
          {atLimit&&<div role="status" style={{padding:"10px 16px",borderRadius:10,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",color:"#f09428",fontSize:13.5,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>⚠️ {t("projects_limit_banner","Лимит проектов для тарифа {tier}.").replace("{tier}",tier.label)} <button onClick={onProfile} style={{border:"none",background:"none",color:"var(--accent-1)",cursor:"pointer",fontWeight:700,fontSize:13.5}}>{t("upgrade_tier_arrow","Улучшить тариф →")}</button></div>}
          {lastProj&&!loading&&onOpenMap&&(
            <div className="card-stagger" style={{display:"flex",flexDirection:isMobile?"column":"row",gap:14,marginBottom:20,alignItems:"stretch",animationDelay:".05s"}}>
              <div className="glass-card icard" style={{flex:1,minWidth:0,padding:"16px 20px",borderRadius:16,border:"1px solid var(--glass-border-accent,var(--border))",background:"linear-gradient(135deg,var(--accent-soft),color-mix(in srgb,var(--accent-soft) 70%,transparent))",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"default"}}>
                <span style={{fontSize:12.5,color:"var(--text3)",fontWeight:600,letterSpacing:".02em",textTransform:"uppercase"}}>{t("continue_last","Продолжить с")}</span>
                <button className="btn-smooth" onClick={()=>lastMapData?onOpenMap(lastMapData,lastProj,false,false):onSelectProject(lastProj)} style={{padding:"9px 18px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 16px var(--accent-glow)"}}>
                  {lastMapData?`${lastProj.name} → ${lastMapData.name}`:lastProj.name}
                </button>
              </div>
              {lastMapData&&(
                <div className="glass-card icard" style={{flex:1,minWidth:0,padding:"16px 20px",borderRadius:16,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:isMobile?"wrap":"nowrap",cursor:"default"}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,color:"var(--text4)",marginBottom:4,fontWeight:600,letterSpacing:".02em",textTransform:"uppercase"}}>{t("projects_briefing_cta","Брифинг по последней карте")}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lastMapData.name||"—"}</div>
                  </div>
                  <button type="button" className="btn-smooth btn-interactive" onClick={()=>setShowBriefing(true)} style={{padding:"10px 16px",borderRadius:12,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",cursor:"pointer",fontSize:13,fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>
                    📋 {t("weekly_briefing","Еженедельный брифинг")}
                  </button>
                </div>
              )}
            </div>
          )}
          {creating&&(
            <div style={{padding:"16px 18px",borderRadius:14,background:"var(--surface)",border:"1px solid var(--border2)",marginBottom:16,display:"flex",gap:10,alignItems:"center",animation:"slideUp .2s ease"}}>
              <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createProject();if(e.key==="Escape"){setCreating(false);setNewName("");}}} placeholder={t("new_project_name_ph","Название проекта…")} style={{flex:1,padding:"9px 13px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
              <button onClick={createProject} disabled={!newName.trim()} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:newName.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:700,opacity:newName.trim()?1:.5}}>{t("create_map_btn","Создать")}</button>
              <button onClick={()=>{setCreating(false);setNewName("");}} style={{padding:"9px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{t("cancel","Отмена")}</button>
            </div>
          )}
          {loadErr?(
            <div style={{padding:"32px 24px",textAlign:"center",background:"var(--surface)",borderRadius:18,border:"1px solid var(--border)"}}>
              <div style={{fontSize:15,color:"var(--text3)",marginBottom:12}}>{loadErr}</div>
              <button onClick={loadProjects} className="btn-interactive" style={{padding:"12px 24px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",fontSize:14,fontWeight:700,cursor:"pointer"}}>{t("retry","Повторить")}</button>
            </div>
          ):loading?(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(auto-fill,minmax(${shellUi?300:260}px,1fr))`,gap:isMobile?16:20}}>
              {[1,2,3,4].map(i=>(
                <div key={i} className="glass-card card-stagger" style={{padding:"22px 22px 18px",borderRadius:18,border:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:14,animationDelay:`${i*0.05}s`}}>
                  <div style={{display:"flex",gap:14}}>
                    <div className="sa-skel" style={{width:40,height:40,borderRadius:12}}/>
                    <div style={{flex:1}}>
                      <div className="sa-skel" style={{height:14,borderRadius:7,width:"70%",marginBottom:8}}/>
                      <div className="sa-skel" style={{height:10,borderRadius:5,width:"40%"}}/>
                    </div>
                  </div>
                  <div className="sa-skel" style={{height:8,borderRadius:999}}/>
                  <div style={{display:"flex",gap:6}}>
                    <div className="sa-skel" style={{height:20,width:60,borderRadius:999}}/>
                    <div className="sa-skel" style={{height:20,width:70,borderRadius:999}}/>
                  </div>
                </div>
              ))}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(auto-fill,minmax(${shellUi?300:260}px,1fr))`,gap:isMobile?16:20}}>
              {filtered.map((p,i)=>{
                const pm=maps[p.id]||[];
                const myRole=p.owner===user.email?"owner":p.members?.find(m=>m.email===user.email)?.role;
                const roleLabel=ROLES[myRole]||"";
                const icon=((p.name||"P").trim()[0]||"P").toUpperCase();
                return(
                  <div key={p.id} onClick={()=>onSelectProject(p)} className="icard card-stagger card-interactive"
                    style={{padding:"22px 22px 18px",borderRadius:18,background:"var(--card)",border:"1px solid var(--border)",cursor:"pointer",position:"relative",display:"flex",flexDirection:"column",animationDelay:`${i*0.06}s`}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
                      <div className="sa-proj-card-icon" style={{width:40,height:40,borderRadius:12,background:"var(--surface2)",border:"1px solid var(--glass-border-accent,var(--border))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,color:"var(--text2)",fontWeight:900,letterSpacing:.3}}>{icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="icard-title" style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{p.name}</div>
                        <div className="icard-desc" style={{fontSize:13}}>{roleLabel} · {(p.createdAt||p.created_at)?new Date(p.createdAt||p.created_at).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"numeric",month:"short"}):"—"}</div>
                      </div>
                      {p.owner===user.email&&(
                        <IconButton size={26} danger aria-label={t("delete_project","Удалить проект?")} onClick={(e)=>{e.stopPropagation();setDelId(p.id);}} style={{fontSize:14,opacity:.78}}>×</IconButton>
                      )}
                    </div>
                    {/* Progress bar based on completed nodes */}
                    {(()=>{
                      const allNodes=pm.flatMap(m=>m.nodes||[]);
                      const totalN=allNodes.length;
                      const doneN=allNodes.filter(n=>n.status==="completed").length;
                      const pct=totalN?Math.round(doneN/totalN*100):0;
                      if(totalN===0)return null;
                      return(
                        <div style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <span style={{fontSize:13,color:"var(--text5)",letterSpacing:".01em"}}>{t("progress","Прогресс")}</span>
                            <span style={{fontSize:13,fontWeight:800,color:"#12c482"}}>{pct}%</span>
                          </div>
                          <div className="sa-proj-progress" style={{height:6}}>
                            <div className="sa-proj-progress__fill" style={{width:"100%",["--pp" as any]:(pct/100).toFixed(3)}}/>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:"auto"}}>
                      <div style={{padding:"3px 9px",borderRadius:999,background:"var(--surface)",border:"1px solid var(--border)",fontSize:12.5,color:"var(--text4)",fontWeight:700}}>{pm.filter(m=>!m.isScenario).length} {t("maps","карт")}</div>
                      {pm.filter(m=>m.isScenario).length>0&&<div style={{padding:"3px 9px",borderRadius:999,background:"var(--surface)",border:"1px solid var(--border)",fontSize:12.5,color:"var(--text4)",fontWeight:700}}>{pm.filter(m=>m.isScenario).length} {t("scenarios_short","сцен.")}</div>}
                      {(()=>{const n=pm.flatMap(m=>m.nodes||[]).length;return n>0?<div style={{padding:"3px 9px",borderRadius:999,background:"var(--surface)",border:"1px solid var(--border)",fontSize:12.5,color:"var(--text4)",fontWeight:700}}>{n} {t("steps_label","шагов")}</div>:null;})()}
                      {p.members?.length>1&&<div style={{padding:"3px 9px",borderRadius:999,background:"var(--surface)",border:"1px solid var(--border)",fontSize:12.5,color:"var(--text4)",fontWeight:700}}>{p.members.length} {t("members","участников")}</div>}
                    </div>
                  </div>
                );
              })}
              {!filtered.length&&!loading&&(
                <div className="card-stagger" style={{gridColumn:"1/-1",textAlign:"center",padding:"64px 24px",color:"var(--text4)",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                  <div aria-hidden style={{width:88,height:88,borderRadius:26,background:"linear-gradient(135deg,var(--accent-soft),transparent 80%)",border:"1px solid var(--glass-border-accent,var(--border))",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
                    <span style={{position:"absolute",inset:"-30%",background:"radial-gradient(circle,var(--accent-glow),transparent 55%)",animation:"saEmptyPulse 3.6s ease-in-out infinite",pointerEvents:"none"}}/>
                    <span style={{fontSize:36,lineHeight:1,zIndex:1,filter:"drop-shadow(0 2px 8px var(--accent-glow))"}}>✦</span>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginTop:4}}>{search.trim()?t("search_empty","Ничего не найдено"):t("no_projects","Нет проектов")}</div>
                  <div style={{fontSize:13.5,maxWidth:340,lineHeight:1.5,color:"var(--text3)"}}>{search.trim()?t("search_try_other","Попробуйте другой запрос или очистите поиск."):t("click_new_project","Нажмите «+ Проект» чтобы начать")}</div>
                  {!search.trim()&&!atLimit&&(
                    <button onClick={()=>setCreating(true)} className="btn-smooth" style={{marginTop:8,padding:"11px 22px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 6px 20px var(--accent-glow)"}}>+ {t("new_project","Новый проект")}</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {delId&&<ConfirmDialog title={t("delete_project","Удалить проект?")} message={t("delete_project_desc","Все карты и данные проекта будут удалены без возможности восстановления.")} confirmLabel={t("delete","Удалить")} onConfirm={()=>deleteProj(delId)} onCancel={()=>setDelId(null)} danger={true}/>}
      {showBriefing&&lastMapData&&(
        <WeeklyBriefingModal
          nodes={lastMapData.nodes||[]}
          mapName={lastMapData.name||t("map_default","Карта")}
          user={user}
          onClose={()=>setShowBriefing(false)}
          theme={theme}
          onError={(msg)=>{setToast({msg,type:"error"});setTimeout(()=>setToast(null),4000);}}
        />
      )}

      {showNotifs&&(
        <NotificationsCenterModal
          open={showNotifs}
          onClose={()=>setShowNotifs(false)}
          isMobile={isMobile}
          zIndex={220}
          notifs={notifs}
          setNotifs={setNotifs}
          notifUnread={notifUnread}
          setNotifUnread={setNotifUnread}
          notifLoading={notifLoading}
          lang={lang}
          t={t}
          loadNotifications={loadNotifications}
          onFollowLink={async(n:any)=>{
            if(!n.link)return;
            try{
              const u=new URL(n.link,window.location.origin);
              const open=(u.searchParams.get("open")||"").toLowerCase();
              const projectId=u.searchParams.get("projectId")||"";
              const mapId=u.searchParams.get("mapId")||"";
              const nodeId=u.searchParams.get("nodeId")||"";
              if(open==="contentplan"){
                if(!projectId&&onOpenContentPlanHub){setShowNotifs(false);onOpenContentPlanHub();return;}
                if(projectId&&onOpenContentPlanProject){
                  const p=projects.find((x:any)=>x.id===projectId);
                  if(p){setShowNotifs(false);onOpenContentPlanProject(p,(maps as any)[p.id]||[]);return;}
                }
              }
              if(open==="project"&&projectId){
                const p=projects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onSelectProject(p);return;}
              }
              if(open==="map"&&projectId&&mapId){
                const p=projects.find((x:any)=>x.id===projectId);
                if(p){setShowNotifs(false);onOpenMap({id:mapId},p,false,false,nodeId||null);return;}
              }
            }catch{}
            window.location.href=n.link;
          }}
        />
      )}

      {showAIHub&&(
        <AiHubModal open={showAIHub} onClose={()=>setShowAIHub(false)} isMobile={isMobile} t={t} hint={t("ai_hub_hint","Этот чат общий для всего приложения. Здесь AI видит портфель проектов и загруженные карты.")}>
          <AiPanel
            embedded={true}
            isMobile={isMobile}
            nodes={aiNodes}
            edges={aiEdges}
            ctx={aiCtx}
            tier={user?.tier||"free"}
            projectName={t("all_projects","Все проекты")}
            mapName=""
            userName={user?.name||user?.email||""}
            msgs={aiChatMsgs||[]}
            onMsgsChange={aiChatSetMsgs||(()=>{})}
            onAddNode={()=>{}}
            onClose={()=>{}}
            externalMsgs={[]}
            onClearExternal={()=>{}}
            onError={()=>{}}
            statusMap={getSTATUS(t)}
          />
        </AiHubModal>
      )}
      <FloatingAiAssistant t={t} variant="app" onOpenFullChat={() => setShowAIHub(true)} />
    </>
  );
  return shellUi?(
    <div className={"sa-strategy-ui sa-v-app "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{width:"100%",height:"100%",minHeight:"100vh",maxHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",overflow:"hidden"}}>
      <StrategyShellBg/>
      <div className="sa-app" style={{flex:1,minHeight:0,minWidth:0,display:"flex",overflow:"hidden",position:"relative",zIndex:1}}>
        <StrategyShellSidebar
          theme={theme}
          onToggleTheme={onToggleTheme}
          activeNav="projects"
          onNavigate={handleProjectsShellNav}
          tierLabel={tier.label}
          tierColor={tier.color}
          onTierClick={onProfile}
          lang={lang}
          onLang={code=>setLang(code)}
          userName={user.name||""}
          userEmail={user.email||""}
          scenarioCount={scenarioBadgeCount}
          projectCount={myCount}
          onUserCard={onProfile}
          onLogout={onLogout}
          showContentPlan={!!onOpenContentPlanHub}
          onContentPlan={onOpenContentPlanHub?()=>onOpenContentPlanHub():undefined}
          showTrialBanner={(user?.tier||"free")==="free"}
          onLogoClick={() => { try { document.querySelector(".sa-main .scr")?.scrollTo({ top: 0, behavior: "smooth" }); } catch {} }}
          t={t}
        />
        <div className="sa-main" style={{flex:1,minWidth:0,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>{_projMain}</div>
      </div>
    </div>
  ):(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{width:"100%",maxWidth:"100%",boxSizing:"border-box",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      <StrategyShellBg/>
      <div style={{flex:1,minHeight:0,minWidth:0,display:"flex",flexDirection:"column",position:"relative",zIndex:1,overflow:"hidden"}}>{_projMain}</div>
    </div>
  );
}

function NotifBell({unread,onClick,className,showLabel}:{unread:number;onClick:()=>void;className?:string;showLabel?:boolean}){
  const{t}=useLang();
  const prevUnread=useRef(unread);
  const[bump,setBump]=useState(false);
  useEffect(()=>{
    if(unread>prevUnread.current){setBump(true);const id=setTimeout(()=>setBump(false),500);return()=>clearTimeout(id);}
    prevUnread.current=unread;
  },[unread]);
  if(!API_BASE)return null;
  const isIc=className?.includes("btn-ic");
  const lbl=t("notifications_short","Уведомления");
  const has=unread>0;
  return(
    <button type="button" className={(className||"btn-interactive")+(has?" sa-notif-pulse":"")} onClick={onClick} title={t("notifications_title","Уведомления")} aria-label={t("notifications_title","Уведомления")}
      style={isIc?{position:"relative",transition:"all .22s cubic-bezier(.34,1.56,.64,1)"}:{position:"relative",padding:showLabel?"6px 12px":"6px 10px",borderRadius:10,border:".5px solid var(--b1)",background:"var(--inp)",color:"var(--t2)",cursor:"pointer",fontSize:14,fontWeight:800,display:"inline-flex",alignItems:"center",gap:6,transition:"all .22s cubic-bezier(.34,1.56,.64,1)"}}>
      <span aria-hidden style={{fontSize:isIc?15:16,lineHeight:1,display:"inline-block",transformOrigin:"50% 10%",animation:has?"sa-bell-swing 2.4s ease-in-out infinite":"none"}}>🔔</span>
      {showLabel&&!isIc&&<span style={{fontSize:11,fontWeight:700,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lbl}</span>}
      {has&&(
        <span key={unread} style={{position:"absolute",top:isIc?4: -6,right:isIc?4: -6,minWidth:18,height:18,padding:"0 6px",borderRadius:999,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 18px rgba(104,54,245,.45)",border:"2px solid var(--bg2)",animation:bump?"sa-badge-pop .5s cubic-bezier(.34,1.56,.64,1)":"none"}}>
          {unread>99?"99+":unread}
        </span>
      )}
    </button>
  );
}

// ── ContentPlanTab (Pro+): ведение контент-плана по проекту, связь с шагами стратегии ──
const CONTENT_TYPES=[{id:"post",labelKey:"content_type_post",fb:"Пост"},{id:"story",labelKey:"content_type_story",fb:"История"},{id:"email",labelKey:"content_type_email",fb:"Рассылка"},{id:"video",labelKey:"content_type_video",fb:"Видео"}];
const CONTENT_CHANNELS=[{id:"blog",labelKey:"content_channel_blog",fb:"Блог"},{id:"instagram",labelKey:"content_channel_instagram",fb:"Instagram"},{id:"telegram",labelKey:"content_channel_telegram",fb:"Telegram"},{id:"vk",labelKey:"content_channel_vk",fb:"ВКонтакте"},{id:"youtube",labelKey:"content_channel_youtube",fb:"YouTube"},{id:"email",labelKey:"content_channel_email",fb:"Email"}];
const CONTENT_STATUSES=[{id:"draft",labelKey:"content_status_draft",fb:"Черновик"},{id:"scheduled",labelKey:"content_status_scheduled",fb:"Запланировано"},{id:"published",labelKey:"content_status_published",fb:"Опубликовано"}];

function contentLabel(arr:{id:string,labelKey:string,fb?:string}[],id:string,t:(k:string,fb?:string)=>string,defaultFb=""){
  const x=arr.find(a=>a.id===id);
  if(!x)return defaultFb;
  return t(x.labelKey,x.fb||defaultFb||x.id);
}

function PillGroup({items,value,onChange,ariaLabel}:{items:{id:string,labelKey:string,fb?:string}[],value:string,onChange:(id:string)=>void,ariaLabel?:string}){
  const{t}=useLang();
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}} role="group" aria-label={ariaLabel}>
      {items.map(x=>{
        const on=value===x.id;
        return(
          <button key={x.id} type="button" aria-pressed={on} onClick={()=>onChange(x.id)}
            className="sa-pill"
            data-on={on?"1":"0"}
            style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${on?"var(--accent-1)":"var(--border)"}`,background:on?"var(--accent-soft)":"var(--surface)",color:on?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:on?700:600,transition:"all .18s cubic-bezier(.34,1.56,.64,1)"}}>
            {t(x.labelKey,x.fb||x.id)}
          </button>
        );
      })}
    </div>
  );
}

function ContentPlanTab({projectId,projectName,maps,user,theme,lang,t,onChangeTier}:{projectId:string;projectName:string;maps:any[];user:any;theme:string;lang:string;t:(k:string,fb?:string)=>string;onChangeTier:(tier:string)=>void}){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [editId,setEditId]=useState<string|null>(null);
  const [filterStatus,setFilterStatus]=useState<string>("all");
  const [viewMode,setViewMode]=useState<"calendar"|"map"|"list"|"tree">("calendar");
  const [aiSuggesting,setAiSuggesting]=useState(false);
  const [pendingDeleteId,setPendingDeleteId]=useState<string|null>(null);
  const [cpCalendarDate,setCpCalendarDate]=useState(()=>new Date());
  const [newItemPresetDate,setNewItemPresetDate]=useState<string>("");
  const isMobile=useIsMobile();
  const treePrefsKey=`sa_cp_tree_${projectId}`;
  const [treeExpandedAll,setTreeExpandedAll]=useState<Record<string,boolean>>({});
  const [treeCollapsed,setTreeCollapsed]=useState<{channels:Record<string,boolean>,statuses:Record<string,boolean>}>(()=>{
    try{
      const raw=localStorage.getItem(treePrefsKey);
      const parsed=raw?JSON.parse(raw):null;
      if(parsed&&typeof parsed==="object") return {channels:parsed.channels||{},statuses:parsed.statuses||{}};
    }catch{}
    return {channels:{},statuses:{}};
  });
  useEffect(()=>{
    try{localStorage.setItem(treePrefsKey,JSON.stringify(treeCollapsed));}catch{}
  },[treePrefsKey,treeCollapsed]);

  useEffect(()=>{(async()=>{setLoading(true);const list=await getContentPlan(projectId);setItems(Array.isArray(list)?list:[]);setLoading(false);})();},[projectId]);
  useEffect(()=>{if(editId===null)setNewItemPresetDate("");},[editId]);

  const allNodes=maps.flatMap((m:any)=>(m.nodes||[]).map((n:any)=>({...n,mapName:m.name})));
  const filtered=filterStatus==="all"?items:items.filter((x:any)=>x.status===filterStatus);

  const CHANNEL_LABEL:any={blog:t("content_channel_blog","Блог"),telegram:t("content_channel_telegram","Telegram"),instagram:t("content_channel_instagram","Instagram"),vk:t("content_channel_vk","ВКонтакте"),youtube:t("content_channel_youtube","YouTube"),email:t("content_channel_email","Email")};
  const STATUS_LABEL:any={
    draft:t("content_status_draft","Черновик"),
    scheduled:t("content_status_scheduled","Запланировано"),
    published:t("content_status_published","Опубликовано"),
  };

  async function saveItem(item:any){
    const id=item.id||uid();
    const next={...item,id,updatedAt:Date.now()};
    const list=items.some((x:any)=>x.id===id)?items.map((x:any)=>x.id===id?next:x):[...items,next];
    setItems(list);
    await saveContentPlan(projectId,list);
    setEditId(null);
  }
  function removeItem(id:string){
    setPendingDeleteId(id);
  }
  function confirmRemoveItem(){
    const id=pendingDeleteId;
    if(!id)return;
    setPendingDeleteId(null);
    const list=items.filter((x:any)=>x.id!==id);
    setItems(list);
    saveContentPlan(projectId,list);
    if(editId===id)setEditId(null);
  }
  async function aiSuggest(){
    if(allNodes.length===0)return;
    setAiSuggesting(true);
    try{
      const stepsCtx=allNodes.slice(0,15).map((n:any)=>`«${n.title}»`).join(", ");
      const sys=`Ты помощник по контент-маркетингу. Проект: ${projectName}. Шаги стратегии: ${stepsCtx}. Предложи 3 конкретные идеи контента (пост/видео/рассылка) — заголовок, канал, краткий тезис. Формат: одна идея на строку: ЗАГОЛОВОК | канал | тезис`;
      const res=await callAI([{role:"user",content:"Предложи 3 идеи контента по шагам стратегии. Кратко: заголовок, канал, тезис."}],sys,600);
      const lines=res.split("\n").filter((l:string)=>l.trim().length>5).slice(0,3);
      const newItems=lines.map((line:string)=>{
        const parts=line.replace(/^[\d\.\-\*]\s*/i,"").split("|").map((s:string)=>s.trim());
        const title=parts[0]||"Идея";
        const ch=parts[1]?.toLowerCase()||"";
        const channel=ch.includes("inst")?"instagram":ch.includes("теле")||ch.includes("telegram")?"telegram":ch.includes("блог")?"blog":ch.includes("ютуб")||ch.includes("youtube")?"youtube":"blog";
        const brief=parts[2]||"";
        return {id:uid(),title,channel,type:"post",status:"draft",brief,scheduledDate:"",strategyStepId:"",strategyStepTitle:"",createdAt:Date.now()};
      });
      const list=[...items,...newItems];
      setItems(list);
      await saveContentPlan(projectId,list);
    }catch{}
    setAiSuggesting(false);
  }

  function openNewPublication(presetDate=""){
    setNewItemPresetDate(presetDate);
    setEditId("new");
  }

  const editingItem=editId?items.find((x:any)=>x.id===editId):null;

  function ContentMap({filtered,CHANNEL_LABEL,CONTENT_TYPES,CONTENT_STATUSES,setEditId,removeItem,t,isMobile}:any){
    return(
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:20,padding:"4px 0"}} role="region" aria-label={t("content_map_aria","Карточки публикаций")}>
        {filtered.map((it:any)=>(
          <div key={it.id} className="glass-card btn-interactive sa-cp-card" role="button" tabIndex={0}
            aria-label={t("content_card_open_aria","Открыть публикацию: {title}").replace("{title}",String(it.title||t("untitled","Без названия")).slice(0,120))}
            onClick={()=>setEditId(it.id)}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setEditId(it.id);}}}
            style={{padding:"20px 18px",borderRadius:16,border:"1px solid var(--glass-border-accent,var(--border))",cursor:"pointer",display:"flex",flexDirection:"column",gap:10,minHeight:120,transition:"transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease",position:"relative",outline:"none"}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}} title={it.title}>{it.title||t("untitled","Без названия")}</div>
            <div style={{fontSize:12,color:"var(--text4)",display:"flex",gap:8,flexWrap:"wrap",marginTop:"auto"}}>
              <span>{t(CONTENT_TYPES.find((x:any)=>x.id===it.type)?.labelKey||"content_type_post",CONTENT_TYPES.find((x:any)=>x.id===it.type)?.fb||"Пост")}</span>
              <span>·</span>
              <span>{CHANNEL_LABEL[it.channel]||it.channel}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,gap:8}}>
              <div style={{padding:"4px 10px",borderRadius:8,background:it.status==="published"?"rgba(16,185,129,.12)":it.status==="scheduled"?"var(--accent-soft)":"var(--surface2)",color:it.status==="published"?"#12c482":it.status==="scheduled"?"var(--accent-1)":"var(--text3)",fontSize:11.5,fontWeight:700}}>
                {t(CONTENT_STATUSES.find((x:any)=>x.id===it.status)?.labelKey||"content_status_draft",CONTENT_STATUSES.find((x:any)=>x.id===it.status)?.fb||"Черновик")}
              </div>
              <button type="button" className="btn-interactive" onClick={e=>{e.stopPropagation();removeItem(it.id);}} title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",String(it.title||"").slice(0,80))} style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:12,flexShrink:0}}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function ContentCalendar({filtered,CHANNEL_LABEL,CONTENT_TYPES,CONTENT_STATUSES,setEditId,removeItem,t,isMobile,cpCalendarDate,setCpCalendarDate,openNewPublication,theme,lang}:any){
    const loc=lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru-RU";
    const selectedKey=dateToYMD(cpCalendarDate);
    const forSelected=filtered.filter((it:any)=>(it.scheduledDate||"")===selectedKey);
    const nodate=filtered.filter((it:any)=>!(it.scheduledDate||""));
    const otherDates=[...new Set(filtered.map((it:any)=>it.scheduledDate).filter(Boolean))].filter((d:string)=>d!==selectedKey).sort();
    const byDate:Record<string,any[]>={};
    otherDates.forEach((d:string)=>{byDate[d]=filtered.filter((it:any)=>(it.scheduledDate||"")===d);});
    const fmtDate=(s:string)=>s?new Date(s+"T12:00:00").toLocaleDateString(loc,{day:"numeric",month:"short",year:"numeric"}):"";
    const fmtLong=(d:Date)=>d.toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    function row(it:any){
      return(
        <div key={it.id} className="btn-interactive" role="button" tabIndex={0}
          aria-label={t("content_card_open_aria","Открыть публикацию: {title}").replace("{title}",String(it.title||t("untitled","Без названия")).slice(0,120))}
          style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",outline:"none"}}
          onClick={()=>setEditId(it.id)}
          onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setEditId(it.id);}}}
          onFocus={e=>{e.currentTarget.style.boxShadow="0 0 0 2px var(--accent-1)";}}
          onBlur={e=>{e.currentTarget.style.boxShadow="none";}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text)",marginBottom:2}}>{it.title||t("untitled","Без названия")}</div>
            <div style={{fontSize:12,color:"var(--text4)",display:"flex",gap:8,flexWrap:"wrap"}}>
              <span>{t(CONTENT_TYPES.find((x:any)=>x.id===it.type)?.labelKey||"content_type_post",CONTENT_TYPES.find((x:any)=>x.id===it.type)?.fb||"Пост")}</span>
              <span>·</span>
              <span>{CHANNEL_LABEL[it.channel]||it.channel}</span>
              {it.strategyStepTitle&&<><span>·</span><span style={{color:"var(--accent-1)"}}>↗ {it.strategyStepTitle}</span></>}
            </div>
          </div>
          <div style={{padding:"4px 10px",borderRadius:8,background:it.status==="published"?"rgba(16,185,129,.12)":it.status==="scheduled"?"var(--accent-soft)":"var(--surface2)",color:it.status==="published"?"#12c482":it.status==="scheduled"?"var(--accent-1)":"var(--text3)",fontSize:12,fontWeight:700}}>
            {t(CONTENT_STATUSES.find((x:any)=>x.id===it.status)?.labelKey||"content_status_draft",CONTENT_STATUSES.find((x:any)=>x.id===it.status)?.fb||"Черновик")}
          </div>
          <button type="button" className="btn-interactive" onClick={e=>{e.stopPropagation();removeItem(it.id);}} title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",String(it.title||"").slice(0,80))} style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:12,flexShrink:0}}>🗑</button>
        </div>
      );
    }
    return(
      <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:20,alignItems:"flex-start"}}>
        <div style={{flexShrink:0,width:"100%",maxWidth:360}}>
          <GlassCalendar
            selectedDate={cpCalendarDate}
            onDateSelect={(d:Date)=>setCpCalendarDate(d)}
            lang={lang}
            theme={theme==="dark"?"dark":"light"}
            labels={{
              weekly:t("cp_cal_weekly","Неделя"),
              monthly:t("cp_cal_monthly","Месяц"),
              addNote:t("cp_cal_add_note","Заметка…"),
              newEvent:t("cp_cal_new_event","Событие"),
            }}
            onNewNote={()=>openNewPublication(dateToYMD(cpCalendarDate))}
            onNewEvent={()=>openNewPublication(dateToYMD(cpCalendarDate))}
          />
        </div>
        <div style={{flex:1,minWidth:0,width:"100%",display:"flex",flexDirection:"column",gap:16}}>
          <div className="glass-card" style={{padding:isMobile?"14px 14px":"18px 20px"}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--accent-1)",marginBottom:12}}>📅 {fmtLong(cpCalendarDate)}</div>
            {forSelected.length===0?(
              <div style={{fontSize:12.5,color:"var(--text5)",lineHeight:1.5}}>{t("cp_cal_empty_day","Нет публикаций на этот день")}</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>{forSelected.map((it:any)=>row(it))}</div>
            )}
          </div>
          {nodate.length>0&&(
            <div className="glass-card" style={{padding:isMobile?"14px 14px":"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text4)",marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>📋 {t("content_no_date","Без даты")}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>{nodate.map((it:any)=>row(it))}</div>
            </div>
          )}
          {otherDates.map((d:string)=>(
            <div key={d} className="glass-card" style={{padding:isMobile?"14px 14px":"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--accent-1)",marginBottom:12}}>📅 {fmtDate(d)}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>{(byDate[d]||[]).map((it:any)=>row(it))}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ContentTree(){
    // root → channel → status → items
    const byChannel:any = {};
    filtered.forEach((it:any)=>{
      const ch=it.channel||"blog";
      const st=it.status||"draft";
      byChannel[ch] ||= {};
      byChannel[ch][st] ||= [];
      byChannel[ch][st].push(it);
    });
    const channelOrder=["blog","telegram","instagram","vk","youtube","email"];
    const statusOrder=["draft","scheduled","published"];
    const channels = channelOrder.filter(ch=>byChannel[ch]).concat(Object.keys(byChannel).filter(ch=>!channelOrder.includes(ch)));
    if(channels.length===0) return null;

    return(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="glass-card" style={{padding:isMobile?"14px 14px":"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>🌳 {t("content_tree_title","Дерево контент‑плана")}</div>
            <div style={{fontSize:12,color:"var(--text4)",marginTop:2}}>{t("content_tree_hint","Проект → канал → статус → публикации. Нажмите на карточку, чтобы редактировать.")}</div>
          </div>
          <button type="button" className="btn-interactive" onClick={()=>openNewPublication()} title={t("add_content_item_tip","Новая запись в плане")} style={{padding:"8px 14px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:12.5,fontWeight:800,whiteSpace:"nowrap",boxShadow:"0 2px 12px var(--accent-glow)"}}>
            {t("add_content_item","+ Публикация")}
          </button>
        </div>

        {channels.map((ch:string,ci:number)=>(
          <div key={ch} className="glass-card list-item-in" style={{padding:isMobile?"12px 12px":"14px 16px",animationDelay:`${ci*0.05}s`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:"var(--accent-1)",boxShadow:"0 0 0 3px var(--accent-soft)"}}/>
                <div style={{fontSize:13.5,fontWeight:900,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{CHANNEL_LABEL[ch]||ch}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:12,color:"var(--text5)",fontWeight:700}}>{t("content_tree_count","{n} шт.").replace("{n}",String(Object.values(byChannel[ch]).reduce((s:any,a:any)=>s+(a?.length||0),0)))}</div>
                <button type="button" className="btn-interactive" aria-expanded={!treeCollapsed.channels[ch]} aria-label={treeCollapsed.channels[ch]?t("content_tree_expand_ch","Развернуть канал {ch}").replace("{ch}",CHANNEL_LABEL[ch]||ch):t("content_tree_collapse_ch","Свернуть канал {ch}").replace("{ch}",CHANNEL_LABEL[ch]||ch)} onClick={(e)=>{e.preventDefault();e.stopPropagation();setTreeCollapsed(p=>({channels:{...p.channels,[ch]:!p.channels[ch]},statuses:p.statuses}));}} style={{padding:"6px 10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:800,minWidth:36}}>
                  {treeCollapsed.channels[ch]?"▸":"▾"}
                </button>
              </div>
            </div>

            {!treeCollapsed.channels[ch]&&(
              <div className="collapse-wrap collapse-in" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,minmax(0,1fr))",gap:10}}>
                {statusOrder.filter(st=>byChannel[ch][st]?.length).map((st:string,si:number)=>{
                  const statusKey=`${ch}:${st}`;
                  const collapsed=!!treeCollapsed.statuses[statusKey];
                  return(
                    <div key={st} style={{borderRadius:14,border:"1px solid var(--glass-border-accent,var(--border))",background:"rgba(255,255,255,.02)",padding:"10px 10px 12px",boxShadow:"var(--glass-shadow-accent,none)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:900,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{STATUS_LABEL[st]||st}</div>
                          <button type="button" className="btn-interactive" aria-expanded={!collapsed} aria-label={collapsed?t("content_tree_expand_st","Развернуть: {st}").replace("{st}",STATUS_LABEL[st]||st):t("content_tree_collapse_st","Свернуть: {st}").replace("{st}",STATUS_LABEL[st]||st)} onClick={(e)=>{e.preventDefault();e.stopPropagation();setTreeCollapsed(p=>({channels:p.channels,statuses:{...p.statuses,[statusKey]:!p.statuses[statusKey]}}));}} style={{padding:"4px 8px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:12,fontWeight:900,flexShrink:0,minWidth:32}}>
                            {collapsed?"▸":"▾"}
                          </button>
                        </div>
                        <div style={{fontSize:12,color:"var(--text5)",fontWeight:800}}>{byChannel[ch][st].length}</div>
                      </div>
                      {!collapsed&&(
                        <div className="collapse-wrap collapse-in" style={{display:"flex",flexDirection:"column",gap:8}}>
                          {byChannel[ch][st].slice(0,treeExpandedAll[statusKey]?999:(isMobile?6:8)).map((it:any,ii:number)=>(
                            <button key={it.id} type="button" className="btn-interactive" onClick={()=>setEditId(it.id)} aria-label={t("content_card_open_aria","Открыть публикацию: {title}").replace("{title}",String(it.title||t("untitled","Без названия")).slice(0,120))} style={{textAlign:"left",padding:"10px 12px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",cursor:"pointer",width:"100%"}}>
                              <div style={{fontSize:12.5,fontWeight:900,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.title||t("untitled","Без названия")}</div>
                              <div style={{fontSize:11.5,color:"var(--text4)",display:"flex",gap:8,flexWrap:"wrap",lineHeight:1.4}}>
                                {it.scheduledDate&&<span>📅 {it.scheduledDate}</span>}
                                {it.strategyStepTitle&&<span style={{color:"var(--accent-1)"}}>↗ {it.strategyStepTitle}</span>}
                                {it.brief&&<span style={{opacity:.9}}>{it.brief.slice(0,64)}{it.brief.length>64?"…":""}</span>}
                              </div>
                            </button>
                          ))}
                          {byChannel[ch][st].length>(isMobile?6:8)&&!treeExpandedAll[statusKey]&&(
                            <button type="button" className="btn-interactive" onClick={(e)=>{e.stopPropagation();setTreeExpandedAll(p=>({...p,[statusKey]:true}));}} title={t("content_show_all_tip","Показать все публикации в этой группе")} style={{fontSize:12,color:"var(--accent-1)",padding:"8px 10px",borderRadius:8,border:"1px dashed var(--border2)",background:"var(--surface2)",cursor:"pointer",fontWeight:700,textAlign:"left",width:"100%"}}>
                              {t("content_show_all","Показать все")} (+{byChannel[ch][st].length-(isMobile?6:8)})
                            </button>
                          )}
                        </div>
                      )}
                      {collapsed&&(
                        <div style={{fontSize:12.5,color:"var(--text5)",padding:"2px 6px"}}>{t("content_more","Ещё")}: {byChannel[ch][st].length}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const viewModes:[typeof viewMode,string,string][]=[
    ["calendar","📅",t("content_view_calendar","Календарь")],
    ["map","🗺",t("content_view_map","Карта")],
    ["tree","🌳",t("content_view_tree","Дерево")],
    ["list","≡",t("content_view_list","Список")],
  ];
  const viewTips:Record<string,string>={
    calendar:t("content_view_tip_calendar","По датам публикации и без даты"),
    map:t("content_view_tip_map","Карточки по каналам и типам"),
    tree:t("content_view_tip_tree","Иерархия канал → статус"),
    list:t("content_view_tip_list","Компактный список со статусами"),
  };

  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:4}}>✍️ {t("content_plan","Контент-план")}</div>
        <div style={{fontSize:13,color:"var(--text4)",lineHeight:1.45}}>{t("content_plan_intro","Планируйте посты, видео и рассылки. Переключайте вид: календарь по датам, по каналам или список.")}</div>
      </div>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 220px",minWidth:0}}>
          <div style={{fontSize:11,fontWeight:800,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.06,marginBottom:8}}>{t("content_view_group_label","Как показать план")}</div>
          <div role="tablist" aria-label={t("content_view_group_aria","Режим отображения контент-плана")} style={{display:"flex",gap:6,padding:4,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface2)",flexWrap:isMobile?"nowrap":"wrap",overflowX:isMobile?"auto":"visible",WebkitOverflowScrolling:"touch",maxWidth:"100%"}}>
            {viewModes.map(([id,icon,label])=>(
              <button key={id} type="button" role="tab" aria-selected={viewMode===id} aria-pressed={viewMode===id} title={viewTips[id]} onClick={()=>setViewMode(id)} className="btn-interactive" style={{padding:isMobile?"8px 12px":"7px 12px",borderRadius:10,border:"none",background:viewMode===id?"var(--accent-soft)":"transparent",color:viewMode===id?"var(--accent-1)":"var(--text4)",cursor:"pointer",fontSize:isMobile?11.5:12,fontWeight:800,whiteSpace:"nowrap",flexShrink:0,boxShadow:viewMode===id?"inset 0 0 0 1px var(--glass-border-accent,var(--border))":"none"}}>
                <span aria-hidden>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:isMobile?"stretch":"flex-end",flex:"0 1 auto"}}>
          <div style={{fontSize:11,fontWeight:800,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.06,alignSelf:isMobile?"flex-start":"flex-end"}}>{t("content_actions_label","Действия")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:isMobile?"stretch":"flex-end"}}>
            {allNodes.length>0?(
              <button type="button" onClick={aiSuggest} disabled={aiSuggesting} title={t("content_ai_suggest_tip","Сгенерировать идеи из названий шагов на картах")} style={{padding:"8px 14px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-1)",cursor:aiSuggesting?"wait":"pointer",fontSize:13,fontWeight:700,opacity:aiSuggesting?.85:1}}>
                {aiSuggesting?"…":t("content_ai_suggest","✨ Предложить по стратегии")}
              </button>
            ):(
              <button type="button" disabled title={t("content_ai_suggest_disabled","Сначала добавьте шаги на картах проекта — тогда AI сможет предложить темы")} style={{padding:"8px 14px",borderRadius:10,border:"1px dashed var(--border2)",background:"var(--surface)",color:"var(--text5)",cursor:"not-allowed",fontSize:12.5,fontWeight:600,textAlign:"left",maxWidth:280}}>
                {t("content_ai_suggest_need_steps","✨ AI: нужны шаги на карте")}
              </button>
            )}
            <button type="button" className="btn-interactive" onClick={()=>openNewPublication()} title={t("add_content_item_tip","Новая запись в плане: пост, рассылка, видео…")} style={{padding:"8px 18px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("add_content_item","+ Публикация")}</button>
          </div>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:800,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.06,marginBottom:8}}>{t("content_filter_status_label","Фильтр по статусу")}</div>
        <div role="group" aria-label={t("content_filter_status_aria","Статус публикации")} style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["all",...CONTENT_STATUSES.map(s=>s.id)].map(s=>(
            <button key={s} type="button" aria-pressed={filterStatus===s} onClick={()=>setFilterStatus(s)} style={{padding:"7px 14px",borderRadius:10,border:`1px solid ${filterStatus===s?"var(--accent-1)":"var(--border)"}`,background:filterStatus===s?"var(--accent-soft)":"var(--surface)",color:filterStatus===s?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:12.5,fontWeight:filterStatus===s?800:600,transition:"border-color .15s, background .15s"}}>
              {s==="all"?t("all_statuses","Все"):t(CONTENT_STATUSES.find(x=>x.id===s)?.labelKey||"",CONTENT_STATUSES.find(x=>x.id===s)?.fb||s)}
            </button>
          ))}
        </div>
      </div>
      {loading?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {[1,2,3].map(i=><div key={i} style={{height:100,borderRadius:14,background:"var(--surface)",animation:"pulse 1.5s ease infinite",border:"1px solid var(--border)"}}/>)}
        </div>
      ):filtered.length===0&&items.length>0?(
        <div className="glass-card" style={{textAlign:"center",padding:"40px 24px",border:"1px dashed var(--border2)",borderRadius:16}}>
          <div style={{fontSize:32,marginBottom:8}}>🔍</div>
          <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:6}}>{t("content_filter_empty_title","Нет публикаций с таким статусом")}</div>
          <div style={{fontSize:13,color:"var(--text5)",marginBottom:18,maxWidth:360,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>{t("content_filter_empty_desc","Смените фильтр или добавьте публикацию в нужном статусе.")}</div>
          <button type="button" className="btn-interactive" onClick={()=>setFilterStatus("all")} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("content_filter_reset","Показать все статусы")}</button>
        </div>
      ):filtered.length===0?(
        <div className="glass-card" style={{textAlign:"center",padding:"44px 24px",border:"1px dashed var(--border2)",borderRadius:16}}>
          <div style={{fontSize:36,marginBottom:10}}>✍️</div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("content_plan_empty_title","Планируйте публикации")}</div>
          <div style={{fontSize:13,color:"var(--text5)",marginBottom:16,maxWidth:320,margin:"0 auto 16px",lineHeight:1.5}}>{t("content_plan_empty_desc","Добавьте посты, видео и рассылки. AI предложит идеи на основе шагов вашей стратегии.")}</div>
          <button type="button" className="btn-interactive" onClick={()=>openNewPublication()} style={{padding:"10px 22px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("add_content_item","+ Публикация")}</button>
        </div>
      ):(
        viewMode==="calendar"
          ? <ContentCalendar filtered={filtered} CHANNEL_LABEL={CHANNEL_LABEL} CONTENT_TYPES={CONTENT_TYPES} CONTENT_STATUSES={CONTENT_STATUSES} setEditId={setEditId} removeItem={removeItem} t={t} isMobile={isMobile} cpCalendarDate={cpCalendarDate} setCpCalendarDate={setCpCalendarDate} openNewPublication={openNewPublication} theme={theme} lang={lang}/>
          : viewMode==="map"
          ? <ContentMap filtered={filtered} CHANNEL_LABEL={CHANNEL_LABEL} CONTENT_TYPES={CONTENT_TYPES} CONTENT_STATUSES={CONTENT_STATUSES} setEditId={setEditId} removeItem={removeItem} t={t} isMobile={isMobile}/>
          : viewMode==="tree"
          ? <ContentTree/>
          : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtered.map((it:any,i:number)=>(
                <div key={it.id} className="glass-card list-item-in" style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",animationDelay:`${i*0.04}s`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>{it.title||t("untitled","Без названия")}</div>
                    <div style={{fontSize:12,color:"var(--text4)",display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span>{t(CONTENT_TYPES.find(x=>x.id===it.type)?.labelKey||"content_type_post",CONTENT_TYPES.find(x=>x.id===it.type)?.fb||"Пост")}</span>
                      <span>·</span>
                      <span>{t(CONTENT_CHANNELS.find(x=>x.id===it.channel)?.labelKey||"content_channel_blog",CONTENT_CHANNELS.find(x=>x.id===it.channel)?.fb||"Блог")}</span>
                      {it.scheduledDate&&<><span>·</span><span>{it.scheduledDate}</span></>}
                      {it.strategyStepTitle&&<><span>·</span><span style={{color:"var(--accent-1)"}}>↗ {it.strategyStepTitle}</span></>}
                    </div>
                  </div>
                  <div style={{padding:"4px 10px",borderRadius:8,background:it.status==="published"?"rgba(16,185,129,.12)":it.status==="scheduled"?"var(--accent-soft)":"var(--surface2)",border:`1px solid ${it.status==="published"?"rgba(16,185,129,.3)":it.status==="scheduled"?"var(--glass-border-accent,var(--border))":"var(--border)"}`,color:it.status==="published"?"#12c482":it.status==="scheduled"?"var(--accent-1)":"var(--text3)",fontSize:12,fontWeight:700}}>
                    {t(CONTENT_STATUSES.find(x=>x.id===it.status)?.labelKey||"content_status_draft",CONTENT_STATUSES.find(x=>x.id===it.status)?.fb||"Черновик")}
                  </div>
                  <button type="button" onClick={()=>setEditId(it.id)} className="btn-interactive" title={t("edit","Редактировать")} aria-label={t("content_edit_item_aria","Редактировать: {title}").replace("{title}",(it.title||t("untitled","Без названия")).slice(0,80))} style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:12,fontWeight:700}}>✏️</button>
                  <button type="button" onClick={()=>removeItem(it.id)} className="btn-interactive" title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",(it.title||"").slice(0,80))} style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:12,fontWeight:800}}>🗑</button>
                </div>
              ))}
            </div>
          )
      )}

      {(editId==="new"||editingItem)&&(
        <ContentPlanItemModal
          formKey={editId||""}
          item={editingItem||{title:"",type:"post",channel:"blog",status:"draft",brief:"",scheduledDate:newItemPresetDate||"",strategyStepId:"",strategyStepTitle:""}}
          allNodes={allNodes}
          t={t}
          theme={theme}
          onSave={(item)=>saveItem(editId==="new"?{...item,createdAt:Date.now()}:{...editingItem,...item})}
          onClose={()=>setEditId(null)}
        />
      )}

      {pendingDeleteId&&(
        <ConfirmDialog
          title={t("content_delete_confirm_title","Удалить из контент-плана?")}
          message={t("content_delete_confirm_msg","Запись «{title}» будет удалена без восстановления.").replace("{title}",String((items.find((x:any)=>x.id===pendingDeleteId)?.title)||t("untitled","Без названия")).slice(0,120))}
          confirmLabel={t("delete","Удалить")}
          onConfirm={confirmRemoveItem}
          onCancel={()=>setPendingDeleteId(null)}
          danger={true}
        />
      )}
    </div>
  );
}

function ContentPlanItemModal({formKey,item,allNodes,t,theme,onSave,onClose}:{formKey:string;item:any;allNodes:any[];t:(k:string,fb?:string)=>string;theme:string;onSave:(item:any)=>void;onClose:()=>void}){
  const [title,setTitle]=useState(item.title||"");
  const [type,setType]=useState(item.type||"post");
  const [channel,setChannel]=useState(item.channel||"blog");
  const [status,setStatus]=useState(item.status||"draft");
  const [brief,setBrief]=useState(item.brief||"");
  const [scheduledDate,setScheduledDate]=useState(item.scheduledDate||"");
  const [stepId,setStepId]=useState(item.strategyStepId||"");
  const [dirty,setDirty]=useState(false);
  const [showDiscard,setShowDiscard]=useState(false);
  useEffect(()=>{
    setTitle(item.title||"");
    setType(item.type||"post");
    setChannel(item.channel||"blog");
    setStatus(item.status||"draft");
    setBrief(item.brief||"");
    setScheduledDate(item.scheduledDate||"");
    setStepId(item.strategyStepId||"");
    setDirty(false);
  },[formKey,item?.id]);
  const stepOptions=allNodes.map((n:any)=>({id:n.id,title:n.title,mapName:n.mapName}));
  function requestClose(){
    if(dirty){setShowDiscard(true);return;}
    onClose();
  }
  function handleSave(){
    const stepTitle=stepOptions.find((s:any)=>s.id===stepId)?.title||"";
    onSave({title:title.trim()||"Без названия",type,channel,status,brief,scheduledDate,strategyStepId:stepId||"",strategyStepTitle:stepTitle});
  }
  return(
    <>
    <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.7))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(12px)",padding:16}} onClick={e=>{if(e.target===e.currentTarget)requestClose();}}>
      <div className="glass-panel glass-panel-lg" data-theme={theme} style={{width:"min(96vw,440px)",maxHeight:"90vh",overflowY:"auto",borderRadius:20,padding:"24px"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:18}}>✍️ {item.id?t("edit","Редактировать"):t("add_content_item","Публикация")}</div>
        <input placeholder={t("title","Название")} value={title} onChange={e=>{setTitle(e.target.value);setDirty(true);}} style={{width:"100%",padding:"10px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",marginBottom:10,outline:"none",fontFamily:"inherit"}}/>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("content_label_type","Тип контента")}</div>
        <div style={{marginBottom:12}}>
          <PillGroup items={CONTENT_TYPES} value={type} onChange={(v)=>{setType(v);setDirty(true);}} ariaLabel={t("content_label_type","Тип контента")}/>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("content_label_channel","Канал публикации")}</div>
        <div style={{marginBottom:12}}>
          <PillGroup items={CONTENT_CHANNELS} value={channel} onChange={(v)=>{setChannel(v);setDirty(true);}} ariaLabel={t("content_label_channel","Канал публикации")}/>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("content_label_status","Статус")}</div>
        <div style={{marginBottom:12}}>
          <PillGroup items={CONTENT_STATUSES} value={status} onChange={(v)=>{setStatus(v);setDirty(true);}} ariaLabel={t("content_label_status","Статус")}/>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("scheduled_date_short","Дата публикации")}</div>
        <input type="date" value={scheduledDate} onChange={e=>{setScheduledDate(e.target.value);setDirty(true);}} style={{width:"100%",padding:"10px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",marginBottom:12,outline:"none",fontFamily:"inherit"}}/>
        {stepOptions.length>0&&(
          <>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("content_link_step","Связать с шагом стратегии")}</div>
            <select value={stepId} onChange={e=>{setStepId(e.target.value);setDirty(true);}} style={{width:"100%",padding:"10px 14px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",marginBottom:12,outline:"none",fontFamily:"inherit"}}>
              <option value="">— Не привязан</option>
              {stepOptions.map((s:any)=>(<option key={s.id} value={s.id}>{s.title} {s.mapName?`(${s.mapName})`:""}</option>))}
            </select>
          </>
        )}
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("brief","Тезис / описание")}</div>
        <textarea placeholder={t("brief","Краткое описание или тезис публикации")} value={brief} onChange={e=>{setBrief(e.target.value);setDirty(true);}} rows={3} style={{width:"100%",padding:"10px 14px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",marginBottom:18,outline:"none",resize:"vertical",fontFamily:"inherit"}}/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
          <button type="button" onClick={requestClose} className="btn-interactive" style={{padding:"10px 20px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("cancel","Отмена")}</button>
          <button type="button" onClick={handleSave} className="btn-interactive" style={{padding:"10px 22px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("save","Сохранить")}</button>
        </div>
      </div>
    </div>
    {showDiscard&&(
      <ConfirmDialog
        title={t("content_discard_title","Закрыть без сохранения?")}
        message={t("content_discard_msg","Изменения в публикации будут потеряны.")}
        confirmLabel={t("discard","Не сохранять")}
        danger={false}
        onConfirm={()=>{setShowDiscard(false);onClose();}}
        onCancel={()=>setShowDiscard(false)}
      />
    )}
    </>
  );
}

// ── ProjectDetail ──
function ProjectDetail({user,project,onBack,onOpenMap,onProfile,theme,onToggleTheme,onChangeTier,onUpgrade,onOpenContentPlanHub,onOpenContentPlanProject,aiChatMsgs,aiChatSetMsgs}){
  const{t,lang}=useLang();
  const isMobile=useIsMobile();
  const[maps,setMaps]=useState<MapLite[]>([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState<"maps"|"scenarios"|"content"|"ai"|"team"|"settings">("maps");
  const[proj,setProj]=useState<ProjectLite>(project);
  const[newMember,setNewMember]=useState("");
  const[nmRole,setNmRole]=useState("editor");
  const[showTmpls,setShowTmpls]=useState(false);
  const[showScChoice,setShowScChoice]=useState(false);
  const[showScTmpls,setShowScTmpls]=useState(false);
  const[projCtx,setProjCtx]=useState("");
  const[toast,setToast]=useState<{msg:string;type:string}|null>(null);
  const[delMapId,setDelMapId]=useState<string|null>(null);
  const[delProjConfirm,setDelProjConfirm]=useState(false);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  const creatingRef=useRef(false);

  const tier=TIERS[user.tier]||TIERS.free;
  const isOwner=proj.owner===user.email;
  const myRole=proj.members?.find(m=>m.email===user.email)?.role||"owner";
  const canEdit=myRole==="owner"||myRole==="editor";

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const ms=await getMaps(proj.id);
    setMaps(ms);
    const first=ms.find(m=>!m.isScenario);
    if(first?.ctx)setProjCtx(first.ctx);
    setLoading(false);
  }

  async function createMap(tmpl=null){
    if(creatingRef.current)return;
    creatingRef.current=true;
    try{
      const cur=await getMaps(proj.id);
      const reg=cur.filter(m=>!m.isScenario);
      if(reg.length>=tier.maps){setToast({msg:t("map_limit_tier","Лимит карт для {tier}: {n}").replace("{tier}",tier.label).replace("{n}",String(fmt(tier.maps))),type:"warn"});return;}
      const map={id:uid(),name:tmpl?tmpl.name:t("map_default_n","Карта {n}").replace("{n}",String(reg.length+1)),nodes:tmpl?.nodes||[],edges:tmpl?.edges||[],ctx:"",isScenario:false,createdAt:Date.now()};
      const saved=await saveMap(proj.id,map);
      if(tmpl){await load();setToast({msg:t("template_applied","Шаблон «{name}» применён!").replace("{name}",tmpl.name),type:"success"});}
      else onOpenMap(saved,proj,true,myRole==="viewer");
    }finally{creatingRef.current=false;}
  }

  async function createBlankScenario(){
    setShowScChoice(false);
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    const map={id:uid(),name:t("scenario_default_n","Сценарий {n}").replace("{n}",String(sc.length+1)),nodes:[],edges:[],ctx:"",isScenario:true,createdAt:Date.now()};
    const saved=await saveMap(proj.id,map);
    onOpenMap(saved,proj,true,myRole==="viewer");
  }

  async function createScenarioFromTemplate(parsed){
    setShowScTmpls(false);setShowScChoice(false);
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    const name=parsed.scenarioName?`${parsed.scenarioIcon} ${parsed.scenarioName}`:t("scenario_default_n","Сценарий {n}").replace("{n}",String(sc.length+1));
    const map={id:uid(),name,nodes:parsed.nodes||[],edges:parsed.edges||[],ctx:"",isScenario:true,createdAt:Date.now()};
    const saved=await saveMap(proj.id,map);
    await load();
    setToast({msg:t("scenario_created","Сценарий «{name}» создан!").replace("{name}",name),type:"success"});
    onOpenMap(saved,proj,false,myRole==="viewer");
  }

  async function tryCreateScenario(){
    if(tier.scenarios===0){setToast({msg:t("scenarios_pro","Сценарии доступны с Pro"),type:"warn"});return;}
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    if(sc.length>=tier.scenarios){setToast({msg:t("scenario_limit","Лимит сценариев для тарифа")+" "+tier.label+": "+fmt(tier.scenarios),type:"warn"});return;}
    setShowScChoice(true);
  }

  async function delMap(id){setDelMapId(id);}
  async function doDelMap(){
    if(!delMapId)return;
    await deleteMap(proj.id,delMapId);
    await load();
    setDelMapId(null);
  }

  async function addMember(){
    if(!newMember.trim())return;
    if((proj.members||[]).length>=tier.users){setToast({msg:t("members_limit","Лимит участников: {n}").replace("{n}",String(tier.users)),type:"warn"});return;}
    if(proj.members?.find(m=>m.email===newMember.trim())){setToast({msg:t("member_added_already","Участник уже добавлен"),type:"info"});return;}
    if(API_BASE){
      const updated=await addProjectMember(proj.id,newMember.trim(),nmRole);
      if(updated){setProj(updated);setNewMember("");setToast({msg:t("member_added","Участник добавлен"),type:"success"});}
      else setToast({msg:t("member_add_err","Ошибка добавления"),type:"error"});
    }else{
      const updated={...proj,members:[...(proj.members||[]),{email:newMember.trim(),role:nmRole}]};
      await saveProject(updated);setProj(updated);setNewMember("");
    }
  }

  async function removeMember(email){
    if(email===proj.owner)return;
    if(API_BASE){
      const updated=await removeProjectMember(proj.id,email);
      if(updated)setProj(updated);
    }else{
      const updated={...proj,members:(proj.members||[]).filter(m=>m.email!==email)};
      await saveProject(updated);setProj(updated);
    }
  }

  const regularMaps=maps.filter(m=>!m.isScenario);
  const scenarios=maps.filter(m=>m.isScenario);

  // Stats
  const allNodes=maps.flatMap(m=>m.nodes||[]);
  const allEdges=maps.flatMap(m=>m.edges||[]);
  const totalNodes=allNodes.length;
  const doneNodes=allNodes.filter(n=>n.status==="completed").length;
  const avgProgress=totalNodes?Math.round(allNodes.reduce((s,n)=>s+(n.progress||0),0)/totalNodes):0;
  const overdueCount=allNodes.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;

  function MapCard({m,isSc,staggerIndex=0}){
    const ns=m.nodes||[];
    const done=ns.filter(n=>n.status==="completed").length;
    const prog=ns.length?Math.round(ns.reduce((s,n)=>s+(n.progress||0),0)/ns.length):0;
    const overdue=ns.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;
    return(
      <div className={"card-stagger sa-map-card"+(isSc?" sa-map-card--sc":"")} style={{padding:"20px 22px",cursor:"pointer",animationDelay:`${staggerIndex*0.05}s`,borderColor:isSc?"rgba(104,54,245,.35)":undefined}}
        onClick={()=>onOpenMap(m,proj,false,myRole==="viewer")}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:"var(--accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:"1px solid var(--glass-border-accent,var(--border))"}}>
            {isSc?"⎇":"🗺️"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name||t("untitled","Без названия")}</div>
            <div style={{fontSize:13.5,color:"var(--text5)"}}>{ns.length} {t("steps_label","шагов")} • {t("updated_label","обновлено")} {(m as any).updatedAt?new Date((m as any).updatedAt).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"short"}):"—"}</div>
          </div>
          {canEdit&&<button className="sa-map-card__del" onClick={e=>{e.stopPropagation();delMap(m.id);}} aria-label={t("confirm_delete_map","Удалить карту?")} style={{width:22,height:22,borderRadius:5,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .22s ease"}}>🗑</button>}
        </div>
        {ns.length>0&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:13,color:"var(--text5)"}}>{t("progress","Прогресс")}</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--text4)"}}>{prog}%</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:"var(--gradient-accent)",width:`${prog}%`,transition:"width .3s"}}/>
            </div>
          </div>
        )}
        {overdue>0&&<div style={{marginTop:7,fontSize:13.5,color:"var(--danger,#f04458)",fontWeight:600}}>⚠ {overdue} просрочено</div>}
      </div>
    );
  }

  return(
    <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} style={{minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",position:"relative",overflowX:"hidden"}}>
      <StrategyShellBg/>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
{toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      <div className="sa-app-topbar">
        <div className="atb-cluster" style={{minWidth:0,flex:isMobile?"1 1 100%":"1 1 auto",maxWidth:isMobile?"100%":"46%"}}>
          <button type="button" className="sa-back-ic" onClick={onBack} aria-label={t("back_btn","Назад")}>←</button>
          <div style={{minWidth:0}}>
            <div className="tb-title" style={{fontSize:isMobile?14:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.name||t("project_short","Проект")}</div>
            <div className="tb-sub">{t("pd_sub_maps","{n} карт").replace("{n}",String(regularMaps.length))} • {t("pd_sub_sc","{n} сцен.").replace("{n}",String(scenarios.length))} • {t("pd_sub_m","{n} уч.").replace("{n}",String((proj.members||[]).length))}</div>
          </div>
        </div>
        {!isMobile&&onOpenContentPlanHub&&(
          <div style={{flex:"1 1 180px",display:"flex",justifyContent:"center",minWidth:0}}>
            <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={false}/>
          </div>
        )}
        <div className="atb-cluster" style={{marginLeft:isMobile?"auto":undefined}}>
          <div className="tpill" onClick={onToggleTheme} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onToggleTheme();}} aria-label={t("toggle_theme","Тема")}>
            <div className={`tpi${theme==="dark"?" on":""}`}>☽</div>
            <div className={`tpi${theme==="light"?" on":""}`}>☀</div>
          </div>
          {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
          <button type="button" className="btn-ic" onClick={onProfile} title={t("profile_title","Профиль")} aria-label={t("profile_title","Профиль")} style={{fontSize:14,fontWeight:900}}>{(user.name||user.email||"U")[0].toUpperCase()}</button>
        </div>
      </div>
      {isMobile&&onOpenContentPlanHub&&(
        <div style={{padding:"10px 16px",borderBottom:".5px solid var(--b1)",background:"var(--top)",display:"flex",justifyContent:"center"}}>
          <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={true}/>
        </div>
      )}

      {totalNodes>0&&(
        <div className="sa-proj-stats sa-page-reveal sa-pr-d1">
          {[
            {label:"Шагов всего",val:totalNodes,color:"var(--acc)"},
            {label:"Завершено",val:`${doneNodes} (${totalNodes?Math.round(doneNodes/totalNodes*100):0}%)`,color:"var(--green)"},
            {label:t("avg_prog","Средний прогресс"),val:`${avgProgress}%`,color:"var(--acc2)"},
            ...(overdueCount>0?[{label:t("overdue","Просрочено"),val:overdueCount,color:"var(--red)"}]:[]),
          ].map(s=>(
            <div key={s.label} className="sps-block">
              <div className="sps-lbl">{s.label}</div>
              <div className="sps-val" style={{color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="sa-proj-tabs sa-page-reveal sa-pr-d2" role="tablist">
        {([
          ["maps",isMobile?`🗺 (${regularMaps.length})`:`🗺 ${t("pd_tab_maps","Карты")} (${regularMaps.length})`],
          ["scenarios",isMobile?`⎇ (${scenarios.length})`:`⎇ ${t("pd_tab_scenarios","Сценарии")} (${scenarios.length})`],
          ["content",isMobile?"✍️":"✍️ "+t("content_plan_tab","Контент-план")],
          ["ai",isMobile?"✦":"✦ "+t("project_ai_tab","AI")],
          ["team",isMobile?`👥 (${(proj.members||[]).length})`:`👥 ${t("pd_tab_team","Команда")} (${(proj.members||[]).length})`],
          ["settings","⚙ "+t("settings_title","Настройки")],
        ] as const).map(([k,lbl])=>(
          <button key={k} type="button" role="tab" aria-selected={tab===k} className={tab===k?"on":""} onClick={()=>setTab(k as any)}>{lbl}</button>
        ))}
      </div>

      <div className="sa-page-reveal sa-pr-d3" style={{maxWidth:1000,margin:"0 auto",padding:isMobile?"24px 20px":"36px 32px",flex:1}}>
        {/* Maps Tab */}
        {tab==="maps"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{flex:1,fontSize:13,fontWeight:700,color:"var(--text)"}}>{t("strategy_maps","Стратегические карты")}</div>
              {canEdit&&tier.templates&&<button onClick={()=>setShowTmpls(true)} style={{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:13,fontWeight:700}}>📋 Из шаблона</button>}
              {canEdit&&<button className="btn-interactive" onClick={()=>createMap()} style={{padding:"7px 16px",borderRadius:9,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>+ {t("new_map","Новая карта")}</button>}
            </div>
            {loading?(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {[1,2,3].map(i=><div key={i} style={{height:140,borderRadius:14,background:"var(--surface)",animation:"pulse 1.5s ease infinite",border:"1px solid var(--border)"}}/>)}
              </div>
            ):regularMaps.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed var(--border2)",borderRadius:16}}>
                <div style={{fontSize:36,marginBottom:10}}>🗺️</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("no_maps","Нет карт")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16,maxWidth:320,margin:"0 auto 16px"}}>{t("create_first_map","Создайте первую стратегическую карту")}. {t("create_first_map_hint","Добавьте шаги, свяжите их — AI подскажет следующий ход.")}</div>
                {canEdit&&<button className="btn-interactive" onClick={()=>createMap()} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 4px 18px var(--accent-glow)"}}>+ {t("create_map","Создать карту")}</button>}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:isMobile?16:20}}>
                {regularMaps.map((m,i)=><MapCard key={m.id} m={m} isSc={false} staggerIndex={i}/>)}
              </div>
            )}
          </div>
        )}

        {/* Scenarios Tab */}
        {tab==="scenarios"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Сценарии</div>
                <div style={{fontSize:13,color:"var(--text5)"}}>{t("alt_strategies","Альтернативные стратегии и планы «что если»")}</div>
              </div>
              {canEdit&&(
                tier.scenarios===0?(
                  <button onClick={()=>onUpgrade&&onUpgrade()} style={{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:13,fontWeight:700}}>🔒 Pro+</button>
                ):(
                  <button className="btn-interactive" onClick={tryCreateScenario} style={{padding:"7px 16px",borderRadius:9,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 2px 12px var(--accent-glow)"}}>+ {t("new_scenario","Новый сценарий")}</button>
                )
              )}
            </div>
            {tier.scenarios===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed rgba(104,54,245,.25)",borderRadius:16,background:"rgba(104,54,245,.03)"}}>
                <div style={{fontSize:36,marginBottom:10}}>⎇</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("scenarios_pro","Сценарии доступны с Pro")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16,maxWidth:300,margin:"0 auto 16px"}}>Создавайте альтернативные планы: «Что если потеряем ключевого клиента?» или «Что если вырастем ×3 за год?»</div>
                {onUpgrade&&<button className="btn-interactive" onClick={onUpgrade} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 4px 18px var(--accent-glow)"}}>{t("upgrade_to_pro","Перейти на Pro")}</button>}
              </div>
            ):scenarios.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed var(--border2)",borderRadius:16}}>
                <div style={{fontSize:36,marginBottom:10}}>⎇</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("no_scenarios","Нет сценариев")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16}}>{t("create_first_scenario","Создайте первый сценарий вручную или с помощью AI шаблонов")}</div>
                {canEdit&&<button className="btn-interactive" onClick={tryCreateScenario} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 4px 18px var(--accent-glow)"}}>+ {t("create_scenario","Создать сценарий")}</button>}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:isMobile?16:12}}>
                {scenarios.map((m,i)=><MapCard key={m.id} m={m} isSc={true} staggerIndex={i}/>)}
              </div>
            )}
          </div>
        )}

        {/* Content Plan Tab (Pro+) */}
        {tab==="content"&&(
          <div>
            {!tier.contentPlan?(
              <div className="glass-card" style={{textAlign:"center",padding:"50px 24px",border:"1px dashed var(--glass-border-accent,var(--border2))",borderRadius:16,background:"var(--accent-soft)"}}>
                <div style={{fontSize:36,marginBottom:10}}>✍️</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("content_plan_locked_title","Контент-план доступен на Pro")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16,maxWidth:360,margin:"0 auto 16px"}}>{t("content_plan_pro_only","Приложение использует знания о вашем бизнесе и стратегии для планирования постов.")}</div>
                {onUpgrade&&<button className="btn-interactive" onClick={onUpgrade} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 4px 18px var(--accent-glow)"}}>{t("upgrade_to_pro","Перейти на Pro")}</button>}
              </div>
            ):(
              <>
                {onOpenContentPlanProject&&(
                  <div className="glass-card" style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:14,padding:"14px 18px",borderRadius:14,border:"1px solid var(--glass-border-accent,var(--border))",background:"linear-gradient(135deg,var(--accent-soft),transparent)",marginBottom:20}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:4}}>{t("cp_workspace_banner_title","Отдельный раздел «Контент-план»")}</div>
                      <div style={{fontSize:12.5,color:"var(--text5)",lineHeight:1.45}}>{t("cp_workspace_banner_hint","Тот же план в полноэкранном режиме — как карта: удобно вести ленту и календарь без переключения вкладок.")}</div>
                    </div>
                    <button type="button" className="btn-interactive" onClick={()=>onOpenContentPlanProject(proj,maps)} style={{padding:"10px 18px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:800,whiteSpace:"nowrap",boxShadow:"0 2px 14px var(--accent-glow)",flexShrink:0}}>{t("cp_open_workspace","Открыть раздел →")}</button>
                  </div>
                )}
                <ContentPlanTab projectId={proj.id} projectName={proj.name||"Проект"} maps={maps} user={user} theme={theme} lang={lang} t={t} onChangeTier={onChangeTier}/>
              </>
            )}
          </div>
        )}

        {/* AI Tab */}
        {tab==="ai"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="glass-card" style={{padding:"14px 16px",borderRadius:14}}>
              <div style={{fontSize:14,fontWeight:900,color:"var(--text)",display:"flex",alignItems:"center",gap:10}}>
                <span style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--accent-on-bg)",boxShadow:"0 2px 12px var(--accent-glow)",fontWeight:900}}>✦</span>
                {t("project_ai_title","AI по проекту")}
              </div>
              <div style={{fontSize:13.5,color:"var(--text5)",marginTop:6}}>
                {t("project_ai_hint","Один и тот же чат, доступен и в карте. Здесь AI видит контекст всех карт проекта.")}
              </div>
            </div>
            <AiPanel
              embedded={true}
              isMobile={isMobile}
              nodes={allNodes}
              edges={allEdges}
              ctx={projCtx||""}
              tier={user?.tier||"free"}
              projectName={proj?.name||""}
              mapName={t("project_scope","Проект")}
              userName={user?.name||user?.email||""}
              msgs={aiChatMsgs||[]}
              onMsgsChange={aiChatSetMsgs||(()=>{})}
              onAddNode={()=>{}}
              onClose={()=>{}}
              externalMsgs={[]}
              onClearExternal={()=>{}}
              onError={(msg)=>setToast({msg,type:"error"})}
              statusMap={getSTATUS(t)}
            />
          </div>
        )}

        {/* Team Tab */}
        {tab==="team"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {(proj.members||[]).map(m=>(
              <div key={m.email} className="glass-card" style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,flexShrink:0,boxShadow:"0 2px 10px var(--accent-glow)"}}>{(m.email||"?")[0].toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.email}</div>
                  <div style={{fontSize:13.5,color:"var(--text5)"}}>{m.role==="owner"?t("role_owner","Владелец"):m.role==="editor"?t("role_editor","Редактор"):t("observer","Наблюдатель")}</div>
                </div>
                {isOwner&&m.email!==proj.owner&&(
                  <div style={{display:"flex",gap:6}}>
                    <select value={m.role} onChange={async e=>{const updated={...proj,members:(proj.members||[]).map(x=>x.email===m.email?{...x,role:e.target.value}:x)};await saveProject(updated);setProj(updated);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,cursor:"pointer"}}>
                      <option value="editor">{t("role_editor","Редактор")}</option>
                      <option value="viewer">{t("observer","Наблюдатель")}</option>
                    </select>
                    <button onClick={()=>removeMember(m.email)} style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#f04458",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                )}
              </div>
            ))}
            {isOwner&&(proj.members||[]).length<tier.users&&(
              <div className="glass-card" style={{display:"flex",gap:9,padding:"12px 16px",borderRadius:12,border:"1px dashed var(--glass-border-accent,var(--border2))"}}>
                <input value={newMember} onChange={e=>setNewMember(e.target.value)} placeholder="Email участника" onKeyDown={e=>{if(e.key==="Enter")addMember();}} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input-bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
                <select value={nmRole} onChange={e=>setNmRole(e.target.value)} style={{padding:"8px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13}}>
                  <option value="editor">{t("role_editor","Редактор")}</option>
                  <option value="viewer">{t("observer","Наблюдатель")}</option>
                </select>
                <button className="btn-interactive" onClick={addMember} style={{padding:"8px 14px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("add","Добавить")}</button>
              </div>
            )}
            {(proj.members||[]).length>=tier.users&&<div style={{fontSize:13.5,color:"var(--text5)",textAlign:"center",padding:"8px",borderRadius:8,border:"1px dashed var(--border2)"}}>{t("member_limit","Лимит участников для {plan}: {n}.").replace("{plan}",tier.label).replace("{n}",String(tier.users))} <span onClick={()=>onUpgrade&&onUpgrade()} style={{color:"var(--accent-2)",cursor:"pointer",fontWeight:700}}>{t("upgrade_tier_arrow","Улучшить тариф →")}</span></div>}
          </div>
        )}

        {/* Settings Tab */}
        {tab==="settings"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:460}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{t("project_name_label","Название проекта")}</div>
              <input value={proj.name||""} onChange={e=>setProj(p=>({...p,name:e.target.value}))} onBlur={async()=>{await saveProject(proj);setToast({msg:t("saved_ok","Сохранено"),type:"success"});}} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--input-bg)",color:"var(--text)",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Тариф</div>
              <div style={{padding:"11px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{TIERS[user.tier]?.label||"Free"}</div>
                  <div style={{fontSize:13,color:"var(--text5)"}}>до {fmt(tier.maps)} карт • {fmt(tier.scenarios)} сценариев • {fmt(tier.users)} участников</div>
                </div>
                {onUpgrade&&<button className="btn-interactive" onClick={onUpgrade} style={{padding:"6px 14px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>{t("upgrade_plan","Улучшить")}</button>}
              </div>
            </div>
            {isOwner&&(
              <button onClick={()=>setDelProjConfirm(true)} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.05)",color:"#f04458",cursor:"pointer",fontSize:13,fontWeight:700,marginTop:10}}>🗑 {t("delete_project","Удалить проект")}</button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTmpls&&<TemplateModal tier={user.tier} onSelect={(t)=>{setShowTmpls(false);if(t)createMap(t);}} onClose={()=>setShowTmpls(false)} theme={theme}/>}
      {showScTmpls&&<ScenarioTemplatesModal onSelect={createScenarioFromTemplate} onClose={()=>{setShowScTmpls(false);setShowScChoice(false);}} mapCtx={projCtx} theme={theme}/>}
      {delMapId&&<ConfirmDialog title={t("confirm_delete_map","Удалить карту?")} message={t("confirm_delete_map_desc","Карта будет удалена без возможности восстановления.")} confirmLabel={t("delete","Удалить")} onConfirm={doDelMap} onCancel={()=>setDelMapId(null)} danger={true}/>}
      {delProjConfirm&&<ConfirmDialog title={t("delete_project","Удалить проект?")} message={t("confirm_delete_proj","Все карты и данные проекта будут удалены безвозвратно.")} confirmLabel={t("delete","Удалить")} onConfirm={async()=>{await deleteProject(proj.id);setDelProjConfirm(false);onBack();}} onCancel={()=>setDelProjConfirm(false)} danger={true}/>}

      {showNotifs&&(
        <NotificationsCenterModal
          open={showNotifs}
          onClose={()=>setShowNotifs(false)}
          isMobile={isMobile}
          zIndex={220}
          notifs={notifs}
          setNotifs={setNotifs}
          notifUnread={notifUnread}
          setNotifUnread={setNotifUnread}
          notifLoading={notifLoading}
          lang={lang}
          t={t}
          loadNotifications={loadNotifications}
          deleteGlyph="×"
          onFollowLink={async(n:any)=>{
            if(!n.link)return;
            try{
              const u=new URL(n.link,window.location.origin);
              const open=(u.searchParams.get("open")||"").toLowerCase();
              const projectId=u.searchParams.get("projectId")||"";
              const mapId=u.searchParams.get("mapId")||"";
              const nodeId=u.searchParams.get("nodeId")||"";
              if(open==="map"&&projectId&&mapId&&projectId===proj.id){
                setShowNotifs(false);
                onOpenMap({id:mapId},proj,false,false,nodeId||null);
                return;
              }
            }catch{}
            window.location.href=n.link;
          }}
        />
      )}

      {/* Scenario choice modal */}
      {showScChoice&&(
        <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.8))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:160,backdropFilter:"blur(14px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget)setShowScChoice(false);}}>
          <div className="glass-panel glass-panel-xl" style={{width:"min(95vw,460px)",borderRadius:22,overflow:"hidden",animation:"scaleIn .2s ease"}}>
            <div style={{padding:"18px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>⎇</div>
              <div style={{fontSize:14,fontWeight:800,color:"var(--text)",flex:1}}>{t("new_scenario","Новый сценарий")}</div>
              <button onClick={()=>setShowScChoice(false)} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={createBlankScenario} className="btn-interactive" style={{padding:"16px 18px",borderRadius:14,border:"1px solid var(--glass-border-accent,var(--border))",background:"var(--surface)",textAlign:"left",cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"all .2s"}}
                onMouseOver={e=>{e.currentTarget.style.background="var(--accent-soft)";e.currentTarget.style.borderColor="var(--accent-1)";}}
                onMouseOut={e=>{e.currentTarget.style.background="var(--surface)";e.currentTarget.style.borderColor="var(--glass-border-accent,var(--border))";}}>
                <div style={{width:40,height:40,borderRadius:10,background:"var(--accent-soft)",border:"1px solid var(--glass-border-accent,var(--border))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✏️</div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:3}}>{t("empty_scenario","Пустой сценарий")}</div>
                  <div style={{fontSize:13.5,color:"var(--text4)"}}>{t("start_ai_interview","Начать с чистой карты и AI-интервью")}</div>
                </div>
              </button>
              <button onClick={()=>{setShowScChoice(false);setShowScTmpls(true);}} style={{padding:"16px 18px",borderRadius:14,border:"1px solid rgba(104,54,245,.25)",background:"rgba(104,54,245,.06)",textAlign:"left",cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"all .2s"}}
                onMouseOver={e=>{e.currentTarget.style.background="rgba(104,54,245,.12)";e.currentTarget.style.borderColor="rgba(104,54,245,.5)";}}
                onMouseOut={e=>{e.currentTarget.style.background="rgba(104,54,245,.06)";e.currentTarget.style.borderColor="rgba(104,54,245,.25)";}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(104,54,245,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✦</div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:3}}>AI шаблон сценария</div>
                  <div style={{fontSize:13.5,color:"var(--text4)"}}>8 типов: кризис, рост, инвестиции, пивот и другие</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


// ── Scenario Templates Data ──
const SC_TEMPLATES=[
  {id:"saas_growth",icon:"📈",name:"SaaS рост",color:"#6836f5",
   desc:"Масштабирование SaaS продукта: от PMF до $1M ARR",
   fields:[
     {key:"current_mrr",label:"Текущий MRR",ph:"Например: $8,000/мес"},
     {key:"target_mrr",label:"Цель MRR",ph:"Например: $83k/мес (=$1M ARR)"},
     {key:"main_channel",label:"Главный канал привлечения",ph:"Например: контент + LinkedIn"},
     {key:"churn",label:"Текущий churn",ph:"Например: 5% в месяц"},
     {key:"timeline",label:"Горизонт",ph:"Например: 12 месяцев"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий роста SaaS компании.
Контекст: ${ctx||"SaaS стартап"}
Текущий MRR: ${f.current_mrr}
Цель MRR: ${f.target_mrr}
Главный канал: ${f.main_channel}
Churn: ${f.churn}
Горизонт: ${f.timeline}
Создай 7–8 конкретных узлов — от снижения churn до масштабирования каналов. Верни ТОЛЬКО JSON.`
  },
  {id:"fundraising",icon:"💰",name:"Привлечение инвестиций",color:"#12c482",
   desc:"Подготовка и проведение раунда финансирования",
   fields:[
     {key:"round",label:"Тип раунда",ph:"Например: Pre-seed $300k, Seed $1.5M"},
     {key:"current_metrics",label:"Текущие метрики",ph:"Например: MRR $8k, 45 клиентов, рост 20%/мес"},
     {key:"target_investors",label:"Целевые инвесторы",ph:"Например: tech-focused VC, бизнес-ангелы в EdTech"},
     {key:"use_of_funds",label:"На что пойдут деньги",ph:"Например: найм 3 разработчиков, маркетинг"},
     {key:"timeline",label:"Дедлайн закрытия раунда",ph:"Например: 3 месяца"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий привлечения инвестиций.
Контекст бизнеса: ${ctx||"стартап"}
Раунд: ${f.round}
Текущие метрики: ${f.current_metrics}
Целевые инвесторы: ${f.target_investors}
Использование средств: ${f.use_of_funds}
Дедлайн: ${f.timeline}
Создай 6–8 узлов — от подготовки материалов до закрытия сделки. Верни ТОЛЬКО JSON.`
  },
  {id:"team_scaling",icon:"👥",name:"Масштабирование команды",color:"#a050ff",
   desc:"Найм, структура и рост команды",
   fields:[
     {key:"current_team",label:"Текущая команда",ph:"Например: 2 фаундера + 1 джун разработчик"},
     {key:"target_size",label:"Целевой размер команды",ph:"Например: 8 человек через 6 месяцев"},
     {key:"key_hires",label:"Ключевые найма",ph:"Например: CTO, 2 senior разработчика, sales"},
     {key:"budget_per_month",label:"Бюджет на найм в месяц",ph:"Например: $15k/мес на зарплаты"},
     {key:"bottleneck",label:"Главное узкое место сейчас",ph:"Например: не успеваем делать фичи"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий масштабирования команды.
Контекст бизнеса: ${ctx||"стартап"}
Текущая команда: ${f.current_team}
Цель: ${f.target_size}
Ключевые найма: ${f.key_hires}
Бюджет: ${f.budget_per_month}
Узкое место: ${f.bottleneck}
Создай 6–8 узлов — процесс найма, онбординга, выстраивания процессов. Верни ТОЛЬКО JSON.`
  },
  {id:"pivot",icon:"🔄",name:"Продуктовый пивот",color:"#f09428",
   desc:"Смена модели, аудитории или продукта",
   fields:[
     {key:"current_product",label:"Текущий продукт/модель",ph:"Например: B2C приложение для трекинга питания"},
     {key:"pivot_to",label:"Куда пивотируете",ph:"Например: B2B SaaS для корпоративного wellbeing"},
     {key:"reason",label:"Причина пивота",ph:"Например: B2C не растёт, B2B клиенты сами приходят"},
     {key:"what_keeps",label:"Что сохраняем",ph:"Например: технологию, часть команды, базовый продукт"},
     {key:"risk",label:"Главный риск пивота",ph:"Например: потеряем текущих пользователей"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий продуктового пивота.
Контекст: ${ctx||"стартап"}
Текущий продукт: ${f.current_product}
Пивот в: ${f.pivot_to}
Причина: ${f.reason}
Что сохраняем: ${f.what_keeps}
Главный риск: ${f.risk}
Создай 6–8 узлов — план трансформации с учётом рисков. Верни ТОЛЬКО JSON.`
  },
  {id:"product_launch",icon:"🚀",name:"Запуск продукта",color:"#06b6d4",
   desc:"Подготовка и запуск MVP или новой версии",
   fields:[
     {key:"product_name",label:"Что запускаете",ph:"Например: B2B SaaS для управления задачами"},
     {key:"target_audience",label:"Целевая аудитория",ph:"Например: малый бизнес, 10–50 сотрудников"},
     {key:"launch_date",label:"Дата запуска",ph:"Например: через 8 недель"},
     {key:"success_metric",label:"Метрика успеха запуска",ph:"Например: 50 платящих клиентов в первый месяц"},
     {key:"channel",label:"Главный канал привлечения",ph:"Например: Product Hunt + LinkedIn"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий запуска продукта.
Контекст: ${ctx||"стартап"}
Продукт: ${f.product_name}
Целевая аудитория: ${f.target_audience}
Дата запуска: ${f.launch_date}
Метрика успеха: ${f.success_metric}
Канал: ${f.channel}
Создай 6–8 узлов — от финальной доработки до первых платящих клиентов. Верни ТОЛЬКО JSON.`
  },
  {id:"partnership",icon:"🤝",name:"Стратегическое партнёрство",color:"#a855f7",
   desc:"Запуск партнёрства или интеграции с другим бизнесом",
   fields:[
     {key:"partner_type",label:"Тип партнёра",ph:"Например: крупный дистрибьютор, технологическая компания"},
     {key:"what_we_offer",label:"Что предлагаем",ph:"Например: белая метка нашего продукта, API"},
     {key:"what_we_get",label:"Что получаем",ph:"Например: доступ к 5000 клиентам"},
     {key:"timeline",label:"Дедлайн подписания",ph:"Например: до конца квартала"},
     {key:"risk",label:"Главный риск",ph:"Например: зависимость от одного партнёра"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий стратегического партнёрства.
Контекст: ${ctx||"стартап"}
Тип партнёра: ${f.partner_type}
Мы предлагаем: ${f.what_we_offer}
Мы получаем: ${f.what_we_get}
Дедлайн: ${f.timeline}
Риск: ${f.risk}
Создай 6–8 узлов — от поиска до подписания договора. Верни ТОЛЬКО JSON.`
  },
  {id:"cost_optimization",icon:"💡",name:"Оптимизация расходов",color:"#12c482",
   desc:"Снижение затрат без потери качества и роста",
   fields:[
     {key:"current_burn",label:"Текущий burn rate",ph:"Например: $40k/мес, из них $25k — зарплаты"},
     {key:"target_reduction",label:"Целевое снижение",ph:"Например: сократить на 30% за 2 месяца"},
     {key:"constraints",label:"Что нельзя резать",ph:"Например: команду разработки, ключевых клиентов"},
     {key:"main_waste",label:"Где видите основные потери",ph:"Например: подписки, ручные процессы"},
   ],
   buildPrompt:(f,ctx)=>`Создай сценарий оптимизации расходов.
Контекст: ${ctx||"стартап"}
Текущий burn: ${f.current_burn}
Цель: ${f.target_reduction}
Ограничения: ${f.constraints}
Основные потери: ${f.main_waste}
Создай 6–8 узлов — конкретные меры по снижению затрат. Верни ТОЛЬКО JSON.`
  },
  {id:"crisis",icon:"🔥",name:"Антикризисный план",color:"#dc2626",
   desc:"Действия при кризисе или критических проблемах",
   fields:[
     {key:"crisis_type",label:"Тип кризиса",ph:"Например: потеряли 40% выручки за месяц"},
     {key:"root_cause",label:"Корневая причина",ph:"Например: ключевой клиент ушёл"},
     {key:"runway",label:"Оставшийся runway",ph:"Например: 3 месяца при текущих расходах"},
     {key:"resources",label:"Что есть в запасе",ph:"Например: $50k на счету, лояльная команда"},
     {key:"non_negotiable",label:"Что нельзя потерять",ph:"Например: команду, клиентскую базу"},
   ],
   buildPrompt:(f,ctx)=>`Создай антикризисный сценарий.
Контекст бизнеса: ${ctx||"стартап"}
Тип кризиса: ${f.crisis_type}
Корневая причина: ${f.root_cause}
Runway: ${f.runway}
Что есть: ${f.resources}
Что нельзя потерять: ${f.non_negotiable}
Создай 6–8 узлов — срочные и среднесрочные действия. Первые узлы — неотложные меры. Верни ТОЛЬКО JSON.`
  },
];

const SC_MAP_SYS=`Ты — эксперт по стратегическому планированию. Создай персональный сценарий.

ТРЕБОВАНИЯ:
- title — КОНКРЕТНОЕ ДЕЙСТВИЕ (глагол+объект), не абстракции
- reason — обоснование шага, почему он нужен
- metric — реалистичная измеримая цифра для контекста
- Учитывай все введённые условия и ограничения пользователя
- Маркетинг, продажи, стратегия — адаптируй под контекст
- Связи: requires (A нужен для B), affects, blocks, follows — логичные зависимости
- 6–8 узлов, X:150–900, Y:80–520
Верни ТОЛЬКО валидный JSON (без markdown):
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"critical","progress":0}],"edges":[{"id":"e1","from":"n1","to":"n2","type":"requires"}]}`;

// ── ScenarioTemplatesModal ──
function ScenarioTemplatesModal({onSelect,onClose,mapCtx="",theme="dark"}){
  const{t}=useLang();
  const isMobile=useIsMobile();
  const[selected,setSelected]=useState(null);
  const[fields,setFields]=useState({});
  const[generating,setGenerating]=useState(false);
  const[error,setError]=useState("");

  async function build(){
    if(!selected)return;
    const missing=selected.fields.filter(fld=>!fields[fld.key]?.trim());
    if(missing.length){setError(`${t("fill_fields","Заполните")}: ${missing.map(f=>f.label).join(", ")}`);return;}
    setError("");setGenerating(true);
    try{
      const prompt=selected.buildPrompt(fields,mapCtx);
      const raw=await callAI([{role:"user",content:prompt}],SC_MAP_SYS,1600);
      let parsed;
      try{parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());}
      catch{const m=raw.match(/\{[\s\S]*\}/);parsed=m?JSON.parse(m[0]):null;}
      if(parsed?.nodes){
        // Remap IDs to avoid collisions
        const idMap={};
        const nodes=parsed.nodes.map((n,i)=>{const newId=uid();idMap[n.id]=newId;return{...n,id:newId,comments:[],history:[]};});
        const edges=(parsed.edges||[]).map(e=>({...e,id:uid(),from:idMap[e.from]||e.from,to:idMap[e.to]||e.to}));
        onSelect({nodes,edges,scenarioName:selected.name,scenarioIcon:selected.icon});
      }else throw new Error("bad json");
    }catch{setError(t("ai_generation_error","Ошибка генерации. Попробуйте ещё раз."));}
    setGenerating(false);
  }

  const iS={width:"100%",padding:"8px 11px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:9,color:"var(--text)",outline:"none",fontFamily:"'Inter',system-ui,sans-serif"};

  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.82))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(12px)",animation:"fadeIn .2s ease",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
<div className="glass-panel glass-panel-xl" style={{width:isMobile?"100%":"min(95vw,860px)",maxHeight:isMobile?"88vh":"90vh",margin:isMobile?0:"auto",borderRadius:isMobile?"18px 18px 0 0":22,display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:9,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>⎇</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14.5,fontWeight:900,color:"var(--text)"}}>{t("scenario_templates","Шаблоны сценариев")}</div>
            <div style={{fontSize:13.5,color:"var(--text4)"}}>{t("scen_subtitle","AI сгенерирует стратегическую карту под ваш контекст")}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden",flexDirection:isMobile?"column":"row"}}>
          {/* Template list */}
          <div style={{width:isMobile?"100%":240,maxHeight:isMobile?180:"none",borderRight:isMobile?"none":"1px solid var(--border)",borderBottom:isMobile?"1px solid var(--border)":"none",overflowY:"auto",padding:"10px 8px",display:"flex",flexDirection:isMobile?"row":"column",gap:4,flexShrink:0}}>
            {SC_TEMPLATES.map(tmpl=>(
              <div key={tmpl.id} onClick={()=>{setSelected(tmpl);setFields({});setError("");}}
                className="sa-tmpl-row"
                style={{padding:"10px 12px",borderRadius:10,cursor:"pointer",background:selected?.id===tmpl.id?"rgba(104,54,245,.1)":"transparent",border:`1px solid ${selected?.id===tmpl.id?"rgba(104,54,245,.35)":"transparent"}`,transition:"all .18s ease",flexShrink:0,minWidth:isMobile?180:undefined}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:16}}>{tmpl.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{tmpl.name}</span>
                </div>
                <div style={{fontSize:13.5,color:"var(--text5)",lineHeight:1.4,paddingLeft:24}}>{tmpl.desc}</div>
              </div>
            ))}
          </div>
          {/* Fields panel */}
          <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
            {!selected&&(
              <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:"var(--text5)",textAlign:"center"}}>
                <div style={{fontSize:36}}>⎇</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)"}}>{t("choose_template_left","Выберите шаблон слева")}</div>
                <div style={{fontSize:13,color:"var(--text5)",maxWidth:260}}>{t("scen_subtitle_long","AI сгенерирует персональную стратегическую карту на основе ваших данных")}</div>
              </div>
            )}
            {selected&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{display:"flex",gap:10,alignItems:"center",padding:"12px 14px",borderRadius:12,background:`rgba(${selected.color.replace("#","").match(/../g).map(x=>parseInt(x,16)).join(",")}, .07)`,border:`1px solid ${selected.color}33`}}>
                  <div style={{width:36,height:36,borderRadius:10,background:selected.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{selected.icon}</div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)"}}>{selected.name}</div>
                    <div style={{fontSize:13,color:"var(--text4)"}}>{selected.desc}</div>
                  </div>
                </div>
                {selected.fields.map(fld=>(
                  <div key={fld.key}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{fld.label}</div>
                    <input value={fields[fld.key]||""} onChange={e=>setFields(f=>({...f,[fld.key]:e.target.value}))} placeholder={fld.ph} style={iS}/>
                  </div>
                ))}
                {error&&<div style={{padding:"9px 12px",borderRadius:9,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f04458",fontSize:13}}>{error}</div>}
                  <button onClick={build} disabled={generating} className="btn-interactive" style={{padding:"11px",borderRadius:11,border:"none",background:generating?"var(--surface2)":"var(--gradient-accent)",color:generating?"var(--text4)":"var(--accent-on-bg)",cursor:generating?"wait":"pointer",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:generating?"none":"0 2px 14px var(--accent-glow)"}}>
                  {generating?(
                      <><div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>{t("ai_generating_map","AI генерирует карту…")}</>
                  ):(
                      <>✦ {t("create_scenario","Создать сценарий")}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── TemplateModal ──
function TemplateModal({tier,onSelect,onClose,theme="dark"}){
  const{t}=useLang();
  const isMobile=useIsMobile();
  const tierData=TIERS[tier||"free"]||TIERS.free;
  const canUse=tierData.templates;
  const[selected,setSelected]=useState(null);
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.8))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:180,backdropFilter:"blur(16px)",animation:"fadeIn .2s ease",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
<div className="glass-panel glass-panel-xl" style={{width:isMobile?"100%":"min(95vw,760px)",maxHeight:isMobile?"88vh":"86vh",borderRadius:isMobile?"18px 18px 0 0":22,display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text)"}}>{t("map_templates_modal_title","📋 Шаблоны карт")}</div>
            <div style={{fontSize:13,color:"var(--text4)",marginTop:2}}>{t("choose_template","Выберите готовую стратегическую карту или начните с нуля")}</div>
          </div>
          {!canUse&&<div style={{padding:"4px 10px",borderRadius:8,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",color:"#f09428",fontSize:13,fontWeight:700}}>{t("templates_team_tier_badge","Team+ тариф")}</div>}
          <button className="modal-close" onClick={onClose} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,alignContent:"start"}}>
          {TEMPLATES.map(tmpl=>{
            const locked=!canUse;
            const sel=selected===tmpl.id;
            return(
              <div key={tmpl.id} role="button" tabIndex={locked?-1:0} aria-disabled={locked} aria-pressed={sel}
                onClick={()=>!locked&&setSelected(sel?null:tmpl.id)}
                onKeyDown={e=>{if(!locked&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setSelected(sel?null:tmpl.id);}}}
                className={"sa-tmpl-card"+(locked?" locked":"")}
                style={{padding:"16px",borderRadius:14,border:`2px solid ${sel?"var(--accent-1)":"var(--border)"}`,background:sel?"var(--accent-soft)":locked?"var(--surface)":"var(--card)",cursor:locked?"not-allowed":"pointer",opacity:locked?.5:1,outline:"none"}}>
                <div style={{fontSize:22,marginBottom:8}}>{tmpl.name.split(" ")[0]}</div>
                <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:4}}>{tmpl.name.split(" ").slice(1).join(" ")}</div>
                <div style={{fontSize:13,color:"var(--text4)",marginBottom:8}}>{tmpl.desc}</div>
                <div style={{display:"flex",gap:6}}>
                  <div style={{padding:"2px 7px",borderRadius:5,background:"var(--surface2)",border:"1px solid var(--border)",fontSize:13,color:"var(--text4)"}}>{t("map_template_n_steps","{n} шагов").replace("{n}",String(tmpl.nodes.length))}</div>
                  <div style={{padding:"2px 7px",borderRadius:5,background:"var(--surface2)",border:"1px solid var(--border)",fontSize:13,color:"var(--text4)"}}>{t("map_template_n_edges","{n} связей").replace("{n}",String(tmpl.edges.length))}</div>
                </div>
                {locked&&<div style={{marginTop:6,fontSize:13,color:"#f09428",fontWeight:700}}>{t("templates_locked_team","🔒 Team+")}</div>}
              </div>
            );
          })}
        </div>
        <div style={{padding:"14px 22px",borderTop:"1px solid var(--border)",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("cancel","Отмена")}</button>
          <button className="btn-interactive" onClick={()=>{if(selected){const tmpl=TEMPLATES.find(x=>x.id===selected);if(tmpl)onSelect(tmpl);}else{onSelect(null);}}} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:900,boxShadow:"0 2px 14px var(--accent-glow)"}}>
            {selected?t("use_template","Использовать шаблон"):t("start_from_scratch","Начать с нуля")}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── MapTour ──
function MapTour({onDone}){
  const{t}=useLang();
  const TOUR_STEPS=useMemo(()=>[
    {title:t("tour_s1_title","Это ваша стратегическая карта"),body:t("tour_s1_body","Каждый узел — шаг к цели. Перетаскивайте их, соединяйте и отслеживайте прогресс. Перетащите фон для перемещения, колесо мыши — зум."),icon:"🗺️"},
    {title:t("tour_s2_title","Добавляйте шаги"),body:t("tour_s2_body","Нажмите + Шаг или кликните на пустое место. У каждого шага — статус, приоритет, метрика, дедлайн. Ctrl+Z / Ctrl+Y — отмена и повтор."),icon:"⊕"},
    {title:t("tour_s3_title","Связывайте шаги"),body:t("tour_s3_body","Кнопка «⇒ Связать» или «🔗 AI-связи» — AI предложит логичные зависимости. Режим связи: клик на источник, затем на цель."),icon:"→"},
    {title:t("tour_s4_title","AI-советник"),body:t("tour_s4_body","Кнопка «✦ AI» или Ctrl+Shift+A. AI знает карту, связи, дедлайны. Быстрые подсказки: «С чего начать?», «Риски?», «Следующий шаг?»."),icon:"✦"},
    {title:t("tour_s5_title","Редактируйте детали"),body:t("tour_s5_body","Клик на шаг — панель с описанием, комментариями (@AI для вопросов), дедлайном, историей. ✨ Перефразировать — AI улучшит формулировку."),icon:"✏️"},
    {title:t("tour_s6_title","Готовы к работе"),body:t("tour_s6_body","? — горячие клавиши. 📊 — аналитика. ⎇ — симуляция. Шаблоны и экспорт — в тулбаре. Удачи!"),icon:"✓"},
  ],[t]);
  const[step,setStep]=useState(0);
  const s=TOUR_STEPS[step];
  const isLast=step===TOUR_STEPS.length-1;
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="Escape")onDone();
      if(e.key==="ArrowRight"||e.key===" ")isLast?onDone():setStep(st=>st+1);
      if(e.key==="ArrowLeft"&&step>0)setStep(st=>st-1);
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[isLast,step,onDone]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,pointerEvents:"none"}}>
      <div style={{position:"absolute",inset:0,background:"var(--tour-overlay-bg,rgba(0,0,0,.45))",backdropFilter:"blur(3px)",pointerEvents:"all"}} onClick={()=>isLast?onDone():setStep(st=>st+1)}/>
      <div className="glass-panel glass-panel-xl" style={{position:"absolute",bottom:"50%",left:"50%",transform:"translate(-50%,50%)",width:400,borderRadius:22,padding:"26px 28px",pointerEvents:"all",animation:"scaleIn .3s cubic-bezier(.34,1.56,.64,1)",zIndex:10000}}>
        {/* Progress */}
        <div style={{display:"flex",gap:4,marginBottom:20}}>
          {TOUR_STEPS.map((_,i)=>(
            <div key={i} onClick={()=>setStep(i)} style={{flex:i===step?3:1,height:3,borderRadius:2,background:i===step?"var(--accent-1)":i<step?"rgba(var(--accent-rgb),0.45)":"var(--border)",cursor:"pointer",transition:"all .3s"}}/>
          ))}
        </div>
        <div style={{fontSize:32,marginBottom:14,textAlign:"center"}}>{s.icon}</div>
        <div style={{fontSize:15,fontWeight:900,color:"var(--text)",textAlign:"center",marginBottom:10}}>{s.title}</div>
        <div style={{fontSize:13,color:"var(--text3)",lineHeight:1.75,textAlign:"center",marginBottom:22}}>{s.body}</div>
        <div style={{display:"flex",gap:9,justifyContent:"center"}}>
          {step>0&&<button className="btn-interactive" onClick={e=>{e.stopPropagation();setStep(st=>st-1);}} style={{padding:"9px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:800}}>{t("back_btn","← Назад")}</button>}
          <button className="btn-interactive" onClick={e=>{e.stopPropagation();isLast?onDone():setStep(st=>st+1);}} style={{padding:"9px 22px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:900,boxShadow:"0 2px 14px var(--accent-glow)"}}>
            {isLast?t("tour_start_work","Начать работу ✓"):t("next","Далее →")}
          </button>
          <button className="btn-interactive" onClick={e=>{e.stopPropagation();onDone();}} style={{padding:"9px 14px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text4)",cursor:"pointer",fontSize:13,fontWeight:800}}>{t("skip","Пропустить")}</button>
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:13.5,color:"var(--text4)"}}>{t("tour_nav_hint","← → или пробел для навигации • Esc — закрыть")}</div>
      </div>
    </div>
  );
}


// ── SimulationModal ──
function SimulationModal({mapData,allProjectMaps,onClose,theme="dark",statusMap}){
  const{t}=useLang();
  const STATUS=statusMap||getSTATUS(t);
  const[params,setParams]=useState({plannedResult:"",plannedMetric:"",revenue:500000,team:5,budget:50000,timeline:"6 месяцев"});
  const[secMapId,setSecMapId]=useState("");
  const[simState,setSimState]=useState("idle");
  const[results,setResults]=useState({});
  const[secResults,setSecResults]=useState({});
  const[activeId,setActiveId]=useState(null);
  const[log,setLog]=useState<{role:string;text:string}[]>([{role:"sys",text:t("sim_intro_log","Опишите желаемый результат, установите параметры и нажмите ▶ Запустить")}]);
  const[aiInp,setAiInp]=useState("");
  const[aiLoad,setAiLoad]=useState(false);
  const[final,setFinal]=useState(null);
  const[centerTab,setCenterTab]=useState("map");
  const logRef=useRef(null),runRef=useRef(false),pauseRef=useRef(false),pRef=useRef(params);
  useEffect(()=>{pRef.current=params;},[params]);
  useEffect(()=>{logRef.current?.scrollIntoView({behavior:"smooth"});},[log]);
  useEffect(()=>()=>{runRef.current=false;pauseRef.current=false;},[]);

  const otherMaps=(allProjectMaps||[]).filter(m=>m.id!==mapData.id&&!m.isScenario);
  const secMap=otherMaps.find(m=>m.id===secMapId);
  const ordered=topSort(mapData.nodes||[],mapData.edges||[]);
  const ordSec=secMap?topSort(secMap.nodes||[],secMap.edges||[]):[];
  const addLog=(text,role="sys")=>setLog(prev=>[...prev,{role,text}]);

  function buildInEdges(edges){
    const idx={};
    for(const e of edges){
      const to=e.target||e.to;
      if(!idx[to])idx[to]=[];
      idx[to].push(e);
    }
    return idx;
  }

  async function startSim(){
    if(runRef.current)return;
    runRef.current=true;pauseRef.current=false;
    const acc: Record<string, SimNodeResult>={},sacc: Record<string, SimNodeResult>={};
    setSimState("running");setActiveId(null);setResults({});setSecResults({});setFinal(null);
    const p=pRef.current;
    const inEdges=buildInEdges(mapData.edges||[]);
    const inEdgesSec=secMap?buildInEdges(secMap.edges||[]):{};
    setLog([
      {role:"start",text:`▶ ${t("start_short","Запуск")} · ${ordered.length} ${t("steps_label","шагов")}`},
      ...(p.plannedResult?[{role:"plan",text:`🎯 ${t("goal","Цель")}: "${p.plannedResult}"${p.plannedMetric?" · "+p.plannedMetric:""}`}]:[]),
      {role:"sys",text:`💰 $${(+p.budget).toLocaleString()} · 👥 ${p.team} ${t("people_short","чел.")} · ⏱ ${p.timeline||t("not_set","не указан")}`}
    ]);
    for(let i=0;i<ordered.length;i++){
      if(!runRef.current)break;
      while(pauseRef.current){await sleep(150);if(!runRef.current)return;}
      const node=ordered[i];
      setActiveId(node.id);
      const r=simNode(node,pRef.current,acc,inEdges[node.id]||[]);
      acc[node.id]=r;setResults({...acc});
      if(ordSec[i]){
        const sr=simNode(ordSec[i],pRef.current,sacc,inEdgesSec[ordSec[i].id]||[]);
        sacc[ordSec[i].id]=sr;setSecResults({...sacc});
      }
      const icon=r.outcome==="success"?"✅":r.outcome==="partial"?"⚠️":"❌";
      const dep=r.autoFail?` (${t("blocked","заблокирован")})`:r.depPenalty>15?` (−${r.depPenalty}%)`:"";
      addLog(`${icon} "${node.title}" — ${r.score}%${dep}`,"step");
      await sleep(800);
    }
    if(runRef.current){
      runRef.current=false;setSimState("finished");setActiveId(null);
      const all=Object.values(acc);
      const avg=all.length?Math.round(all.reduce((s,r2)=>s+r2.score,0)/all.length):0;
      const pr=pRef.current;
      const revenueAchieved=Math.round(pr.revenue*(avg/100));
      const budgetUsed=Math.round(pr.budget*(0.5+avg/200));
      const failNodes=ordered.filter(n=>acc[n.id]?.outcome==="fail");
      const secAvg=ordSec.length?Math.round(Object.values(sacc).reduce((s,r2)=>s+r2.score,0)/Math.max(1,ordSec.length)):null;
      const planAchievement=avg>=80?t("plan_overdone","перевыполнен"):avg>=60?t("plan_done","выполнен"):avg>=40?t("plan_partial","частично выполнен"):t("plan_failed","не выполнен");
      const f={avg,revenueAchieved,budgetUsed,failNodes,planAchievement,secAvg};
      setFinal(f);
      addLog(`📊 ${t("avg_score","Средний score")}: ${avg}% · ${t("revenue","Выручка")}: $${revenueAchieved.toLocaleString()} · ${planAchievement.toUpperCase()}`,"result");
      if(secAvg!==null)addLog(`📊 ${t("scenario_b","Сценарий Б")}: ${secAvg}% ${secAvg>avg?"("+t("better_by","лучше на")+" "+(secAvg-avg)+"%)":`(${t("worse_by","хуже на")} ${avg-secAvg}%)`}`,"result");
      // AI analysis
      setAiLoad(true);
      const nodeDetails=ordered.map(n=>{
        const r2=acc[n.id];
        if(!r2)return`- "${n.title}": нет данных`;
        return`- "${n.title}": ${r2.score}%${r2.autoFail?" (автоблок)":""}${r2.depPenalty>0?` (-${r2.depPenalty}% зависимости)`:""}`;
      }).join("\n");
      try{
        const txt=await callAI([{role:"user",content:`Симуляция "${mapData.name||"карты"}":
Цель: ${pr.plannedResult||"не указана"}, метрика: ${pr.plannedMetric||"нет"}
Параметры: бюджет $${pr.budget}, команда ${pr.team} чел., срок ${pr.timeline}
Итог: ${avg}%, план ${planAchievement}, выручка $${revenueAchieved.toLocaleString()}
Провалы: ${failNodes.map(n=>n.title).join(", ")||"нет"}
Шаги:\n${nodeDetails}
Дай ГЛУБОКИЙ анализ: 1) почему такой результат (узкие места, зависимости, ресурсы) 2) КОНКРЕТНОЕ действие — что изменить (шаг, ресурс, приоритет), зачем, как измерить. Учитывай связи между шагами. Non-obvious insight — что упускают?`}],"Ты стратегический аналитик. Глубокий анализ: причина → конкретное действие → как измерить. Учитывай зависимости и «погоду». Non-obvious insights. Без общих фраз.",400);
        addLog(`✦ ${txt}`,"ai");
      }catch{
        addLog("✦ Проверьте узкие места и повысьте прогресс критических шагов.","ai");
      }
      setAiLoad(false);
    }
  }

  function pauseSim(){pauseRef.current=true;setSimState("paused");addLog("⏸ "+t("pause","Пауза"),"sys");}
  function resumeSim(){pauseRef.current=false;setSimState("running");addLog("▶ "+t("resuming","Продолжаем…"),"sys");}
  function stopSim(){runRef.current=false;pauseRef.current=false;setSimState("idle");setActiveId(null);setResults({});setSecResults({});setFinal(null);setLog([{role:"sys",text:t("sim_set_params","Установите параметры и нажмите ▶ Запустить")}]);}
  async function askAI(){
    if(!aiInp.trim()||aiLoad)return;
    const q=aiInp;setAiInp("");addLog(`👤 ${q}`,"user");setAiLoad(true);
    const ctx=final?`${t("sim_short","Симуляция")}: ${t("result","итог")} ${final.avg}%, ${t("plan","план")} ${final.planAchievement}.`:"";
    try{const r=await callAI([{role:"user",content:`${ctx} Вопрос: ${q}`}],"Ты AI-советник по симуляции стратегии. Отвечай конкретно: что сделать, зачем, как измерить. Учитывай зависимости между шагами и «погоду».",350);addLog(`✦ ${r}`,"ai");}
    catch{addLog(`✦ ${t("ai_sim_error","Ошибка AI-консультанта")}`,"ai");}
    setAiLoad(false);
  }

  const isRunning=simState==="running",isPaused=simState==="paused",isFinished=simState==="finished";
  const progress=ordered.length?Math.round(Object.keys(results).length/ordered.length*100):0;
  const OC={success:"#12c482",partial:"#f09428",fail:"#f04458"};
  const fi={width:"100%",padding:"8px 10px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit"};

  return(
    <div data-theme={theme} role="dialog" aria-label={t("simulation","Симуляция")} style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.9))",display:"flex",flexDirection:"column",zIndex:300,backdropFilter:"blur(16px)",animation:"fadeIn .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",flexShrink:0,position:"relative"}}>
        <div style={{fontSize:15,fontWeight:900,color:"var(--text)",flex:1}}>⎇ {t("simulation","Симуляция")} · {mapData.name||t("map","Карта")}</div>
        {isRunning&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--text3)"}}><div style={{width:10,height:10,borderRadius:"50%",background:"#12c482",animation:"pulse 1s infinite"}}/>{progress}% {t("completed_short","завершено")}</div>}
        {isFinished&&final&&<div style={{fontSize:13,color:final.avg>=60?"#12c482":"#f09428",fontWeight:700}}>{final.planAchievement.toUpperCase()} · {final.avg}%</div>}
        <button className="modal-close" onClick={onClose} aria-label={t("close","Закрыть")}>×</button>
        {(isRunning||isFinished)&&(
          <div aria-hidden style={{position:"absolute",left:0,right:0,bottom:-1,height:2,background:"rgba(255,255,255,.06)"}}>
            <div className={isFinished?"":"sa-sim-bar"} style={{height:"100%",width:`${progress}%`,background:isFinished?"linear-gradient(90deg,var(--accent-1),var(--accent-2))":undefined}}/>
          </div>
        )}
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Left: params */}
        <div style={{width:240,flexShrink:0,borderRight:"1px solid var(--border)",overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 {t("sim_goal","Желаемый результат")}</div>
            <textarea value={params.plannedResult} onChange={e=>setParams(p=>({...p,plannedResult:e.target.value}))} rows={2} placeholder={t("sim_goal_ph","Например: Выйти на $100k MRR")} style={{...fi,resize:"none"}} disabled={isRunning||isPaused}/>
          </div>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>📊 {t("sim_target_metric","Целевая метрика")}</div>
            <input value={params.plannedMetric} onChange={e=>setParams(p=>({...p,plannedMetric:e.target.value}))} placeholder={t("sim_metric_ph","100k MRR / 1000 клиентов")} style={fi} disabled={isRunning||isPaused}/>
          </div>
          {[[`💰 ${t("sim_budget","Бюджет ($)")}`,"budget","number"],[`👥 ${t("sim_team","Команда (чел)")}`,"team","number"],[`💵 ${t("sim_revenue","Целевая выручка ($)")}`,"revenue","number"],[`⏱ ${t("sim_term","Срок")}`,"timeline","text"]].map(row=>{
            const label=row[0],key=row[1],type=row[2];
            return(
              <div key={key}>
                <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{label}</div>
                <input type={type} value={params[key]} onChange={e=>setParams(p=>({...p,[key]:type==="number"?+e.target.value:e.target.value}))} style={fi} disabled={isRunning||isPaused}/>
              </div>
            );
          })}
          {otherMaps.length>0&&(
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>⎇ {t("sim_compare","Сравнить с картой")}</div>
              <select value={secMapId} onChange={e=>setSecMapId(e.target.value)} style={{...fi,cursor:"pointer"}} disabled={isRunning||isPaused}>
                <option value="">{t("sim_no_compare","Без сравнения")}</option>
                {otherMaps.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
            {!isRunning&&!isPaused&&<button onClick={startSim} style={{padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,var(--info),var(--accent-1))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>▶ {t("run","Запустить")}</button>}
            {isRunning&&<button onClick={pauseSim} style={{padding:"9px",borderRadius:9,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.08)",color:"#f09428",fontSize:13,fontWeight:700,cursor:"pointer"}}>⏸ {t("pause","Пауза")}</button>}
            {isPaused&&<button onClick={resumeSim} style={{padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#12c482,#06b6d4)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>▶ {t("resume","Продолжить")}</button>}
            {(isRunning||isPaused)&&<button onClick={stopSim} style={{padding:"9px",borderRadius:9,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#f04458",fontSize:13,fontWeight:700,cursor:"pointer"}}>■ {t("stop","Стоп")}</button>}
            {isFinished&&<button onClick={stopSim} style={{padding:"9px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:700,cursor:"pointer"}}>↺ {t("again","Заново")}</button>}
          </div>
        </div>
        {/* Center: map + gantt tabs */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",gap:2,padding:"8px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
            {[["map","🗺 "+t("map","Карта")],["gantt","📅 "+t("gantt_short","Ганнт")]].map(item=>{
              const k=item[0],lbl=item[1];
              return <button key={k} onClick={()=>setCenterTab(k)} style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${centerTab===k?"rgba(104,54,245,.4)":"transparent"}`,background:centerTab===k?"rgba(104,54,245,.1)":"transparent",color:centerTab===k?"#b4a3ff":"var(--text4)",cursor:"pointer",fontSize:13,fontWeight:centerTab===k?700:500}}>{lbl}</button>;
            })}
          </div>
          {centerTab==="gantt"&&(
            <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
              {(mapData.nodes||[]).filter(n=>n.deadline).length===0?(
                <div style={{textAlign:"center",padding:"40px",color:"var(--text4)"}}>
                  <div style={{fontSize:24,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13}}>{t("add_deadlines_hint","Добавьте дедлайны к шагам — они появятся здесь")}</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(mapData.nodes||[]).filter(n=>n.deadline).sort((a,b)=>new Date(a.deadline).getTime()-new Date(b.deadline).getTime()).map(n=>{
                    const st=STATUS[n.status]||STATUS.planning;
                    const r=results[n.id];
                    const OC2={success:"#12c482",partial:"#f09428",fail:"#f04458"};
                    return(
                      <div key={n.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                        <div style={{width:8,height:8,borderRadius:2,background:r?OC2[r.outcome]:st.c,flexShrink:0}}/>
                        <div style={{flex:1,fontSize:13.5,color:"var(--text)",fontWeight:600}}>{n.title}</div>
                        <div style={{fontSize:13,color:"var(--text4)"}}>{n.deadline}</div>
                        {r&&<div style={{fontSize:13,fontWeight:700,color:OC2[r.outcome]}}>{r.score}%</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {centerTab==="map"&&(
            <div style={{flex:1,overflow:"auto",position:"relative"}}>
              <svg width="100%" height="100%" style={{minHeight:400}}>
                <defs><filter id="simGlow"><feGaussianBlur stdDeviation="3"/></filter></defs>
                <rect width="100%" height="100%" fill="var(--bg)"/>
                {(mapData.edges||[]).map(e=>{
                  const s2=(mapData.nodes||[]).find(n=>n.id===(e.source||e.from));
                  const t2=(mapData.nodes||[]).find(n=>n.id===(e.target||e.to));
                  if(!s2||!t2)return null;
                  return <line key={e.id} x1={s2.x+120} y1={s2.y+64} x2={t2.x+120} y2={t2.y+64} stroke="var(--border2)" strokeWidth={1}/>;
                })}
                {(mapData.nodes||[]).map(n=>{
                  const r=results[n.id];
                  const isActive=activeId===n.id;
                  const fillC=r?r.outcome==="success"?"rgba(16,185,129,.15)":r.outcome==="partial"?"rgba(245,158,11,.15)":"rgba(239,68,68,.12)":isActive?"rgba(14,165,233,.12)":"var(--surface)";
                  const strokeC=r?OC[r.outcome]:isActive?"#06b6d4":"var(--node-stroke)";
                  return(
                    <g key={n.id}>
                      <rect x={n.x} y={n.y} width={240} height={64} rx={10} fill={fillC} stroke={strokeC} strokeWidth={isActive||r?2:1} style={isActive&&!r?{animation:"nodeBlink 1s infinite"}:{}}/>
                      <text x={n.x+12} y={n.y+22} fontSize={12} fontWeight={700} fill="var(--text)" style={{fontFamily:"'Inter',system-ui,sans-serif"}}>{(n.title||"").slice(0,24)}</text>
                      {r&&<text x={n.x+12} y={n.y+44} fontSize={11} fill={OC[r.outcome]} style={{fontFamily:"'Inter',system-ui,sans-serif"}}>{r.score}% · {r.outcome==="success"?"✅":r.outcome==="partial"?"⚠️":"❌"}</text>}
                      {isActive&&!r&&<text x={n.x+12} y={n.y+44} fontSize={10} fill="#06b6d4" style={{fontFamily:"'Inter',system-ui,sans-serif"}}>{t("analyzing_short","анализ…")}</text>}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          {centerTab==="gantt"&&(
            <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
              {(mapData.nodes||[]).filter(n=>n.deadline).length===0?(
                <div style={{textAlign:"center",padding:"40px",color:"var(--text4)"}}>
                  <div style={{fontSize:24,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13}}>{t("add_deadlines_hint","Добавьте дедлайны к шагам — они появятся здесь")}</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(mapData.nodes||[]).filter(n=>n.deadline).sort((a,b)=>new Date(a.deadline).getTime()-new Date(b.deadline).getTime()).map(n=>{
                    const st=STATUS[n.status]||STATUS.planning;
                    const r=results[n.id];
                    return(
                      <div key={n.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                        <div style={{width:8,height:8,borderRadius:2,background:r?OC[r.outcome]:st.c,flexShrink:0}}/>
                        <div style={{flex:1,fontSize:13.5,color:"var(--text)",fontWeight:600}}>{n.title}</div>
                        <div style={{fontSize:13,color:"var(--text4)"}}>{n.deadline}</div>
                        {r&&<div style={{fontSize:13,fontWeight:700,color:OC[r.outcome]}}>{r.score}%</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Right: log + AI */}
        <div style={{width:300,flexShrink:0,borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:6}}>
            {log.map((entry,i)=>{
              const colors={sys:"var(--text4)",start:"#06b6d4",plan:"var(--accent-2)",step:"var(--text3)",result:"#f09428",ai:"var(--accent-2)",user:"var(--text)"};
              return <div key={i} style={{fontSize:13.5,lineHeight:1.6,color:colors[entry.role]||"var(--text3)",fontFamily:entry.role==="result"||entry.role==="start"?"'JetBrains Mono',monospace":"inherit"}}>{entry.text}</div>;
            })}
            {aiLoad&&<div style={{display:"flex",gap:4,padding:"6px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>}
            <div ref={logRef}/>
          </div>
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--border)",flexShrink:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",marginBottom:6}}>✦ {t("ask_ai","Спросить AI")}</div>
            <div style={{display:"flex",gap:6}}>
              <input value={aiInp} onChange={e=>setAiInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askAI();}} placeholder={t("sim_ask_ph","Вопрос о симуляции…")} style={{flex:1,padding:"7px 10px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
              <button onClick={askAI} disabled={!aiInp.trim()||aiLoad} className="btn-interactive" style={{width:30,height:30,borderRadius:8,border:"none",background:aiInp.trim()&&!aiLoad?"var(--gradient-accent)":"var(--surface)",color:aiInp.trim()&&!aiLoad?"var(--accent-on-bg)":"var(--text4)",cursor:aiInp.trim()&&!aiLoad?"pointer":"not-allowed",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:aiInp.trim()&&!aiLoad?"0 2px 12px var(--accent-glow)":"none"}}>↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── InMapOnboarding ──
function InMapOnboarding({project,tier,theme="dark",onDone,onSkip}){
  const{t}=useLang();
  const tierData=TIERS[tier||"free"]||TIERS.free;
  const MAX_Q=6;
  const[msgs,setMsgs]=useState([]);
  const[inp,setInp]=useState("");
  const[loading,setLoading]=useState(false);
  const[generating,setGenerating]=useState(false);
  const[history,setHistory]=useState([]);
  const[qCount,setQCount]=useState(0);
  const[showSkipConfirm,setShowSkipConfirm]=useState(false);
  const[mapGenFailed,setMapGenFailed]=useState(false);
  const endRef=useRef(null);
  const inputRef=useRef(null);
  const tKey=tier||"free";
  const obFn=OB_TIER[tKey]||OB_TIER.free;
  const mapHint=MAP_TIER[tKey]||MAP_TIER.free;
  const sysPrompt=obFn(project?.name||"");
  const mapSys=`Создай стратегическую карту на основе интервью. МАКСИМАЛЬНАЯ ГЛУБИНА: учитывай ВСЁ из ответов — отрасль, этап, ресурсы, цели, риски, неявное.
${["pro","team","enterprise"].includes(tKey)?`БАЗА ЗНАНИЙ: ${AI_KNOWLEDGE}`:""}

Связи: requires (A нужен для B), affects, blocks, follows. Логичные зависимости. Избегай типичных ошибок (пропуск валидации, масштаб до PMF).
Верни ТОЛЬКО валидный JSON (без markdown):
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"high","progress":35,"tags":[]}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"requires","label":""}]}
${mapHint} X:150–900, Y:80–520.`;

  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  useEffect(()=>{if(!loading&&!generating){const t=setTimeout(()=>inputRef.current?.focus(),80);return()=>clearTimeout(t);}},[loading,generating]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью."}]:hist,sysPrompt,300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{setMsgs(m=>[...m,{role:"ai",text:reply.trim()}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:t("ai_network_err","Не удалось получить ответ AI. Проверьте сеть и ключ API. Попробуйте ещё раз.")}]);
      setLoading(false);
    }
  }
  async function submit(){
    if(!inp.trim()||loading||generating)return;
    const text=inp.trim();setInp("");
    const newMsgs=[...msgs,{role:"user",text}];setMsgs(newMsgs);
    const aiMsg=msgs[msgs.length-1]?.text||"";
    const newHist=[...history,{role:"assistant",content:aiMsg},{role:"user",content:text}].filter(h=>h.content);
    setHistory(newHist);
    if(qCount>=MAX_Q){await buildMap(newHist);}else{await askNext(newHist);}
  }
  async function buildMap(hist){
    setGenerating(true);setMapGenFailed(false);
    setMsgs(m=>[...m,{role:"ai",text:"Строю персональную карту…"}]);
    const ctx=hist.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    try{
      const raw=await callAI([{role:"user",content:"Интервью:\n"+ctx+"\n\nСоздай карту."}],mapSys,1500);
      const clean=raw.replace(/```json|```/g,"").trim();
      const fallback=clean.match(/\{[\s\S]*\}/);
      const data=JSON.parse(fallback?fallback[0]:clean);
      onDone({nodes:data.nodes||[],edges:data.edges||[],ctx});
    }catch{
      setMapGenFailed(true);
      setMsgs(m=>[...m,{role:"ai",text:t("ai_map_fallback","AI не удалось создать карту. Нажмите «Повторить» или «Использовать шаблон».")}]);
    }finally{setGenerating(false);}
  }
  function useFallbackTemplate(){
    setMapGenFailed(false);
    const ctxFromHist=history.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    onDone({nodes:defaultNodes(),edges:[],ctx:ctxFromHist||""});
  }
  const pct=Math.min(100,Math.round(qCount/MAX_Q*100));
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.92))",display:"flex",flexDirection:"column",zIndex:250,backdropFilter:"blur(20px)",animation:"fadeIn .2s ease"}}>
<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>✦</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>AI создаёт карту · {project?.name}</div>
          <div style={{height:3,borderRadius:2,background:"var(--surface2)",marginTop:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:"var(--gradient-accent)",borderRadius:2,transition:"width .4s"}}/>
          </div>
        </div>
        <button onClick={()=>setShowSkipConfirm(true)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>{t("skip","Пропустить")}</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:12,maxWidth:680,margin:"0 auto",width:"100%"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:26,height:26,borderRadius:7,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,flexShrink:0,marginTop:2,boxShadow:"0 2px 10px var(--accent-glow)"}}>✦</div>}
            <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"3px 12px 12px 12px",background:m.role==="user"?"rgba(104,54,245,.18)":"var(--surface)",border:`1px solid ${m.role==="user"?"rgba(104,54,245,.3)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
        {(loading||generating)&&<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:26,height:26,borderRadius:7,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 10px var(--accent-glow)"}}>✦</div><div style={{display:"flex",gap:4,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"3px 12px 12px 12px"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      {mapGenFailed&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:680,margin:"0 auto",width:"100%",flexWrap:"wrap"}}>
          <button onClick={()=>{setMapGenFailed(false);buildMap(history);}} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("retry","Повторить")}</button>
          <button onClick={useFallbackTemplate} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("use_template","Использовать шаблон")}</button>
        </div>
      )}
      {!generating&&!mapGenFailed&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:680,margin:"0 auto",width:"100%"}}>
          <input ref={inputRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} placeholder="Ваш ответ…" style={{flex:1,padding:"11px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"inherit"}} disabled={loading}/>
          <button onClick={submit} disabled={!inp.trim()||loading} className="btn-interactive" style={{padding:"11px 22px",borderRadius:12,border:"none",background:inp.trim()&&!loading?"var(--gradient-accent)":"var(--surface)",color:inp.trim()&&!loading?"var(--accent-on-bg)":"var(--text4)",fontSize:14,fontWeight:900,cursor:inp.trim()&&!loading?"pointer":"not-allowed",boxShadow:inp.trim()&&!loading?"0 4px 18px var(--accent-glow)":"none"}}>
            {qCount>=MAX_Q?t("create","Создать")+" ✦":t("answer","Ответить")+" →"}
          </button>
        </div>
      )}
      {showSkipConfirm&&(
        <div style={{position:"absolute",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.7))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
          <div style={{background:"var(--bg2)",borderRadius:16,padding:"24px 28px",maxWidth:360,border:"1px solid var(--border)",animation:"scaleIn .2s ease",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8}}>Пропустить интервью?</div>
            <div style={{fontSize:13.5,color:"var(--text3)",marginBottom:20}}>Карта будет создана с примерными шагами. AI-интервью помогает сделать её персонализированной.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowSkipConfirm(false)} style={{padding:"9px 20px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("continue_btn","Продолжить")}</button>
              <button onClick={onSkip} style={{padding:"9px 20px",borderRadius:9,border:"none",background:"rgba(239,68,68,.1)",color:"#f04458",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("skip","Пропустить")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ImportJSON (helper) ──
function useImportJSON(onImport,onError?:(msg:string)=>void){
  const fileRef=useRef(null);
  const{t}=useLang();
  function trigger(){fileRef.current?.click();}
  function renderInput(){
    return(
      <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>{
        const f=e.target.files[0];if(!f)return;
        const r=new FileReader();
        r.onload=ev=>{
          try{
            const raw=ev.target?.result;
            if(typeof raw!=="string")return;
            const d=JSON.parse(raw);
            if(d.nodes||d.edges){onImport({nodes:d.nodes||[],edges:d.edges||[],name:d.name||f.name.replace(".json","")});}
          }catch{
            const msg=t("json_invalid","Некорректный формат JSON");
            if(onError)onError(msg);
            else console.warn("Invalid JSON");
          }
          e.target.value="";
        };
        r.readAsText(f);
      }}/>
    );
  }
  return{trigger,renderInput};
}


// ── SplashScreen ──
function SplashScreen({onDone,theme,authReady=false}){
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
// ── SparklesCanvas ──
function SparklesCanvas({color="#ffffff",density=120,speed=1.2,minSz=0.4,maxSz=1.4,style={}}){
  const cvs=useRef(null);
  useEffect(()=>{
    const el=cvs.current;if(!el)return;
    const ctx=el.getContext('2d');
    let W=el.offsetWidth,H=el.offsetHeight;
    el.width=W;el.height=H;
    const hex=color.replace('#','');
    const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    const pts=Array.from({length:density},()=>({
      x:Math.random()*W,y:Math.random()*H,
      sz:minSz+Math.random()*(maxSz-minSz),op:Math.random(),
      dop:(Math.random()*.02+.005)*speed*(Math.random()<.5?1:-1),
      vx:(Math.random()-.5)*.22*speed,vy:(Math.random()-.5)*.22*speed,
    }));
    let raf,alive=true;
    const tick=()=>{
      if(!alive)return;
      ctx.clearRect(0,0,W,H);
      pts.forEach(p=>{
        p.op+=p.dop;
        if(p.op>1){p.op=1;p.dop*=-1;}if(p.op<.04){p.op=.04;p.dop*=-1;}
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);
        ctx.fillStyle=`rgba(${r},${g},${b},${p.op})`;ctx.fill();
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    const onR=()=>{W=el.offsetWidth;H=el.offsetHeight;el.width=W;el.height=H;pts.forEach(p=>{p.x=Math.random()*W;p.y=Math.random()*H;});};
    window.addEventListener('resize',onR);
    return()=>{alive=false;cancelAnimationFrame(raf);window.removeEventListener('resize',onR);};
  },[color,density,speed,minSz,maxSz]);
  return <canvas ref={cvs} style={{width:"100%",height:"100%",display:"block",pointerEvents:"none",...style}}/>;
}

function initialMarketingScreen(): string {
  if (typeof window === "undefined") return "splash";
  const mp = parseMarketingPath(window.location.pathname);
  if (mp.type === "privacy" || mp.type === "terms") return "legal";
  if (mp.type === "notFound") return "notFound";
  return "splash";
}

function initialLegalKind(): "privacy" | "terms" | null {
  if (typeof window === "undefined") return null;
  const mp = parseMarketingPath(window.location.pathname);
  if (mp.type === "privacy") return "privacy";
  if (mp.type === "terms") return "terms";
  return null;
}

// ── App ──
export default function App(){
  const[screen,setScreen]=useState(initialMarketingScreen);
  const[user,setUser]=useState<any>(null);
  const[theme,setTheme]=useState(()=>{
    try{
      const saved=localStorage.getItem("sa_theme");
      if(saved==="dark"||saved==="light")return saved;
      // Первый визит — уважаем системную тему пользователя
      if(typeof window!=="undefined"&&typeof window.matchMedia==="function"){
        return window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
      }
      return"dark";
    }catch{return"dark";}
  });
  const[palette,setPalette]=useState(()=>{try{return localStorage.getItem("sa_palette")||"indigo";}catch{return"indigo";}});
  const[project,setProject]=useState(null);
  const[cpProject,setCpProject]=useState<any>(null);
  const[cpMaps,setCpMaps]=useState<any[]>([]);
  const[mapData,setMapData]=useState(null);
  const[mapIsNew,setMapIsNew]=useState(false);
  const[mapReadOnly,setMapReadOnly]=useState(false);
  const[mapFocusNodeId,setMapFocusNodeId]=useState<string|null>(null);
  const[sharedMapData,setSharedMapData]=useState(null);
  const[showAuth,setShowAuth]=useState(false);
  const[authTab,setAuthTab]=useState("login");
  const[showProfile,setShowProfile]=useState(false);
  const[showTiers,setShowTiers]=useState(false);
  const[verifiedToast,setVerifiedToast]=useState(false);
  const[paymentToast,setPaymentToast]=useState(false);
  const[authChecked,setAuthChecked]=useState(false);
  const[loadError,setLoadError]=useState<string|null>(null);
  const[lang,setLang]=useState(()=>{try{return localStorage.getItem("sa_lang")||"ru";}catch{return"ru";}});
  const[legalKind,setLegalKind]=useState<"privacy"|"terms"|null>(initialLegalKind);
  function changeLang(l:string){setLang(l);localStorage.setItem("sa_lang",l);}

  // ── Global AI chat (единый диалог на всё приложение) ──
  const aiChatKey=`sa_ai_chat_${user?.email||"guest"}`;
  const[aiChatMsgs,setAiChatMsgs]=useState<any[]>(()=>{
    try{const s=localStorage.getItem(aiChatKey);if(s){const j=JSON.parse(s);return Array.isArray(j)?j:[];}}catch{}
    return [];
  });
  // При смене пользователя перечитываем его историю чата
  useEffect(()=>{
    try{
      const s=localStorage.getItem(aiChatKey);
      if(s){const j=JSON.parse(s);setAiChatMsgs(Array.isArray(j)?j:[]);}
      else setAiChatMsgs([]);
    }catch{setAiChatMsgs([]);}
  },[aiChatKey]);
  // Сохраняем историю чата постоянно (debounce)
  useEffect(()=>{
    try{
      const t=setTimeout(()=>{localStorage.setItem(aiChatKey,JSON.stringify(aiChatMsgs||[]));},250);
      return()=>clearTimeout(t);
    }catch{}
  },[aiChatKey,aiChatMsgs]);
  // Синхронизация темы и палитры из профиля пользователя (при загрузке с API и после сохранения)
  useEffect(()=>{
    if(!user?.theme&&!user?.palette)return;
    if(user.theme){setTheme(user.theme);try{localStorage.setItem("sa_theme",user.theme);}catch{}}
    if(user.palette){setPalette(user.palette);try{localStorage.setItem("sa_palette",user.palette);}catch{}}
  },[user?.email,user?.theme,user?.palette]);

  // Синхронизация темы и палитры с body до отрисовки — смена темы/палитры сразу меняет цвета (body[data-theme][data-palette] в CSS)
  const bodyPalette=screen==="landing"||screen==="legal"||screen==="notFound"?"indigo":(palette||"indigo");
  useLayoutEffect(()=>{
    const b=document.body;
    b.setAttribute("data-theme",theme);
    b.setAttribute("data-palette",bodyPalette);
  },[theme,bodyPalette]);
  useEffect(()=>{
    const b=document.body;
    if(b.getAttribute("data-theme")!==theme)b.setAttribute("data-theme",theme);
    if(b.getAttribute("data-palette")!==bodyPalette)b.setAttribute("data-palette",bodyPalette);
  },[theme,bodyPalette]);
  /* Лендинг: чёрный космос без орбов приложения — класс надёжнее CSS :has() */
  useLayoutEffect(()=>{
    const b=document.body;
    if(screen==="landing"||screen==="legal"||screen==="notFound")b.classList.add("sa-landing");
    else b.classList.remove("sa-landing");
    return()=>{b.classList.remove("sa-landing");};
  },[screen]);
  // t функция для LangCtx.Provider (App является корневым провайдером)
  const t = makeTfn(lang);

  const initRunningRef=useRef(false);
  const pendingDeepLinkRef=useRef<any>(null);

  async function openDeepLink(dl:any, userObj:any){
    try{
      if(!dl||!userObj?.email)return false;
      if(!API_BASE)return false;
      const ps=await getProjects(userObj.email);
      if(dl.open==="projects"){
        setScreen("projects");
        return true;
      }
      if(dl.open==="contentPlan"&&!dl.projectId){
        setScreen("contentPlanHub");
        return true;
      }
      const p=ps.find((x:any)=>x.id===dl.projectId);
      if(!p)return false;
      if(dl.open==="project"){
        setProject(p);setScreen("project");
        return true;
      }
      if(dl.open==="map"){
        const ms=await getMaps(p.id);
        const m=ms.find((x:any)=>x.id===dl.mapId);
        if(!m)return false;
        setProject(p);
        setMapData(m);
        setMapIsNew(false);
        setMapReadOnly(false);
        setMapFocusNodeId(dl.nodeId||null);
        setScreen("map");
        try{
          localStorage.setItem("sa_last_project",JSON.stringify({id:p.id,name:p.name}));
          localStorage.setItem("sa_last_map",JSON.stringify({id:m.id,name:m.name}));
        }catch{}
        return true;
      }
      if(dl.open==="contentPlan"){
        const ms=await getMaps(p.id);
        setCpProject(p);
        setCpMaps(ms||[]);
        setScreen("contentPlanProject");
        return true;
      }
    }catch{}
    return false;
  }

  async function initApp(){
    if(initRunningRef.current)return;
    initRunningRef.current=true;
    try{
      setLoadError(null);
      // Проверяем share-ссылку и deep-link в URL (поддерживаем query)
      const searchParams=new URLSearchParams(window.location.search);
      const shareFromQuery=searchParams.get("share");
      const openParam=(searchParams.get("open")||"").toLowerCase(); // projects | project | map | contentplan
      const dlProjectId=searchParams.get("projectId")||"";
      const dlMapId=searchParams.get("mapId")||"";
      const dlNodeId=searchParams.get("nodeId")||"";
      if(openParam==="projects"){
        pendingDeepLinkRef.current={open:openParam};
      } else if(openParam==="contentplan"){
        pendingDeepLinkRef.current=dlProjectId?{open:"contentPlan",projectId:dlProjectId}:{open:"contentPlan"};
      } else if((openParam==="project"||openParam==="map")&&dlProjectId){
        pendingDeepLinkRef.current={open:openParam,projectId:dlProjectId,mapId:dlMapId,nodeId:dlNodeId};
      }
      const hash=typeof window!=="undefined"?window.location.hash:"";
      const shareFromHash=hash.startsWith("#share=")?hash.slice(7).replace(/\?.*/,"").trim():"";
      const shareId=shareFromQuery||shareFromHash;
      const mp=parseMarketingPath(window.location.pathname);

      // Обработка успешной оплаты через Stripe (?payment=success&tier=pro)
      const paymentStatus=searchParams.get("payment");
      const paymentTierFromUrl=searchParams.get("tier");
      if(paymentStatus==="success"){
        window.history.replaceState({},"",window.location.pathname);
      }

      // Обработка подтверждения email через ссылку
      const verifiedParam=searchParams.get("verified");
      if(verifiedParam==="1"){
        window.history.replaceState({},"",window.location.pathname);
        // Перечитываем пользователя чтобы получить обновлённый email_verified
        if(API_BASE){
          try{
            const d=await apiFetch("/api/auth/me");
            if(d.user)setUser(normalizeUser(d.user));
          }catch{}
        }
        setVerifiedToast(true);
        setTimeout(()=>setVerifiedToast(false),4000);
      }

      if(shareId){
        try{
          let data:any=null;
          if(API_BASE){
            const d=await apiFetch(`/api/shares/${shareId}`);
            data={map:d.map,projectName:d.projectName||""};
          } else {
            data=await store.get("sa_share_"+shareId);
          }
          if(data&&data.map){setSharedMapData(data);setScreen("sharedMap");setAuthChecked(true);return;}
        }catch{}
      }
      await seedDefault();
      if(API_BASE){
        // Один запрос /api/auth/me — и проверка сессии, и получение данных пользователя
        const jwt=getJWT();
        if(jwt){
          try{
            const d=await apiFetch("/api/auth/me");
            if(d.user){
              let uNorm=normalizeUser(d.user);
              if(paymentStatus==="success"){
                const synced=await refreshUserAfterPayment(paymentTierFromUrl);
                if(synced)uNorm=synced;
                setUser(uNorm);
                setPaymentToast(true);
                setTimeout(()=>setPaymentToast(false),4000);
              }else{
                setUser(uNorm);
              }
              // Если в URL был deep-link — пробуем открыть сразу после login
              if(pendingDeepLinkRef.current){
                const ok=await openDeepLink(pendingDeepLinkRef.current,uNorm);
                if(ok){
                  pendingDeepLinkRef.current=null;
                  window.history.replaceState({},"",window.location.pathname);
                  setAuthChecked(true);
                  return;
                }
              }
              if(mp.type==="privacy"){
                setLegalKind("privacy");setScreen("legal");setAuthChecked(true);return;
              }
              if(mp.type==="terms"){
                setLegalKind("terms");setScreen("legal");setAuthChecked(true);return;
              }
              if(mp.type==="notFound"){
                setScreen("notFound");setAuthChecked(true);return;
              }
              if(mp.type==="home"){
                try{window.history.replaceState({},"","/app");}catch{}
              }
              setScreen("projects");setAuthChecked(true);return;
            }
          }catch(e:any){
            if(e.message==="session_expired"){clearJWT();clearRefreshToken();}
          }
        }
      } else {
        try{
          const sess=await getSession();
          if(sess?.email){
            const accs=await store.get("sa_acc")||[];
            const u=(accs as any[]).find((a:any)=>a.email===sess.email);
            if(u){
              const merged={...u,theme:u.theme||(typeof localStorage!=="undefined"?localStorage.getItem("sa_theme"):null)||"dark",palette:u.palette||(typeof localStorage!=="undefined"?localStorage.getItem("sa_palette"):null)||"indigo"};
              setUser(merged);
              if(mp.type==="privacy"){
                setLegalKind("privacy");setScreen("legal");setAuthChecked(true);return;
              }
              if(mp.type==="terms"){
                setLegalKind("terms");setScreen("legal");setAuthChecked(true);return;
              }
              if(mp.type==="notFound"){
                setScreen("notFound");setAuthChecked(true);return;
              }
              if(mp.type==="home"){
                try{window.history.replaceState({},"","/app");}catch{}
              }
              setScreen("projects");setAuthChecked(true);return;
            }
          }
        }catch{}
      }
      if(mp.type==="privacy"){
        setLegalKind("privacy");setScreen("legal");setAuthChecked(true);return;
      }
      if(mp.type==="terms"){
        setLegalKind("terms");setScreen("legal");setAuthChecked(true);return;
      }
      if(mp.type==="notFound"){
        setScreen("notFound");setAuthChecked(true);return;
      }
      if(mp.type==="app"){
        try{window.history.replaceState({},"","/");}catch{}
        setAuthTab("register");
        setShowAuth(true);
      }
      setScreen("landing");
      setAuthChecked(true);
    }catch(e:any){
      setLoadError(e?.message||"Не удалось загрузить данные");
      setAuthChecked(true);
    }finally{
      initRunningRef.current=false;
    }
  }

  useEffect(()=>{initApp();},[]);

  // Глобальный обработчик истёкшей сессии
  useEffect(()=>{
    const orig=window.fetch.bind(window);
    (window as any).__sa_onSessionExpired=()=>{
      setUser(null);setProject(null);setMapData(null);setCpProject(null);setCpMaps([]);
      try{window.history.replaceState({},"","/");}catch{}
      setScreen("landing");setShowAuth(true);setAuthTab("login");
    };
    return()=>{};
  },[]);

  function goMarketingHome(){
    try{
      if(user){
        window.history.replaceState({},"","/app");
        setScreen("projects");
      }else{
        window.history.pushState({},"","/");
        setScreen("landing");
      }
    }catch{
      setScreen(user?"projects":"landing");
    }
  }

  async function handleAuth(u:any,isNew:boolean){
    trackSaEvent(isNew?"sign_up":"login",{method:"email"});
    setUser(u);setShowAuth(false);
    try{window.history.replaceState({},"","/app");}catch{}
    if(isNew){setShowTiers(true);}
    else{setScreen("projects");}
  }

  async function onChangeTier(t){
    if(!user)return;
    const updated=await patchUser(user.email,{tier:t});
    if(updated)setUser(updated);
    setShowTiers(false);
    if(screen!=="projects"&&screen!=="project"&&screen!=="map"&&screen!=="contentPlanHub"&&screen!=="contentPlanProject")setScreen("projects");
  }

  async function onLogout(){
    await clearSession();
    setUser(null);setProject(null);setMapData(null);setCpProject(null);setCpMaps([]);
    setAiChatMsgs([]);
    try{window.history.replaceState({},"","/");}catch{}
    setScreen("landing");
  }

  function onSelectProject(p){
    setProject(p);setScreen("project");
    try{localStorage.setItem("sa_last_project",JSON.stringify({id:p.id,name:p.name}));localStorage.removeItem("sa_last_map");}catch{}
  }

  async function onOpenMap(map,proj,isNew,readOnlyMap=false,focusNodeId:string|null=null){
    setProject(proj);
    const fresh=await getMaps(proj.id);
    const m=fresh.find(x=>x.id===map.id)||map;
    setMapData(m);setMapIsNew(isNew||false);setMapReadOnly(readOnlyMap);setMapFocusNodeId(focusNodeId);setScreen("map");
    try{localStorage.setItem("sa_last_project",JSON.stringify({id:proj.id,name:proj.name}));localStorage.setItem("sa_last_map",JSON.stringify({id:m.id,name:m.name}));}catch{}
  }

  function toggleTheme(){
    const next=t=>t==="dark"?"light":"dark";
    const apply=()=>setTheme(t=>{
      const n=next(t);
      try{localStorage.setItem("sa_theme",n);document.body.setAttribute("data-theme",n);}catch{}
      if(API_BASE&&user?.email)patchUser(user.email,{theme:n}).then(u=>u&&setUser(u)).catch(()=>{});
      return n;
    });
    // View Transitions API: красивый cross-fade темы в браузерах Chromium/Edge/Safari 18+
    const doc:any=typeof document!=="undefined"?document:null;
    const reduced=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(doc&&typeof doc.startViewTransition==="function"&&!reduced){
      doc.startViewTransition(()=>apply());
    }else{
      apply();
    }
  }
  function changePalette(p:string){setPalette(p);try{localStorage.setItem("sa_palette",p);}catch{};try{document.body.setAttribute("data-palette",p);}catch{};if(API_BASE&&user?.email)patchUser(user.email,{palette:p}).then(u=>u&&setUser(u)).catch(()=>{});}

  if(showTiers){
    return(
      <LangCtx.Provider value={{lang,setLang:changeLang,t}}>
        <div className={"sa-strategy-ui "+(theme==="dark"?"dk":"lt")} data-theme={theme} data-palette={palette} style={{minHeight:"100vh",background:"var(--bg)",position:"relative",fontFamily:"'Inter',system-ui,sans-serif"}}>
          <StrategyShellBg/>
          <TierSelectionScreen isNew={true} currentUser={user} theme={theme} palette={palette}
            onSelect={onChangeTier}
            onBack={()=>{setShowTiers(false);setScreen("projects");}}
          />
        </div>
      </LangCtx.Provider>
    );
  }

  useEffect(()=>{
    applySeoForAppScreen(screen as "splash"|"landing"|"legal"|"notFound"|"projects"|"project"|"map"|"sharedMap"|"contentPlanHub"|"contentPlanProject",{legalKind});
  },[screen,legalKind]);

  useEffect(()=>{
    if(!["landing","legal","notFound"].includes(screen))return;
    const onPop=()=>{
      const mp=parseMarketingPath(window.location.pathname);
      if(mp.type==="privacy"){setLegalKind("privacy");setScreen("legal");return;}
      if(mp.type==="terms"){setLegalKind("terms");setScreen("legal");return;}
      if(mp.type==="notFound"){setScreen("notFound");return;}
      if(!user){
        if(mp.type==="app"){
          try{window.history.replaceState({},"","/");}catch{}
          setAuthTab("register");
          setShowAuth(true);
          setScreen("landing");
          return;
        }
        if(mp.type==="home"){setScreen("landing");return;}
      }else{
        if(mp.type==="home"){try{window.history.replaceState({},"","/app");}catch{}setScreen("projects");return;}
        if(mp.type==="app"){setScreen("projects");}
      }
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[user,screen]);

  // Кнопка «Назад» в браузере
  useEffect(()=>{
    if(screen==="splash"||screen==="landing"||screen==="sharedMap")return;
    const h=()=>{
      if(screen==="map"&&project){setMapData(null);setScreen("project");}
      else if(screen==="project"&&project){setProject(null);setScreen("projects");}
      else if(screen==="contentPlanProject"&&cpProject){setCpProject(null);setCpMaps([]);setScreen("contentPlanHub");}
      else if(screen==="contentPlanHub"){setScreen("projects");}
    };
    window.addEventListener("popstate",h);
    return()=>window.removeEventListener("popstate",h);
  },[screen,project,cpProject]);
  useEffect(()=>{
    if(screen==="project"&&project&&history.state?.screen!=="project")history.pushState({screen:"project",projectId:project.id},"","");
    else if(screen==="map"&&mapData&&history.state?.screen!=="map")history.pushState({screen:"map",mapId:mapData.id},"","");
    else if(screen==="contentPlanHub"&&history.state?.screen!=="contentPlanHub")history.pushState({screen:"contentPlanHub"},"","");
    else if(screen==="contentPlanProject"&&cpProject&&history.state?.screen!=="contentPlanProject")history.pushState({screen:"contentPlanProject",projectId:cpProject.id},"","");
  },[screen,project?.id,mapData?.id,cpProject?.id]);

  const appPalette=screen==="landing"||screen==="legal"||screen==="notFound"?undefined:palette;

  if(loadError)return(
    <LangCtx.Provider value={{lang,setLang:changeLang,t}}>
      <div data-theme={theme} data-palette={palette} className="screen-enter" style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:24}}>
<div className="glass-card" style={{padding:"32px 40px",borderRadius:20,border:"1px solid var(--glass-border-accent,var(--border))",boxShadow:"var(--glass-shadow-accent,none),0 24px 64px rgba(0,0,0,.3)",display:"flex",flexDirection:"column",alignItems:"center",gap:20,maxWidth:480}}>
          <div style={{fontSize:36,marginBottom:4}}>⚠️</div>
          <div style={{fontSize:18,fontWeight:800,color:"var(--text)",textAlign:"center"}}>{loadError}</div>
          <button className="btn-interactive" onClick={()=>{setLoadError(null);initApp();}} style={{padding:"16px 32px",borderRadius:14,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 24px var(--accent-glow)",transition:"transform .2s ease, box-shadow .25s ease"}}>{t("retry","Повторить")}</button>
          <div style={{fontSize:13.5,color:"var(--text5)",textAlign:"center",lineHeight:1.6}}>
            {t("load_error_hint","Если это происходит снова — проверьте подключение к интернету и доступность API. В офлайн‑режиме можно войти в демо‑аккаунт без сервера.")}
          </div>
        </div>
      </div>
    </LangCtx.Provider>
  );

  return(
    <LangCtx.Provider value={{lang,setLang:changeLang,t}}>
      <div data-theme={theme} data-palette={appPalette} className="screen-wrap" style={{minHeight:"100vh",background:screen==="landing"||screen==="legal"||screen==="notFound"?"transparent":"var(--bg)",transition:"background .35s ease, color .35s ease"}}>
<OfflineBanner/>
      <>
        {screen==="splash"&&<SplashScreen onDone={()=>{
          const mp=parseMarketingPath(window.location.pathname);
          if(mp.type==="app"){
            setAuthTab("register");
            setShowAuth(true);
            try{window.history.replaceState({},"","/");}catch{}
          }
          setScreen(prev=>{
            if(prev==="projects")return prev;
            if(prev!=="splash")return prev;
            return"landing";
          });
        }} theme={theme} authReady={authChecked}/>}
        {screen==="landing"&&(
          <div className="screen-enter" style={{height:"100%",minHeight:"100vh",overflow:"hidden",position:"relative"}}>
            <React.Suspense fallback={<SplashLoaderScreen theme={theme==="light"?"light":"dark"} text={t("loading","Загрузка…")}/>}>
              <ReferenceLandingView
                t={t}
                lang={lang}
                onChangeLang={changeLang}
                theme={theme}
                onToggleTheme={toggleTheme}
                onSignIn={()=>{trackSaEvent("cta_sign_in_open");setAuthTab("login");setShowAuth(true);}}
                onGetStarted={()=>{
                  trackSaEvent("cta_get_started");
                  setAuthTab("register");
                  setShowAuth(true);
                  try{window.history.replaceState({},"","/");}catch{}
                }}
              />
            </React.Suspense>
            {showAuth&&<AuthModal initialTab={authTab} theme={theme} onClose={()=>setShowAuth(false)} onAuth={handleAuth}/>}
          </div>
        )}
        {screen==="legal"&&legalKind&&(
          <LegalDocumentPage kind={legalKind} theme={theme} t={t} onHome={goMarketingHome}/>
        )}
        {screen==="notFound"&&(
          <NotFoundPage theme={theme} t={t} onHome={goMarketingHome}/>
        )}
        {screen==="sharedMap"&&sharedMapData&&(
          <MapEditor
            user={null} mapData={sharedMapData.map} project={{name:sharedMapData.projectName||""}}
            isNew={false} theme={theme} readOnly={true} palette={palette}
            onBack={()=>{setSharedMapData(null);setScreen("landing");if(typeof window!=="undefined")window.history.replaceState("","",window.location.pathname);}}
            onProfile={()=>{}}
            onToggleTheme={toggleTheme}
            onShellGlobalNav={()=>{}}
            aiChatMsgs={aiChatMsgs}
            aiChatSetMsgs={setAiChatMsgs}
          />
        )}
        {screen==="projects"&&user&&(
          <div className="screen-enter" style={{height:"100%",display:"flex",flexDirection:"column",flex:1}}>
            <TrialBanner user={user} onUpgrade={()=>setShowProfile(true)}/>
            <EmailVerifyBanner user={user}/>
            <ProjectsPage
              user={user} theme={theme}
              onSelectProject={onSelectProject}
              onOpenMap={onOpenMap}
              onLogout={onLogout}
              onChangeTier={(t:string)=>onChangeTier(t)}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              aiChatMsgs={aiChatMsgs}
              aiChatSetMsgs={setAiChatMsgs}
              onOpenContentPlanHub={()=>setScreen("contentPlanHub")}
              onOpenContentPlanProject={(p:any,m:any[])=>{setCpProject(p);setCpMaps(Array.isArray(m)?m:[]);setScreen("contentPlanProject");}}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={(u:any)=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </div>
        )}
        {screen==="contentPlanHub"&&user&&(
          <div className="screen-enter" style={{height:"100%",display:"flex",flexDirection:"column",flex:1}}>
            <TrialBanner user={user} onUpgrade={()=>setShowProfile(true)}/>
            <EmailVerifyBanner user={user}/>
            <ContentPlanHubPage
              user={user}
              theme={theme}
              onBackToStrategy={()=>setScreen("projects")}
              onOpenProject={(p:any,maps:any[])=>{setCpProject(p);setCpMaps(Array.isArray(maps)?maps:[]);setScreen("contentPlanProject");}}
              onLogout={onLogout}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              onUpgrade={()=>setShowProfile(true)}
              aiChatMsgs={aiChatMsgs}
              aiChatSetMsgs={setAiChatMsgs}
              onSelectProject={onSelectProject}
              onOpenMap={onOpenMap}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={(u:any)=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </div>
        )}
        {screen==="contentPlanProject"&&user&&cpProject&&(
          <div className="screen-enter" style={{height:"100%",display:"flex",flexDirection:"column",flex:1}}>
            <TrialBanner user={user} onUpgrade={()=>setShowProfile(true)}/>
            <EmailVerifyBanner user={user}/>
            <ContentPlanProjectPage
              user={user}
              project={cpProject}
              maps={cpMaps}
              theme={theme}
              onBackToHub={()=>{setCpProject(null);setCpMaps([]);setScreen("contentPlanHub");}}
              onOpenStrategyProject={()=>{setProject(cpProject);setCpProject(null);setCpMaps([]);setScreen("project");}}
              onLogout={onLogout}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              onChangeTier={onChangeTier}
              onUpgrade={()=>setShowProfile(true)}
              aiChatMsgs={aiChatMsgs}
              aiChatSetMsgs={setAiChatMsgs}
              onSelectProject={onSelectProject}
              onOpenMap={onOpenMap}
              onSwitchContentPlanProject={(p:any,m:any[])=>{setCpProject(p);setCpMaps(Array.isArray(m)?m:[]);}}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={(u:any)=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </div>
        )}
        {screen==="project"&&user&&project&&(
          <div className="screen-enter" style={{height:"100%",display:"flex",flexDirection:"column",flex:1}}>
            <ProjectDetail
              user={user} project={project} theme={theme}
              onBack={()=>setScreen("projects")}
              onOpenMap={onOpenMap}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              onChangeTier={onChangeTier}
              onUpgrade={()=>setShowProfile(true)}
              onOpenContentPlanHub={()=>setScreen("contentPlanHub")}
              onOpenContentPlanProject={(p:any,m:any[])=>{setCpProject(p);setCpMaps(Array.isArray(m)?m:[]);setScreen("contentPlanProject");}}
              aiChatMsgs={aiChatMsgs}
              aiChatSetMsgs={setAiChatMsgs}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={u=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </div>
        )}
        {screen==="map"&&user&&mapData&&project&&(
          <div className="screen-enter" style={{height:"100%",display:"flex",flexDirection:"column",flex:1}}>
            <MapEditor
              user={user} mapData={mapData} project={project}
              isNew={mapIsNew} theme={theme} readOnly={mapReadOnly} palette={palette}
              onBack={()=>setScreen("project")}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              onOpenContentPlanHub={()=>setScreen("contentPlanHub")}
              onOpenContentPlanProject={async()=>{
                if(!project?.id)return;
                try{
                  const ms=await getMaps(project.id);
                  setCpProject(project);
                  setCpMaps(Array.isArray(ms)?ms:[]);
                  setScreen("contentPlanProject");
                }catch{}
              }}
              onShellGlobalNav={(nav)=>{
                if(nav==="projects"){setMapData(null);setProject(null);setScreen("projects");}
                if(nav==="contentPlan")setScreen("contentPlanHub");
              }}
              aiChatMsgs={aiChatMsgs}
              aiChatSetMsgs={setAiChatMsgs}
              focusNodeId={mapFocusNodeId}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={u=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </div>
        )}
      {verifiedToast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 22px",borderRadius:12,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.4)",color:"#34d399",fontSize:14,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.4)",animation:"slideUp .3s ease",backdropFilter:"blur(12px)"}}>
          ✓ {t("verify_email_done","Email подтверждён")}
        </div>
      )}
      {paymentToast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 22px",borderRadius:12,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.4)",color:"#34d399",fontSize:14,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.4)",animation:"slideUp .3s ease",backdropFilter:"blur(12px)"}}>
          ✓ {t("payment_success","Оплата прошла успешно! Тариф обновлён.")}
        </div>
      )}
      {(screen==="landing"||screen==="legal"||screen==="notFound")&&<CookieConsent/>}
      </>
      </div>
    </LangCtx.Provider>
  );
}

// ── Bootstrap — монтируем приложение в DOM ──
import ReactDOM from "react-dom/client";
const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}