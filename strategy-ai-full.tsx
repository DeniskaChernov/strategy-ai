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
  patchUser,
  hashPw,
  normalizeProject,
  getProjects,
  saveProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
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
import { trackSaEvent } from "./client/analytics";
import {
  UUID_RE,
  isUUID,
  normalizeMap,
  edgePt,
  defaultNodes,
  topSort,
} from "./client/lib/map-utils";
import { getMaps, saveMap, deleteMap, getContentPlan, saveContentPlan } from "./client/lib/maps-api";
import { AI_KNOWLEDGE, AI_STRICT_RULES, AI_TIER, OB_TIER, MAP_TIER } from "./client/lib/ai-prompts";
import { LangCtx, useLang } from "./client/lang-context";
import { useIsMobile } from "./client/hooks/use-is-mobile";
import { SheetSwipeHandle } from "./client/components/sheet-swipe-handle";
import { ConfirmDialog } from "./client/strategy-modals/confirm-dialog";
import { AiHubModal, NotificationsCenterModal } from "./client/strategy-modals/notifications-ai-hub-modals";
import { TIERS } from "./client/lib/tiers";
import { getROLES, getSTATUS, getPRIORITY, getSTATUSES, getPRIORITIES, getETYPE, getTierPrice } from "./client/lib/strategy-labels";
import { callAI } from "./client/lib/call-ai";
import { StatsPopup } from "./client/strategy-modals/stats-popup";
import { VersionHistoryModal } from "./client/strategy-modals/version-history-modal";
import { WeeklyBriefingModal } from "./client/strategy-modals/weekly-briefing-modal";
import { ScenarioTemplatesModal } from "./client/strategy-modals/scenario-templates-modal";
import { TemplateModal } from "./client/strategy-modals/template-modal";
import { useNotifications } from "./client/hooks/use-notifications";
import { sanitize } from "./client/lib/sanitize";
import { MainWorkspaceNav } from "./client/components/main-workspace-nav";
import { Toggle } from "./client/components/toggle";
import { IconButton } from "./client/components/icon-button";
import { OfflineBanner } from "./client/components/offline-banner";
import { CustomSelect } from "./client/components/custom-select";
import { Toast } from "./client/components/toast";
import { NotifBell } from "./client/components/notif-bell";
import { MapTour } from "./client/components/map-tour";
import { AppTopBar } from "./client/components/app-top-bar";
import { SimulationModal } from "./client/strategy-modals/simulation-modal";
import { PillGroup } from "./client/components/pill-group";
import { MapConflictModal } from "./client/strategy-modals/map-conflict-modal";
import { ALL_FEATURES, TIER_FEAT_KEY, TIER_ORDER, TIER_MKT } from "./client/lib/tier-marketing-data";
import { FeatureValue } from "./client/components/feature-value";
import { TierSelectionScreen } from "./client/components/tier-selection-screen";
import { SavingScreen } from "./client/components/saving-screen";
import { AuthModal } from "./client/strategy-modals/auth-modal";
import { CookieConsent } from "./client/components/cookie-consent";
import { MiniMap } from "./client/components/mini-map";
import { GanttView } from "./client/components/gantt-view";
import { ProfileModal } from "./client/strategy-modals/profile-modal";
import { IconTrash } from "./client/components/icons";

const ROLES_C  ={owner:"#6836f5",editor:"#12c482",viewer:"#a8a4c8"};
const STATUS  ={planning:{c:"#6836f5"},active:{c:"#06b6d4"},completed:{c:"#12c482"},paused:{c:"#f09428"},blocked:{c:"#f04458"}};
const PRIORITY={low:{c:"#6c6480"},medium:{c:"#f09428"},high:{c:"#ea580c"},critical:{c:"#f04458"}};
const ETYPE_C ={requires:{c:"#6836f5",d:"none"},affects:{c:"#a050ff",d:"8,4"},blocks:{c:"#f04458",d:"4,3"},follows:{c:"#12c482",d:"12,4"}};

// utils карты и сетевой слой — см. client/lib/map-utils.ts и client/lib/maps-api.ts; callAI — client/lib/call-ai.ts

