import React, { useState } from "react";
import { TEMPLATES } from "../lib/templates";
import { TIERS } from "../lib/tiers";
import { useLang } from "../lang-context";
import { useIsMobile } from "../hooks/use-is-mobile";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";

export function TemplateModal({ tier, onSelect, onClose, theme = "dark" }: { tier?: string; onSelect: (x: any) => void; onClose: () => void; theme?: string }) {
  const{t}=useLang();
  const isMobile=useIsMobile();
  const tierData=TIERS[tier||"free"]||TIERS.free;
  const canUse=tierData.templates;
  const[selected,setSelected]=useState<string|null>(null);
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"var(--modal-overlay-strong,rgba(0,0,0,.8))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:180,backdropFilter:"blur(16px)",animation:"fadeIn .2s ease",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
<div className="glass-panel glass-panel-xl" style={{width:isMobile?"100%":"min(95vw,760px)",maxHeight:isMobile?"88vh":"86vh",borderRadius:isMobile?"18px 18px 0 0":22,display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
        <SheetSwipeHandle enabled={isMobile} onClose={onClose} />
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text)"}}>{t("map_templates_modal_title","📋 Шаблоны карт")}</div>
            <div style={{fontSize:13,color:"var(--text4)",marginTop:2}}>{t("choose_template","Выберите готовую стратегическую карту или начните с нуля")}</div>
          </div>
          {!canUse&&<div style={{padding:"4px 10px",borderRadius:8,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",color:"#f09428",fontSize:13,fontWeight:700}}>{t("templates_team_tier_badge","Team+ тариф")}</div>}
          <button className="modal-close" onClick={onClose} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"18px 22px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,alignContent:"start"}}>
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
        <div style={{padding:"14px 22px",borderTop:"1px solid var(--border)",display:"flex",gap:10,justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("cancel","Отмена")}</button>
          <button className="btn-interactive" onClick={()=>{if(selected){const tmpl=TEMPLATES.find(x=>x.id===selected);if(tmpl)onSelect(tmpl);}else{onSelect(null);}}} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"var(--gradient-accent)",color:"var(--accent-on-bg)",cursor:"pointer",fontSize:13,fontWeight:900,boxShadow:"0 2px 14px var(--accent-glow)"}}>
            {selected?t("use_template","Использовать шаблон"):t("start_from_scratch","Начать с нуля")}
          </button>
        </div>
      </div>
    </div>
  );
}

