import React, { useEffect, useState } from "react";
import { useLang } from "../lang-context";
import { useIsMobile } from "../hooks/use-is-mobile";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";
import { callAI } from "../lib/call-ai";

export function WeeklyBriefingModal({
  nodes,
  mapName,
  user: _user,
  onClose,
  theme = "dark",
  onError,
}: {
  nodes: any[];
  mapName: string;
  user: any;
  onClose: () => void;
  theme?: string;
  onError?: (msg: string) => void;
}) {
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
  useEffect(()=>{fetchBriefing();},[nodes]);

  return(
    <div data-theme={theme} className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
      <div role="dialog" aria-modal="true" aria-labelledby="sa-wb-title" className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{borderRadius:isMobile?"18px 18px 0 0":20,width:isMobile?"100%":"min(520px,94vw)",maxHeight:isMobile?"85vh":"none",overflowX:"hidden",display:"flex",flexDirection:"column",overflow:"hidden",animation:isMobile&&!closing?"slideUp .3s cubic-bezier(0.22,1,0.36,1)":undefined}} onClick={e=>e.stopPropagation()}>
        <SheetSwipeHandle enabled={isMobile} onClose={handleClose} />
        <div style={{background:"var(--surface)",padding:"18px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div id="sa-wb-title" style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>📋 {t("weekly_briefing","Еженедельный брифинг")}</div>
            <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>{mapName} · {new Date().toLocaleDateString(lang==="uz"?"uz-UZ":lang==="en"?"en-US":"ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <button type="button" className="sa-pf-close" onClick={handleClose} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{padding:"22px 26px",flex:1,minHeight:0,overflowY:"auto"}}>
          {/* Метрики */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:20}}>
            {[
              {label:t("total_steps","Всего"),value:nodes.length,color:"var(--accent-1)"},
              {label:t("done","Выполнено"),value:done.length,color:"var(--green)"},
              {label:t("blocked","Заблокировано"),value:blocked.length,color:"var(--red)"},
              {label:t("health","Здоровье"),value:`${health}%`,color:health>=70?"var(--green)":health>=40?"var(--amber)":"var(--red)"},
            ].map(m=>(
              <div key={m.label} style={{textAlign:"center",padding:"12px 8px",borderRadius:12,background:"var(--bg2)",border:"1px solid var(--border)"}}>
                <div style={{fontSize:22,fontWeight:800,color:m.color}}>{m.value}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:3,fontWeight:600}}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* AI-саммари */}
          <div style={{padding:"16px 18px",borderRadius:12,background:"var(--accent-soft)",border:"1px solid var(--accent-1)",minHeight:80}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--accent-2)",marginBottom:8}}><span aria-hidden="true">✦</span> {t("weekly_briefing_ai_analysis","AI-анализ")}</div>
            {loading?(
              <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--text3)",fontSize:13}} role="status" aria-live="polite">
                <div style={{width:16,height:16,border:"2px solid var(--accent-1)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                {t("analyzing_map","Анализирую карту…")}
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
              <div style={{fontSize:12,fontWeight:700,color:"var(--red)",marginBottom:8}}>⚠️ {t("critical_unfinished","Критичные незавершённые шаги")}</div>
              {critical.slice(0,3).map((n:any)=>(
                <div key={n.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:9,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",marginBottom:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"var(--red)",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{n.title}</span>
                  {n.deadline&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--red)"}}>{n.deadline}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:"0 26px 20px",display:"flex",justifyContent:"flex-end",gap:10,borderTop:"1px solid var(--border)",flexShrink:0}}>
          <button onClick={handleClose} className="btn-interactive" style={{padding:"10px 22px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("close","Закрыть")}</button>
        </div>
      </div>
    </div>
  );
}