// AI-промпты, база знаний и готовые шаблоны — см. client/lib/ai-prompts.ts и client/lib/templates.ts



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
  const[lastAiQuestion,setLastAiQuestion]=useState("");
  const endRef=useRef(null);
  const inputRef=useRef(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    const reduced=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({top:el.scrollHeight,behavior:reduced?"auto":"smooth"});
  },[msgs,loading]);
  useEffect(()=>{if(!loading&&!generating){const t=setTimeout(()=>inputRef.current?.focus(),80);return()=>clearTimeout(t);}},[loading,generating]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью — задай первый вопрос."}]:hist,OB_TIER.free(""),300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{const txt=reply.trim();setLastAiQuestion(txt);setMsgs(m=>[...m,{role:"ai",text:txt}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:t("ai_network_err","Не удалось получить ответ AI. Проверьте сеть и ключ API. Попробуйте ещё раз.")}]);
      setLoading(false);
    }
  }
  async function submit(){
    if(!inp.trim()||loading||generating)return;
    const text=inp.trim();setInp("");
    const newMsgs=[...msgs,{role:"user",text}];setMsgs(newMsgs);
    const newHist=[...history,{role:"assistant",content:lastAiQuestion},{role:"user",content:text}].filter(h=>h.content);
    setHistory(newHist);
    if(qCount>=MAX_Q){await buildMap(newHist);}else{await askNext(newHist);}
  }
  const defaultEdges=[{id:"e1",source:"n1",target:"n2",type:"requires",label:""},{id:"e2",source:"n2",target:"n4",type:"requires",label:""},{id:"e3",source:"n3",target:"n4",type:"affects",label:""}];
  async function buildMap(hist){
    setGenerating(true);setMapGenFailed(false);
    setMsgs(m=>[...m,{role:"ai",text:t("analyzing_answers","Анализирую ваши ответы и строю персональную карту…")}]);
    const ctx=hist.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    try{
      const raw=await callAI([{role:"user",content:"Интервью:\n"+ctx+"\n\nСоздай стратегическую карту."}],MAP_TIER.free,1500);
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
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowAnchor:"auto" as any,padding:"20px",display:"flex",flexDirection:"column",gap:12,maxWidth:720,margin:"0 auto",width:"100%",scrollPaddingBottom:80}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
            <div style={{maxWidth:"80%",padding:"11px 15px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",background:m.role==="user"?"var(--accent-soft)":"var(--surface)",border:`1px solid ${m.role==="user"?"var(--accent-1)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
        {(loading||generating)&&(
          <div style={{display:"flex",gap:10,alignItems:"center",minHeight:42}}>
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
              <div style={{display:"flex",gap:6,paddingTop:4,flexWrap:"wrap"}}>
                {onConnect&&<button onClick={()=>onConnect({startNode:node})} style={{flex:"1 1 80px",padding:"8px 12px",borderRadius:8,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>⇒ {t("link_btn","Связать")}</button>}
                <button onClick={doAutoConnect} disabled={autoConnLoading} style={{flex:"1 1 80px",padding:"8px 12px",borderRadius:8,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:autoConnLoading?"var(--text4)":"var(--accent-2)",cursor:autoConnLoading?"wait":"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>{autoConnLoading?"…":"✦ AI"}</button>
                <button onClick={()=>{
                  try{
                    localStorage.setItem("sa_cp_prefill",JSON.stringify({title:node.title||"",brief:node.reason||node.action||"",strategyStepId:node.id,strategyStepTitle:node.title||"",ts:Date.now()}));
                    onNotify?.(t("cp_prefill_ready","Черновик публикации подготовлен. Откройте Контент-план."),"success");
                  }catch{}
                }} title={t("cp_create_from_step","Создать пост из шага")} style={{flex:"1 1 80px",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>📝 {t("cp_create_from_step_short","В контент-план")}</button>
                <button type="button" aria-label={t("delete","Удалить")} onClick={()=>onDelete(node.id)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.08)",color:"var(--red)",cursor:"pointer",fontSize:12,transition:"all .2s",display:"inline-flex",alignItems:"center",justifyContent:"center"}}><IconTrash/></button>
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
    if(!el){endRef.current?.scrollIntoView({block:"nearest"});return;}
    const reduced=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<160;
    if(nearBottom||msgs.length<=1){
      el.scrollTo({top:el.scrollHeight,behavior:reduced?"auto":"smooth"});
    }
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
        {load&&<div style={{display:"flex",gap:10,alignItems:"center",minHeight:42}}><div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,boxShadow:"0 2px 8px var(--accent-glow)"}}>◆</div><div style={{display:"flex",gap:4,padding:"10px 14px",background:"rgba(255,255,255,.04)",backdropFilter:"blur(8px)",borderRadius:"4px 14px 14px 14px",border:"1px solid var(--glass-border-accent,var(--border))"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`,opacity:.7}}/>)}</div></div>}
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
      <path className="sa-edge-line" d={d} fill="none" stroke={selected?"url(#sa-edge-grad)":et.c} strokeWidth={selected?2.6:Math.max(1.2,Math.min(3.6,(edge.weight||3)*0.6+0.4))} strokeDasharray={et.d==="none"?"none":et.d} opacity={selected?1:.68}/>
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
    <div role="status" className="sa-trial-banner" style={{position:"sticky",top:0,zIndex:5,background:"linear-gradient(90deg,var(--accent-soft),var(--accent-soft) 40%,rgba(104,54,245,.12))",borderBottom:"1px solid var(--accent-1)",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:13,flexWrap:"wrap"}}>
      <span style={{color:"var(--accent-2)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:6}}>
        <span className="sa-trial-flash" aria-hidden>⚡</span>
        {t("trial_active","Пробный период активен")}
        <span style={{padding:"2px 8px",borderRadius:999,background:"var(--accent-1)",color:"#fff",fontSize:11,fontWeight:800,animation:"sa-trial-pulse 2.6s ease-in-out infinite"}}>{daysLeft} {t("trial_days_left","дней осталось")}</span>
      </span>
      <button type="button" className="btn-p" onClick={onUpgrade} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:800}}>{t("upgrade","Улучшить →")}</button>
    </div>
  );
}

