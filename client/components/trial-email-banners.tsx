import React, { useState } from "react";
import { apiFetch, API_BASE } from "../api";
import { useLang } from "../lang-context";

export function TrialBanner({user,onUpgrade}:{user:any,onUpgrade:()=>void}){
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


export function EmailVerifyBanner({user,onVerified}:{user:any,onVerified?:()=>void}){
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
