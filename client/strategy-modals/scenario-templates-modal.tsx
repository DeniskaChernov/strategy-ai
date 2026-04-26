import React, { useState } from "react";
import { uid } from "../lib/util";
import { useLang } from "../lang-context";
import { useIsMobile } from "../hooks/use-is-mobile";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";
import { callAI } from "../lib/call-ai";
import { SC_MAP_SYS, SC_TEMPLATES } from "../lib/scenario-templates-data";

export function ScenarioTemplatesModal({ onSelect, onClose, mapCtx = "", theme = "dark" }: { onSelect: (x: any) => void; onClose: () => void; mapCtx?: string; theme?: string }) {
  const{t}=useLang();
  const isMobile=useIsMobile();
  const[selected,setSelected]=useState<(typeof SC_TEMPLATES)[number]|null>(null);
  const[fields,setFields]=useState<Record<string,string>>({});
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
<div className="glass-panel glass-panel-xl" style={{width:isMobile?"100%":"min(95vw,860px)",maxHeight:isMobile?"88vh":"90vh",margin:isMobile?0:"auto",borderRadius:isMobile?"18px 18px 0 0":22,display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
        <SheetSwipeHandle enabled={isMobile} onClose={onClose} />
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:9,background:"var(--gradient-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"var(--accent-on-bg)",fontWeight:900,boxShadow:"0 2px 12px var(--accent-glow)"}}>⎇</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14.5,fontWeight:900,color:"var(--text)"}}>{t("scenario_templates","Шаблоны сценариев")}</div>
            <div style={{fontSize:13.5,color:"var(--text4)"}}>{t("scen_subtitle","AI сгенерирует стратегическую карту под ваш контекст")}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden",flexDirection:isMobile?"column":"row"}}>
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
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"20px"}}>
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