// ── EmailVerifyBanner ──
function EmailVerifyBanner({user,onVerified}:{user:any,onVerified?:()=>void}){
  const{t}=useLang();
  const[sent,setSent]=useState(false);
  const[loading,setLoading]=useState(false);
  const dismissKey=`sa_email_banner_dismissed_${user?.email||""}`;
  const[dismissed,setDismissed]=useState<boolean>(()=>{try{return localStorage.getItem(dismissKey)==="1";}catch{return false;}});
  // Если email уже подтверждён или нет API — не показываем; либо пользователь скрыл вручную
  if(!API_BASE||user?.emailVerified!==false||dismissed)return null;
  async function resend(){
    if(loading||sent)return;
    setLoading(true);
    try{
      await apiFetch("/api/auth/resend-verification",{method:"POST"});
      setSent(true);
    }catch{}
    setLoading(false);
  }
  function dismiss(){
    try{localStorage.setItem(dismissKey,"1");}catch{}
    setDismissed(true);
  }
  return(
    <div role="status" style={{position:"relative",background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(239,68,68,.08))",borderBottom:"1px solid rgba(245,158,11,.35)",padding:"8px 40px 8px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:13,flexWrap:"wrap"}}>
      <span style={{color:"#f09428",fontWeight:700,display:"inline-flex",alignItems:"center",gap:6}}>
        <span aria-hidden>✉️</span>
        {t("verify_email_banner","Подтвердите ваш email для полного доступа.")}
      </span>
      {sent?(
        <span style={{color:"#12c482",fontWeight:700,fontSize:12}}>{t("verify_email_sent","Письмо отправлено! Проверьте почту.")}</span>
      ):(
        <button type="button" className="btn-p" onClick={resend} disabled={loading} style={{padding:"5px 14px",borderRadius:8,fontSize:12,fontWeight:800}}>
          {loading?"…":t("verify_email_resend","Отправить письмо")}
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label={t("dismiss","Скрыть")} title={t("dismiss","Скрыть")} style={{position:"absolute",top:"50%",right:8,transform:"translateY(-50%)",width:24,height:24,padding:0,border:"none",background:"transparent",color:"var(--text4)",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
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
    <div role="status" aria-live="polite" className="sa-deadline-rem" style={{position:"fixed",bottom:80,right:20,zIndex:350,width:280,background:"var(--surface)",border:`1px solid ${overdue.length?"rgba(239,68,68,.4)":"rgba(245,158,11,.35)"}`,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.3)",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid var(--border)",background:overdue.length?"rgba(239,68,68,.08)":"rgba(245,158,11,.08)"}}>
        <span style={{fontSize:13,fontWeight:700,color:overdue.length?"#f04458":"#f09428"}}>⏰ {t("deadline_reminder","Напоминания")}{all.length>1?` · ${all.length}`:""}</span>
        <button onClick={()=>onDismiss?.()} title={t("dismiss","Скрыть")} aria-label={t("dismiss","Скрыть")} className="sa-dr-close" style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:16,lineHeight:1,padding:2,borderRadius:6}}>✕</button>
      </div>
      {all.slice(0,4).map(n=>{
        const d=new Date(n.deadline);
        const diff=Math.round((d.getTime()-now.getTime())/(1000*60*60*24));
        const isOverdue=d<now;
        return(
          <div key={n.id} onClick={()=>onGoToNode(n.id)} role="button" tabIndex={0}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onGoToNode(n.id);}}}
            className="sa-dr-row"
            aria-label={`${n.title} · ${isOverdue?t("days_overdue","просрочено {n}д.").replace("{n}",String(Math.abs(diff))):t("days_left","{n}д.").replace("{n}",String(diff))}`}
            style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",cursor:"pointer",transition:"background .15s",outline:"none"}}>
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

// ── MapEditor ──
function MapEditor({user,mapData,project,onBack,isNew,onProfile,onToggleTheme,theme,readOnly=false,aiChatMsgs,aiChatSetMsgs,focusNodeId=null,palette="indigo",onOpenContentPlanHub=null,onOpenContentPlanProject=null,onShellGlobalNav}){
  const{t,lang,setLang}=useLang();
  const isMobile=useIsMobile();
  const[accHex,setAccHex]=useState({a1:"#6836f5",a2:"#a050ff"});
  const[sidebarCollapsed,setSidebarCollapsed]=useState<boolean>(()=>{
    try{return localStorage.getItem("sa_map_sb_collapsed")==="1";}catch{return false;}
  });
  useEffect(()=>{try{localStorage.setItem("sa_map_sb_collapsed",sidebarCollapsed?"1":"0");}catch{}},[sidebarCollapsed]);
  useEffect(()=>{
    document.body.classList.add("sa-route-map");
    return()=>{document.body.classList.remove("sa-route-map");};
  },[]);
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
        const tok=getJWT();
        if(tok)socket.auth={...socket.auth,token:tok};
        addToast(t("ws_reconnecting","Соединение потеряно — пробую переподключиться…"),"warn");
      });
      socket.io.on("reconnect",()=>{
        addToast(t("ws_reconnected","Соединение восстановлено"),"success");
      });
      socket.on("disconnect",(reason:string)=>{
        if(reason==="io server disconnect"||reason==="transport close")
          addToast(t("ws_disconnected","Соединение прервано"),"warn");
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
        <AppTopBar
          title={mapData?.name||t("shell_strategy_map","Карта стратегии")}
          subtitle={project?.name||""}
          flowHint={t("workspace_flow_hint_map","Шаги и связи — контекст для сценариев, Gantt и AI.")}
          leftAddon={
            <button
              type="button"
              className={"sa-shell-burger"+(sidebarCollapsed?" on":"")}
              onClick={()=>setSidebarCollapsed(c=>!c)}
              title={sidebarCollapsed?t("shell_show_sidebar","Показать панель"):t("shell_hide_sidebar","Скрыть панель")}
              aria-label={sidebarCollapsed?t("shell_show_sidebar","Показать панель"):t("shell_hide_sidebar","Скрыть панель")}
              aria-pressed={sidebarCollapsed}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          }
          rightContent={
            <>
              {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)}/>}
              {!readOnly&&(
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:saveState==="saving"?"#f09428":saveState==="error"?"#f04458":"#12c482"}}>
                  {saveState==="saving"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> {t("saving","Сохраняю")}</>:saveState==="error"?<>✗ {t("save_error","Ошибка")}</>:<>✓ {t("saved_short","Сохранено")}</>}
                </div>
              )}
              {!readOnly&&user&&(
                <button type="button" className="btn-ic" onClick={onProfile} title={t("profile_title","Профиль")} aria-label={t("profile_title","Профиль")}>{(user?.name||user?.email||"U")[0].toUpperCase()}</button>
              )}
            </>
          }
        />
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
              options={[{value:"all",label:isMobile?t("all_statuses_short","Статусы"):t("all_statuses","Все статусы")},...Object.entries(STATUS).map(([k,s])=>{const x=s as {label:string;c:string};return{value:k,label:x.label,dot:x.c};})]}
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

        {user&&onOpenContentPlanHub&&!(shellUi&&sidebarCollapsed)&&(
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
              options={Object.entries(ETYPE).map(([k,e])=>{const x=e as {label:string;c:string};return{value:k,label:x.label,dot:x.c};})}
            />
            <input value={selEdge.label||""} onChange={e=>{const ne={...selEdge,label:e.target.value};setEdgesUser(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}} placeholder="Подпись…" style={{fontSize:13,padding:"5px 10px",background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit",width:120}}/>
            <input type="number" min={1} max={5} value={selEdge.weight||3} onChange={e=>{const w=Math.max(1,Math.min(5,Number(e.target.value)||3));const ne={...selEdge,weight:w};setEdgesUser(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}} title={t("edge_weight","Вес 1–5")} style={{fontSize:13,padding:"5px 6px",width:54,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
            <input value={selEdge.note||""} onChange={e=>{const ne={...selEdge,note:e.target.value};setEdgesUser(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}} placeholder={t("edge_note_ph","Заметка…")} title={t("edge_note","Внутренняя заметка о связи")} style={{fontSize:13,padding:"5px 10px",background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit",width:140}}/>
            <button type="button" onClick={()=>{pushUndo(nodes,edges);setEdgesUser(es=>es.filter(x=>x.id!==selEdge.id));setSelEdge(null);}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"var(--red)",cursor:"pointer",fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6}}><IconTrash/> {t("delete","Удалить")}</button>
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
                  <button type="button" onClick={()=>{const ids=selNodes.size>1?Array.from(selNodes):[ctxMenu.node.id];pushUndo(nodes,edges);setNodes(ns=>ns.filter(n=>!ids.includes(n.id)));setEdgesUser(es=>es.filter(e=>!ids.includes(e.source)&&!ids.includes(e.target)));setSelNodes(new Set());setSelNode(null);setCtxMenu(null);}} style={{width:"100%",padding:"12px 20px",border:"none",background:"none",color:"var(--red)",fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}><IconTrash/> {selNodes.size>1?t("delete_selected","Удалить выбранные")+` (${selNodes.size})`:t("delete","Удалить")}</button>
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
            <div className="glass-panel glass-panel-lg" style={{borderRadius:isMobile?"18px 18px 0 0":24,maxWidth:440,width:isMobile?"100%":"90%",maxHeight:isMobile?"78vh":"none",display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
              <SheetSwipeHandle enabled={isMobile} onClose={()=>setShowShortcuts(false)} />
              <div style={{padding:"32px 36px",flex:1,minHeight:0,overflowY:isMobile?"auto":"visible"}}>
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
          collapsed={sidebarCollapsed}
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
          <GlowCard plain panelVariant glowColor="accent" customSize width="100%" className="sa-ref-panel sa-ref-panel--lift sa-page-reveal sa-pr-d1" style={{marginBottom:24}}>
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
  const[showMobileSearch,setShowMobileSearch]=useState(false);
  const[creating,setCreating]=useState(false);
  const[newName,setNewName]=useState("");
  const[delId,setDelId]=useState<string|null>(null);
  const[showNotifs,setShowNotifs]=useState(false);
  const{notifs,setNotifs,notifUnread,setNotifUnread,notifLoading,loadNotifications}=useNotifications(showNotifs,user?.email);
  const[showAIHub,setShowAIHub]=useState(false);
  const[showBriefing,setShowBriefing]=useState(false);
  const tier=TIERS[user?.tier||"free"]||TIERS.free;
  const[kebabId,setKebabId]=useState<string|null>(null);
  const[renameId,setRenameId]=useState<string|null>(null);
  const[renameDraft,setRenameDraft]=useState("");
  const[sortMode,setSortMode]=useState<string>(()=>{try{return localStorage.getItem("sa_proj_sort")||"recent";}catch{return"recent";}});
  const[roleFilter,setRoleFilter]=useState<string>(()=>{try{return localStorage.getItem("sa_proj_role")||"all";}catch{return"all";}});
  useEffect(()=>{try{localStorage.setItem("sa_proj_sort",sortMode);}catch{}},[sortMode]);
  useEffect(()=>{try{localStorage.setItem("sa_proj_role",roleFilter);}catch{}},[roleFilter]);
  useEffect(()=>{
    if(!kebabId)return;
    const close=(e:any)=>{if(!e.target.closest?.(".sa-proj-kebab"))setKebabId(null);};
    window.addEventListener("click",close);
    return()=>window.removeEventListener("click",close);
  },[kebabId]);
  async function duplicateProject(p:ProjectLite){
    const tier2=TIERS[user.tier]||TIERS.free;
    if(projects.filter(x=>x.owner===user.email).length>=tier2.projects){
      setToast({msg:t("project_limit","Лимит проектов"),type:"error"});setTimeout(()=>setToast(null),3000);return;
    }
    const copy={id:uid(),name:(p.name||"Проект")+" — копия",owner:user.email,members:[{email:user.email,role:"owner"}],createdAt:Date.now()} as any;
    try{
      const saved=await saveProject(copy);
      const finalP=saved||copy;
      setProjects(ps=>[...ps,finalP]);
      setMaps(m=>({...m,[finalP.id]:[]}));
      setToast({msg:t("project_duplicated","Проект скопирован"),type:"success"});setTimeout(()=>setToast(null),2400);
    }catch(e:any){setToast({msg:e?.message||t("save_error","Ошибка сохранения"),type:"error"});setTimeout(()=>setToast(null),3000);}
  }
  async function renameProject(id:string,name:string){
    const p=projects.find(x=>x.id===id);
    if(!p||!name.trim())return;
    const next={...p,name:name.trim()} as any;
    try{
      await saveProject(next);
      setProjects(ps=>ps.map(x=>x.id===id?next:x));
    }catch(e:any){setToast({msg:e?.message||t("save_error","Ошибка сохранения"),type:"error"});setTimeout(()=>setToast(null),3000);}
  }

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
  useEffect(()=>{
    if(!showMobileSearch)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setShowMobileSearch(false);};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[showMobileSearch]);

  function openSearchResult(r:any){
    try{
      const proj=projects.find((p:any)=>p.id===r.projectId)||{id:r.projectId,name:r.subtitle||"Проект"};
      if(r.type==="map")onOpenMap({id:r.id},proj,false,false);
      else if(r.type==="node")onOpenMap({id:r.mapId},proj,false,false,r.id);
      setSearchResults([]);
      setSearch("");
      setShowMobileSearch(false);
    }catch{}
  }

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

  const filtered=(()=>{
    let arr=projects.filter((p:ProjectLite)=>p.name.toLowerCase().includes(search.toLowerCase()));
    if(roleFilter==="owner")arr=arr.filter(p=>p.owner===user.email);
    else if(roleFilter==="member")arr=arr.filter(p=>p.owner!==user.email);
    const sorted=[...arr];
    if(sortMode==="name")sorted.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    else if(sortMode==="oldest")sorted.sort((a,b)=>((a as any).createdAt||0)-((b as any).createdAt||0));
    else sorted.sort((a,b)=>((b as any).createdAt||0)-((a as any).createdAt||0));
    return sorted;
  })();
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
          {isMobile&&(
            <button type="button" className="btn-g" onClick={()=>setShowMobileSearch(true)} title={t("search_projects_hint","Поиск по проектам и картам…")} aria-label={t("search_projects_hint","Поиск по проектам и картам…")} style={{height:32,padding:"0 10px",fontSize:13}}>
              🔍
            </button>
          )}
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
      {isMobile&&showMobileSearch&&(
        <div id="search-overlay" className="open" style={{position:"fixed",inset:0,zIndex:420,padding:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.72))",backdropFilter:"blur(10px)",display:"flex",alignItems:"stretch",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)setShowMobileSearch(false);}}>
          <div role="dialog" aria-modal="true" aria-label={t("search_projects_hint","Поиск по проектам и картам…")} style={{width:"100%",maxWidth:"100%",height:"100%",background:"var(--bg)",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--border)",background:"var(--surface)"}}>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search_projects_hint","Поиск по проектам и картам…")} className="input-smooth" style={{flex:1,padding:"11px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
              <button type="button" className="btn-g" onClick={()=>setShowMobileSearch(false)} style={{height:36,padding:"0 12px",fontSize:12.5}}>{t("close","Закрыть")}</button>
            </div>
            <div style={{flex:1,overflow:"auto",padding:"10px 12px 16px",background:"var(--bg)"}}>
              {API_BASE&&((search||"").trim().length>=2)?(
                searching&&searchResults.length===0?(
                  <div style={{padding:"10px 6px",fontSize:13,color:"var(--text5)"}}>{t("loading_short","Загрузка…")}</div>
                ):searchResults.length===0?(
                  <div style={{padding:"10px 6px",fontSize:13,color:"var(--text5)"}}>{t("search_empty","Ничего не найдено")}</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {searchResults.slice(0,30).map((r:any)=>(
                      <button key={`${r.type}:${r.id}`} className="btn-interactive" onClick={()=>openSearchResult(r)} style={{textAlign:"left",padding:"11px 12px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
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
                )
              ):(
                <div style={{padding:"10px 6px",fontSize:13,color:"var(--text5)"}}>{t("search_type_more","Введите минимум 2 символа")}</div>
              )}
            </div>
          </div>
        </div>
      )}
      {shellUi&&(
        <AppTopBar
          title={t("your_projects","Мои проекты")}
          subtitle={`${myCount}${!Number.isFinite(tier.projects)?"":" / "+tier.projects} · ${tier.label}`}
          flowHint={t("workspace_flow_hint_projects","Проект → карта → сценарии, таймлайн и AI — одна логика работы.")}
          rightContent={
            <>
              {onOpenContentPlanHub&&<MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={false}/>}
              <button type="button" className="btn-g" onClick={()=>setShowAIHub(true)} title={t("ai_hub_title","✦ AI (единый чат)")} style={{height:32,fontSize:11.5,padding:"0 12px",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                <span aria-hidden>✦</span>{t("ai_hub_btn_short","AI-чат")}
              </button>
              {API_BASE&&<NotifBell unread={notifUnread} onClick={()=>setShowNotifs(true)} className="btn-ic"/>}
            </>
          }
        />
      )}
      <div className={shellUi?"scr":undefined} style={{flex:1,overflowY:shellUi?undefined:"auto",padding:shellUi?0:isMobile?16:24,paddingBottom:isMobile?96:undefined,position:"relative",zIndex:5,minHeight:0}}>
        <div style={{maxWidth:shellUi?"min(1440px,100%)":960,width:"100%",margin:"0 auto"}}>
          {isMobile&&onOpenContentPlanHub&&(
            <div style={{marginBottom:18}}>
              <MainWorkspaceNav mode="strategy" onStrategy={()=>{}} onContentPlan={onOpenContentPlanHub} t={t} isMobile={true}/>
            </div>
          )}
          <div className="sa-projects-sticky-head" style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:20,marginBottom:24,position:"sticky",top:0,zIndex:20,padding:"14px 4px",margin:"0 -4px 24px",background:"color-mix(in srgb,var(--bg) 72%,transparent)",backdropFilter:"blur(18px)",borderBottom:".5px solid var(--b1)"}}>
            <div>
              <h1 style={{fontSize:isMobile?18:22,fontWeight:900,color:"var(--text)",letterSpacing:-.5,marginBottom:2}}>{t("your_projects","Мои проекты")}</h1>
              <div style={{fontSize:13.5,color:"var(--text3)"}}>{t("projects_of_limit","{cur} из {max} проектов").replace("{cur}",String(myCount)).replace("{max}",!Number.isFinite(tier.projects)?"∞":String(tier.projects))}</div>
            </div>
            {!isMobile&&<div style={{flex:1}}/>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} title={t("filter_role","Фильтр по роли")} style={{padding:"9px 12px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                <option value="all">{t("filter_all","Все")}</option>
                <option value="owner">{t("filter_owner","Мои")}</option>
                <option value="member">{t("filter_member","Где я участник")}</option>
              </select>
              <select value={sortMode} onChange={e=>setSortMode(e.target.value)} title={t("sort_label","Сортировка")} style={{padding:"9px 12px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                <option value="recent">{t("sort_recent","Недавние")}</option>
                <option value="oldest">{t("sort_oldest","Старые")}</option>
                <option value="name">{t("sort_name","По имени")}</option>
              </select>
              <div style={{position:"relative",flex:isMobile?1:undefined}}>
                {isMobile?(
                  <button type="button" className="btn-interactive" onClick={()=>setShowMobileSearch(true)} style={{height:38,padding:"0 12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:12.5,fontWeight:700,minWidth:170,textAlign:"left"}}>
                    🔍 {search?search:t("search_projects_hint","Поиск по проектам и картам…")}
                  </button>
                ):(
                  <>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search_projects_hint","Поиск по проектам и картам…")} className="input-smooth" style={{padding:"10px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",width:220,minWidth:140,fontFamily:"inherit"}}/>
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
                                <button key={`${r.type}:${r.id}`} className="btn-interactive" onClick={()=>openSearchResult(r)} style={{textAlign:"left",padding:"10px 12px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
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
                  </>
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
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,marginBottom:2}}>
                          <div className="icard-title" style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{p.name}</div>
                          <span style={{flexShrink:0,padding:"2px 7px",borderRadius:999,border:"1px solid var(--border)",background:"var(--surface2)",fontSize:10,fontWeight:800,color:"var(--text4)",textTransform:"uppercase",letterSpacing:".04em"}}>
                            {tier.label}
                          </span>
                        </div>
                        <div className="icard-desc" style={{fontSize:13}}>{roleLabel} · {(p.createdAt||p.created_at)?new Date(p.createdAt||p.created_at).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"numeric",month:"short"}):"—"}</div>
                      </div>
                      <div className="sa-proj-kebab" style={{position:"relative"}}>
                        <button type="button" aria-haspopup="menu" aria-expanded={kebabId===p.id} aria-label={t("more_actions","Действия")} onClick={(e)=>{e.stopPropagation();setKebabId(kebabId===p.id?null:p.id);}} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:16,lineHeight:1,padding:0}}>⋯</button>
                        {kebabId===p.id&&(
                          <div role="menu" onClick={e=>e.stopPropagation()} style={{position:"absolute",top:32,right:0,minWidth:180,padding:6,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",boxShadow:"0 12px 32px rgba(0,0,0,.25)",zIndex:50,display:"flex",flexDirection:"column",gap:2}}>
                            <button role="menuitem" onClick={()=>{setKebabId(null);onSelectProject(p);}} style={{textAlign:"left",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:13}}>↗ {t("open","Открыть")}</button>
                            {p.owner===user.email&&(
                              <button role="menuitem" onClick={()=>{setKebabId(null);setRenameId(p.id);setRenameDraft(p.name||"");}} style={{textAlign:"left",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:13}}>✎ {t("rename","Переименовать")}</button>
                            )}
                            <button role="menuitem" onClick={()=>{setKebabId(null);duplicateProject(p);}} style={{textAlign:"left",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:13}}>⎘ {t("duplicate","Дублировать")}</button>
                            {p.owner===user.email&&(
                              <button type="button" role="menuitem" onClick={()=>{setKebabId(null);setDelId(p.id);}} style={{textAlign:"left",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"var(--red)",cursor:"pointer",fontSize:13,display:"inline-flex",alignItems:"center",gap:8}}><IconTrash/> {t("delete","Удалить")}</button>
                            )}
                          </div>
                        )}
                      </div>
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
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
                      <button onClick={()=>setCreating(true)} className="btn-smooth" style={{marginTop:8,padding:"11px 22px",borderRadius:12,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 6px 20px var(--accent-glow)"}}>+ {t("new_project","Новый проект")}</button>
                      <button onClick={()=>setShowAIHub(true)} className="btn-smooth" style={{marginTop:8,padding:"11px 22px",borderRadius:12,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-1)",cursor:"pointer",fontSize:14,fontWeight:700}}>✦ {t("ask_ai_to_help","Спросить AI с чего начать")}</button>
                    </div>
                  )}
                  {!search.trim()&&projects.length===0&&(
                    <div style={{marginTop:16,maxWidth:520,fontSize:13,color:"var(--text4)",lineHeight:1.6,textAlign:"left"}}>
                      <div style={{fontWeight:800,color:"var(--text2)",marginBottom:8}}>{t("onboard_steps_title","Как начать за 3 шага:")}</div>
                      <div>1. {t("onboard_step1","Создайте проект — это контейнер для карт и контент-плана.")}</div>
                      <div>2. {t("onboard_step2","Откройте карту, добавьте узлы или примените шаблон.")}</div>
                      <div>3. {t("onboard_step3","Запустите AI-чат — он подскажет следующий шаг.")}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isMobile&&(
        <div role="tablist" aria-label={t("workspace_nav_aria","Разделы приложения")} style={{position:"fixed",left:12,right:12,bottom:10,zIndex:330,display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,padding:8,borderRadius:16,background:"color-mix(in srgb,var(--surface) 92%, transparent)",backdropFilter:"blur(14px)",border:"1px solid var(--border)",boxShadow:"0 10px 28px rgba(0,0,0,.28)"}}>
          <button type="button" role="tab" aria-selected={true} className="btn-interactive" style={{height:42,borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",fontSize:11.5,fontWeight:800}}>{t("shell_projects","Проекты")}</button>
          <button type="button" role="tab" aria-selected={false} className="btn-interactive" onClick={()=>onOpenContentPlanHub?.()} style={{height:42,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:11.5,fontWeight:700}}>{t("nav_workspace_content","Контент-план")}</button>
          <button type="button" role="tab" aria-selected={false} className="btn-interactive" onClick={()=>setShowAIHub(true)} style={{height:42,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:11.5,fontWeight:700}}>✦ AI</button>
          <button type="button" role="tab" aria-selected={false} className="btn-interactive" onClick={onProfile} style={{height:42,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:11.5,fontWeight:700}}>{t("profile_title","Профиль")}</button>
        </div>
      )}
      {delId&&<ConfirmDialog title={t("delete_project","Удалить проект?")} message={t("delete_project_desc","Все карты и данные проекта будут удалены без возможности восстановления.")} confirmLabel={t("delete","Удалить")} onConfirm={()=>deleteProj(delId)} onCancel={()=>setDelId(null)} danger={true}/>}
      {renameId&&(
        <div className="modal-backdrop" style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.7))",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(12px)",padding:16}} onClick={e=>{if(e.target===e.currentTarget){setRenameId(null);setRenameDraft("");}}} onKeyDown={e=>{if(e.key==="Escape"){setRenameId(null);setRenameDraft("");}}}>
          <div className="glass-panel" role="dialog" aria-modal="true" aria-label={t("rename_project","Переименовать проект")} data-theme={theme} style={{width:"min(96vw,420px)",borderRadius:18,padding:22}}>
            <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:14}}>✎ {t("rename_project","Переименовать проект")}</div>
            <input autoFocus value={renameDraft} onChange={e=>setRenameDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){renameProject(renameId,renameDraft);setRenameId(null);}else if(e.key==="Escape"){setRenameId(null);setRenameDraft("");}}} placeholder={t("project_name","Название")} style={{width:"100%",padding:"10px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",outline:"none",fontFamily:"inherit",marginBottom:14}}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button type="button" onClick={()=>{setRenameId(null);setRenameDraft("");}} style={{padding:"9px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("cancel","Отмена")}</button>
              <button type="button" disabled={!renameDraft.trim()} onClick={()=>{renameProject(renameId,renameDraft);setRenameId(null);}} style={{padding:"9px 22px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:renameDraft.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:800,opacity:renameDraft.trim()?1:.5}}>{t("save","Сохранить")}</button>
            </div>
          </div>
        </div>
      )}
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

// ── ContentPlanTab (Pro+): ведение контент-плана по проекту, связь с шагами стратегии ──
const CONTENT_TYPES=[{id:"post",labelKey:"content_type_post",fb:"Пост"},{id:"story",labelKey:"content_type_story",fb:"История"},{id:"email",labelKey:"content_type_email",fb:"Рассылка"},{id:"video",labelKey:"content_type_video",fb:"Видео"}];
const CONTENT_CHANNELS=[{id:"blog",labelKey:"content_channel_blog",fb:"Блог"},{id:"instagram",labelKey:"content_channel_instagram",fb:"Instagram"},{id:"telegram",labelKey:"content_channel_telegram",fb:"Telegram"},{id:"vk",labelKey:"content_channel_vk",fb:"ВКонтакте"},{id:"youtube",labelKey:"content_channel_youtube",fb:"YouTube"},{id:"email",labelKey:"content_channel_email",fb:"Email"}];
const CONTENT_STATUSES=[{id:"draft",labelKey:"content_status_draft",fb:"Черновик"},{id:"scheduled",labelKey:"content_status_scheduled",fb:"Запланировано"},{id:"published",labelKey:"content_status_published",fb:"Опубликовано"}];

function ContentPlanTab({projectId,projectName,maps,user,theme,lang,t,onChangeTier}:{projectId:string;projectName:string;maps:any[];user:any;theme:string;lang:string;t:(k:string,fb?:string)=>string;onChangeTier:(tier:string)=>void}){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [editId,setEditId]=useState<string|null>(null);
  const [filterStatus,setFilterStatus]=useState<string>("all");
  const _cpKey=projectId||"all";
  const _viewKey=`sa_cp_view_${_cpKey}`;
  const _dateKey=`sa_cp_date_${_cpKey}`;
  const [viewMode,setViewMode]=useState<"calendar"|"map"|"list"|"tree">(()=>{try{const v=localStorage.getItem(_viewKey);return(v==="calendar"||v==="map"||v==="list"||v==="tree")?v:"calendar";}catch{return"calendar";}});
  useEffect(()=>{try{localStorage.setItem(_viewKey,viewMode);}catch{}},[_viewKey,viewMode]);
  const [aiSuggesting,setAiSuggesting]=useState(false);
  const [pendingDeleteId,setPendingDeleteId]=useState<string|null>(null);
  const [cpCalendarDate,setCpCalendarDate]=useState<Date>(()=>{
    try{
      const s=localStorage.getItem(_dateKey);
      if(s){const d=new Date(s);if(!isNaN(d.getTime()))return d;}
    }catch{}
    return new Date();
  });
  useEffect(()=>{try{localStorage.setItem(_dateKey,cpCalendarDate.toISOString());}catch{}},[_dateKey,cpCalendarDate]);
  const [newItemPresetDate,setNewItemPresetDate]=useState<string>("");
  const [toast,setToast]=useState<{msg:string;type:string}|null>(null);
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
  // ── prefill из стратегии: «Создать пост из шага» ──
  const[cpPrefill,setCpPrefill]=useState<any>(null);
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("sa_cp_prefill");
      if(!raw)return;
      const data=JSON.parse(raw);
      if(!data||(Date.now()-(data.ts||0))>10*60*1000){localStorage.removeItem("sa_cp_prefill");return;}
      setCpPrefill(data);
      setEditId("new");
      localStorage.removeItem("sa_cp_prefill");
    }catch{}
  },[]);

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
    let list=items.some((x:any)=>x.id===id)?items.map((x:any)=>x.id===id?next:x):[...items,next];
    // Recurring posts: при создании новой записи с recur — генерируем доп. копии вперёд.
    if(!item.id&&next.recur&&next.scheduledDate){
      const stepDays=next.recur==="weekly"?7:next.recur==="biweekly"?14:0;
      if(stepDays){
        const base=new Date(next.scheduledDate);
        if(!isNaN(base.getTime())){
          const copies:any[]=[];
          for(let i=1;i<=4;i++){
            const d=new Date(base.getTime()+stepDays*i*864e5);
            const ymd=d.toISOString().slice(0,10);
            copies.push({...next,id:uid(),scheduledDate:ymd,recur:"",updatedAt:Date.now(),recurParentId:id});
          }
          list=[...list,...copies];
        }
      }
    }
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
      setToast({msg:t("cp_ai_added","Добавлено идей: {n}").replace("{n}",String(newItems.length)),type:"success"});
      setTimeout(()=>setToast(null),3000);
    }catch(e:any){
      setToast({msg:e?.message||t("cp_ai_err","Не удалось получить идеи. Попробуйте ещё раз."),type:"error"});
      setTimeout(()=>setToast(null),4000);
    }
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
              <button type="button" className="btn-interactive" onClick={e=>{e.stopPropagation();removeItem(it.id);}} title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",String(it.title||"").slice(0,80))} style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"var(--red)",cursor:"pointer",fontSize:12,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><IconTrash/></button>
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
          draggable
          onDragStart={e=>{
            e.dataTransfer.setData("application/x-sa-cp-id",it.id);
            e.dataTransfer.effectAllowed="move";
          }}
          aria-label={t("content_card_open_aria","Открыть публикацию: {title}").replace("{title}",String(it.title||t("untitled","Без названия")).slice(0,120))}
          style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",cursor:"grab",outline:"none"}}
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
          <button type="button" className="btn-interactive" onClick={e=>{e.stopPropagation();removeItem(it.id);}} title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",String(it.title||"").slice(0,80))} style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"var(--red)",cursor:"pointer",fontSize:12,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><IconTrash/></button>
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
            highlightedDates={Array.from(new Set(filtered.filter((x:any)=>x.scheduledDate).map((x:any)=>x.scheduledDate)))}
            dropMime="application/x-sa-cp-id"
            onItemDrop={async(date:Date,id:string)=>{
              const ymd=dateToYMD(date);
              const next=items.map((x:any)=>x.id===id?{...x,scheduledDate:ymd,updatedAt:Date.now()}:x);
              setItems(next);
              await saveContentPlan(projectId,next);
            }}
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
                  <button type="button" onClick={()=>removeItem(it.id)} className="btn-interactive" title={t("delete","Удалить")} aria-label={t("content_delete_item_aria","Удалить из плана: {title}").replace("{title}",(it.title||"").slice(0,80))} style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"var(--red)",cursor:"pointer",fontSize:12,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><IconTrash/></button>
                </div>
              ))}
            </div>
          )
      )}

      {(editId==="new"||editingItem)&&(
        <ContentPlanItemModal
          formKey={editId||""}
          item={editingItem||{
            title:cpPrefill?.title||"",
            type:"post",
            channel:"blog",
            status:"draft",
            brief:cpPrefill?.brief||"",
            scheduledDate:newItemPresetDate||"",
            strategyStepId:cpPrefill?.strategyStepId||"",
            strategyStepTitle:cpPrefill?.strategyStepTitle||"",
          }}
          allNodes={allNodes}
          t={t}
          theme={theme}
          onSave={(item)=>{setCpPrefill(null);saveItem(editId==="new"?{...item,createdAt:Date.now()}:{...editingItem,...item});}}
          onClose={()=>{setCpPrefill(null);setEditId(null);}}
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
      {toast&&(
        <div role="status" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:1500,padding:"12px 22px",borderRadius:14,border:`1px solid ${toast.type==="error"?"rgba(239,68,68,.4)":"rgba(16,185,129,.4)"}`,background:toast.type==="error"?"rgba(239,68,68,.15)":"rgba(16,185,129,.15)",color:toast.type==="error"?"#f87171":"#34d399",fontSize:13.5,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.3)",backdropFilter:"blur(12px)"}}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
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
  const [recur,setRecur]=useState(item.recur||"");
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
    setRecur(item.recur||"");
    setDirty(false);
  },[formKey,item?.id]);
  const stepOptions=allNodes.map((n:any)=>({id:n.id,title:n.title,mapName:n.mapName}));
  function requestClose(){
    if(dirty){setShowDiscard(true);return;}
    onClose();
  }
  useEffect(()=>{
    if(!dirty)return;
    const h=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",h);
    return()=>window.removeEventListener("beforeunload",h);
  },[dirty]);
  function handleSave(){
    const stepTitle=stepOptions.find((s:any)=>s.id===stepId)?.title||"";
    onSave({title:title.trim()||"Без названия",type,channel,status,brief,scheduledDate,strategyStepId:stepId||"",strategyStepTitle:stepTitle,recur:recur||""});
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
        <div style={{fontSize:12,fontWeight:700,color:"var(--text4)",marginBottom:6}}>{t("recur_label","Повтор")}</div>
        <select value={recur} onChange={e=>{setRecur(e.target.value);setDirty(true);}} style={{width:"100%",padding:"10px 14px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",marginBottom:12,outline:"none",fontFamily:"inherit"}}>
          <option value="">{t("recur_none","Однократно")}</option>
          <option value="weekly">{t("recur_weekly","Еженедельно (4 недели)")}</option>
          <option value="biweekly">{t("recur_biweekly","Раз в 2 недели (4 раза)")}</option>
        </select>
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
          {canEdit&&<button type="button" className="sa-map-card__del" onClick={e=>{e.stopPropagation();delMap(m.id);}} aria-label={t("confirm_delete_map","Удалить карту?")} style={{width:22,height:22,borderRadius:5,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"var(--red)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .22s ease"}}><IconTrash size={12}/></button>}
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
            {isOwner&&(
              <div className="glass-card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 16px",borderRadius:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"var(--text)"}}>🔗 {t("invite_link","Ссылка-приглашение")}</div>
                  <div style={{fontSize:12,color:"var(--text5)"}}>{t("invite_link_desc","Скопируйте и отправьте — пригласите команду одной ссылкой.")}</div>
                </div>
                <button type="button" onClick={async()=>{
                  const url=`${window.location.origin}/?join=${proj.id}`;
                  try{await navigator.clipboard.writeText(url);setToast({msg:t("link_copied","Ссылка скопирована"),type:"success"});}
                  catch{setToast({msg:url,type:"info"});}
                }} className="btn-interactive" style={{padding:"8px 14px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-1)",cursor:"pointer",fontSize:12.5,fontWeight:800}}>{t("copy_link","Скопировать")}</button>
              </div>
            )}
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
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{t("share_section","Поделиться (read-only)")}</div>
              <div style={{padding:"11px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{t("share_link_title","Ссылка только для чтения")}</div>
                  <div style={{fontSize:12.5,color:"var(--text5)"}}>{t("share_link_desc","Любой с этой ссылкой увидит карты и контент-план без возможности редактировать.")}</div>
                </div>
                <button onClick={async()=>{
                  const url=`${window.location.origin}/?share=${proj.id}`;
                  try{await navigator.clipboard.writeText(url);setToast({msg:t("link_copied","Ссылка скопирована"),type:"success"});setTimeout(()=>setToast(null),2500);}
                  catch{setToast({msg:url,type:"info"});setTimeout(()=>setToast(null),5000);}
                }} className="btn-interactive" style={{padding:"8px 14px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-1)",cursor:"pointer",fontSize:12.5,fontWeight:800}}>🔗 {t("copy_link","Скопировать")}</button>
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{t("versions_section","Версии карт")}</div>
              <div style={{padding:"11px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",fontSize:12.5,color:"var(--text4)"}}>
                {regularMaps.length===0
                  ? t("versions_no_maps","Сначала создайте карту — версии хранятся для каждой карты.")
                  : t("versions_open_in_map","История версий доступна в редакторе карты — кнопка 📜 на верхней панели.")
                }
              </div>
            </div>
            {isOwner&&(
              <button type="button" onClick={()=>setDelProjConfirm(true)} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.05)",color:"var(--red)",cursor:"pointer",fontSize:13,fontWeight:700,marginTop:10,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}><IconTrash/> {t("delete_project","Удалить проект")}</button>
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
  const[lastAiQuestion,setLastAiQuestion]=useState("");
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

  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    const reduced=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({top:el.scrollHeight,behavior:reduced?"auto":"smooth"});
  },[msgs,loading]);
  useEffect(()=>{if(!loading&&!generating){const t=setTimeout(()=>inputRef.current?.focus(),80);return()=>clearTimeout(t);}},[loading,generating]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью."}]:hist,sysPrompt,300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{const txt=reply.trim();setLastAiQuestion(txt);setMsgs(m=>[...m,{role:"ai",text:txt}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:t("ai_network_err","Не удалось получить ответ AI. Проверьте сеть и ключ API. Попробуйте ещё раз.")}]);
      setLoading(false);
    }
  }
  async function submit(){
    if(!inp.trim()||loading||generating)return;
    const text=inp.trim();setInp("");
    const newMsgs=[...msgs,{role:"user",text}];setMsgs(newMsgs);
    const newHist=[...history,{role:"assistant",content:lastAiQuestion},{role:"user",content:text}].filter(h=>h.content);
    setHistory(newHist);
    if(qCount>=MAX_Q){await buildMap(newHist);}else{await askNext(newHist);}
  }
  async function buildMap(hist){
    setGenerating(true);setMapGenFailed(false);
    setMsgs(m=>[...m,{role:"ai",text:t("building_map","Строю персональную карту…")}]);
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
    <div data-theme={theme} className="sa-onb-side" style={{position:"fixed",top:0,right:0,bottom:0,width:"min(440px,100vw)",background:"var(--bg2,var(--surface,rgba(12,9,28,.96)))",display:"flex",flexDirection:"column",zIndex:250,boxShadow:"-12px 0 40px rgba(0,0,0,.45)",borderLeft:"1px solid var(--border,rgba(255,255,255,.08))",animation:"saSlideInR .25s cubic-bezier(.34,1.56,.64,1)"}}>
<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:8,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>✦</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>AI создаёт карту · {project?.name}</div>
          <div style={{height:3,borderRadius:2,background:"var(--surface2)",marginTop:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:"var(--gradient-accent)",borderRadius:2,transition:"width .4s"}}/>
          </div>
        </div>
        <button onClick={()=>setShowSkipConfirm(true)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>{t("skip","Пропустить")}</button>
      </div>
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowAnchor:"auto" as any,padding:"16px",display:"flex",flexDirection:"column",gap:12,width:"100%",scrollPaddingBottom:80}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:26,height:26,borderRadius:7,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,flexShrink:0,marginTop:2,boxShadow:"0 2px 10px var(--accent-glow)"}}>✦</div>}
            <div style={{maxWidth:"86%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"3px 12px 12px 12px",background:m.role==="user"?"rgba(104,54,245,.18)":"var(--surface)",border:`1px solid ${m.role==="user"?"rgba(104,54,245,.3)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
        {(loading||generating)&&<div style={{display:"flex",gap:10,alignItems:"center",minHeight:40}}><div style={{width:26,height:26,borderRadius:7,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 10px var(--accent-glow)"}}>✦</div><div style={{display:"flex",gap:4,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"3px 12px 12px 12px"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"var(--accent-1)",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      {mapGenFailed&&(
        <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:10,width:"100%",flexWrap:"wrap"}}>
          <button onClick={()=>{setMapGenFailed(false);buildMap(history);}} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--accent-1)",background:"var(--accent-soft)",color:"var(--accent-2)",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("retry","Повторить")}</button>
          <button onClick={useFallbackTemplate} style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("use_template","Использовать шаблон")}</button>
        </div>
      )}
      {!generating&&!mapGenFailed&&(
        <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:8,width:"100%"}}>
          <input ref={inputRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} placeholder="Ваш ответ…" style={{flex:1,padding:"11px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"inherit",minWidth:0}} disabled={loading}/>
          <button onClick={submit} disabled={!inp.trim()||loading} className="btn-interactive" style={{padding:"11px 16px",borderRadius:12,border:"none",background:inp.trim()&&!loading?"var(--gradient-accent)":"var(--surface)",color:inp.trim()&&!loading?"var(--accent-on-bg)":"var(--text4)",fontSize:14,fontWeight:900,cursor:inp.trim()&&!loading?"pointer":"not-allowed",boxShadow:inp.trim()&&!loading?"0 4px 18px var(--accent-glow)":"none",whiteSpace:"nowrap"}}>
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
  const[authTab,setAuthTab]=useState<"login"|"register">("login");
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
