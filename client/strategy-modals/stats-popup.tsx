import React, { useState } from "react";
import { useLang } from "../lang-context";
import { useIsMobile } from "../hooks/use-is-mobile";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";
import { getPRIORITY, getSTATUS } from "../lib/strategy-labels";

export function StatsPopup({ nodes, edges, onClose, statusMap }: { nodes: any[]; edges: any[]; onClose: () => void; statusMap?: any }) {
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
        <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{width:"min(96vw,420px)",borderRadius:20,padding:"28px 24px",textAlign:"center",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
          <SheetSwipeHandle enabled={isMobile} onClose={handleClose} />
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
      <div className={`glass-panel glass-panel-lg ${closing?"modal-content-out":"modal-content-pop"}`} style={{width:isMobile?"100%":"min(96vw,620px)",maxHeight:isMobile?"88vh":"none",overflow:"hidden",borderRadius:isMobile?"18px 18px 0 0":20,display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <SheetSwipeHandle enabled={isMobile} onClose={handleClose} />
        <div style={{flex:1,minHeight:0,overflowY:isMobile?"auto":"visible",overflowX:"hidden",padding:"24px 26px"}}>
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
            {([
              [done,"✅",t("completed","Выполнено"),"#12c482"],
              [active,"⚡",t("in_progress","В работе"),"#06b6d4"],
              [blocked,"🔒","Блокировано","#f04458"],
              [overdue,"⚠️",t("overdue","Просрочено"),"#f09428"],
              [critical,"🔴","Критичных","#f04458"],
              [edges.length,"🔗","Связей","var(--accent-2)"],
            ] as Array<[number,string,string,string]>).map(([v,ic,lbl,col])=>(
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
    </div>
  );
}

