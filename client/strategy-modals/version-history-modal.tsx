import React, { useEffect, useState } from "react";
import { API_BASE, apiFetch } from "../api";
import { useLang } from "../lang-context";
import { SheetSwipeHandle } from "../components/sheet-swipe-handle";
import { ConfirmDialog } from "./confirm-dialog";

export function VersionHistoryModal({
  mapId,
  projectId,
  onRestore,
  onClose,
  onError,
  theme = "dark",
  isMobile = false,
}: {
  mapId: string;
  projectId: string;
  onRestore: (v: any) => void;
  onClose: () => void;
  onError?: (msg: string) => void;
  theme?: string;
  isMobile?: boolean;
}) {
  const{t}=useLang();
  const[versions,setVersions]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[loadError,setLoadError]=useState<string|null>(null);
  const[restoring,setRestoring]=useState<string|null>(null);
  const[restoreConfirm,setRestoreConfirm]=useState<any>(null);
  const[closing,setClosing]=useState(false);
  const loadVersions=async()=>{
    if(!API_BASE){
      setLoading(false);
      setLoadError(null);
      setVersions([]);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try{
      const d=await apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions`);
      setVersions(d.versions||[]);
    }catch(e:any){
      setLoadError(e?.message||t("load_failed","Не удалось загрузить"));
      setVersions([]);
    }finally{setLoading(false);}
  };
  const handleClose=()=>{if(closing)return;setClosing(true);setTimeout(()=>onClose(),220);};
  useEffect(()=>{loadVersions();},[mapId,projectId]);
  async function doRestore(v:any){
    setRestoring(v.id);
    if(API_BASE){
      try{await apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions/${v.id}/restore`,{method:"POST"});}
      catch(e:any){onError?.(e?.message||t("save_error","Ошибка сохранения"));setRestoring(null);return;}
    }
    onRestore(v);setRestoring(null);setRestoreConfirm(null);onClose();
  }
  return(
    <div data-theme={theme} role="dialog" aria-modal="true" aria-labelledby="sa-vhist-title" className={closing?"modal-backdrop modal-backdrop-out":"modal-backdrop"} style={{position:"fixed",inset:0,background:"var(--modal-overlay-bg,rgba(0,0,0,.65))",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(16px)",padding:isMobile?0:16}} onClick={e=>{if(e.target===e.currentTarget)handleClose();}}>
      <div className={`glass-panel ${closing?"modal-content-out":"modal-content-pop"}`} style={{borderRadius:isMobile?"18px 18px 0 0":20,width:isMobile?"100%":"min(480px,94vw)",maxHeight:isMobile?"78vh":"80vh",display:"flex",flexDirection:"column",border:"1px solid var(--glass-border-accent,var(--border))",boxShadow:"var(--glass-shadow-accent,none),0 24px 64px rgba(0,0,0,.4)"}} onClick={e=>e.stopPropagation()}>
        <SheetSwipeHandle enabled={isMobile} onClose={handleClose} />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:"1px solid var(--border)",background:"var(--surface)"}}>
          <div id="sa-vhist-title" style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>📜 {t("version_history","История версий")}</div>
          <button type="button" onClick={handleClose} style={{width:36,height:36,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}} aria-label={t("close","Закрыть")}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {loading&&(
            <div style={{padding:24,display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"var(--text3)",fontSize:13}} role="status" aria-live="polite">
              <span style={{width:16,height:16,border:"2px solid var(--accent-1)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />
              {t("versions_loading","Загружаю версии…")}
            </div>
          )}
          {loadError&&!loading&&(
            <div style={{padding:20,textAlign:"center"}}>
              <div style={{color:"#f04458",fontSize:13,marginBottom:10}}>{loadError}</div>
              <button type="button" className="btn-interactive" onClick={loadVersions} style={{padding:"8px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("retry","Повторить")}</button>
            </div>
          )}
          {!loading&&!loadError&&versions.length===0&&<div style={{padding:24,textAlign:"center",color:"var(--text3)",fontSize:13}}>{t("versions_empty","Нет сохранённых версий")}</div>}
          {!loading&&!loadError&&versions.map((v,i)=>(
            <div key={v.id} style={{padding:"14px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{v.label||`Версия ${versions.length-i}`}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{new Date(v.created_at).toLocaleString()} · {v.user_email}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>
                  {typeof v.node_count==="number"?v.node_count:(Array.isArray(v.nodes)?v.nodes.length:0)} {t("steps_label","шагов")} · {typeof v.edge_count==="number"?v.edge_count:(Array.isArray(v.edges)?v.edges.length:0)} {t("edges_short","связей")}
                </div>
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

