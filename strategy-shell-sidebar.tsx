import React from "react";

export type StrategyShellNav =
  | "projects"
  | "map"
  | "contentPlan"
  | "scenarios"
  | "timeline"
  | "ai"
  | "insights"
  | "team"
  | "settings";

type TFn = (key: string, fallback?: string) => string;

export function StrategyShellSidebar({
  theme,
  onToggleTheme,
  activeNav,
  onNavigate,
  tierLabel,
  tierColor,
  onTierClick,
  lang,
  onLang,
  userName,
  userEmail,
  scenarioCount,
  onUserCard,
  onCrmClick,
  onLogout,
  showContentPlan,
  onContentPlan,
  t,
}: {
  theme: string;
  onToggleTheme: () => void;
  activeNav: StrategyShellNav;
  onNavigate: (nav: StrategyShellNav) => void;
  tierLabel: string;
  tierColor: string;
  onTierClick: () => void;
  lang: string;
  onLang: (code: string) => void;
  userName: string;
  userEmail: string;
  scenarioCount?: number;
  onUserCard: () => void;
  onCrmClick?: () => void;
  showContentPlan?: boolean;
  onContentPlan?: () => void;
  t: TFn;
}){
  const initial = (userName || userEmail || "?").trim().split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase();
  const roleLine = `${t("owner_role", "Владелец")} · ${tierLabel}`;
  return(
    <aside className="sa-sb">
      <div className="logo-r">
        <div className="gem">SA</div>
        <span className="lname">Strategy AI</span>
        <div className="tpill" onClick={onToggleTheme} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onToggleTheme();}} aria-label={t("toggle_theme", "Тема")}>
          <div className={`tpi${theme==="dark"?" on":""}`}>☽</div>
          <div className={`tpi${theme==="light"?" on":""}`}>☀</div>
        </div>
      </div>
      <div className="tier-badge" onClick={onTierClick} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onTierClick();}}>
        <div className="tier-dot" style={{background:tierColor,boxShadow:`0 0 6px ${tierColor}99`}}/>
        <span className="tier-name">{tierLabel}</span>
        <span className="tier-change">{t("tier_upgrade_hint", "Тариф ↑")}</span>
      </div>
      <div className="sbs">
        <div className="sbl">{t("shell_workspace", "Workspace")}</div>
        <div className={`ni${activeNav==="projects"?" on":""}`} onClick={()=>onNavigate("projects")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><path d="M2.5 2.5h4v4h-4v-4zm6 0h4v4h-4v-4zm-6 6h4v4h-4v-4zm6 0h4v4h-4v-4z" stroke="currentColor" strokeWidth="1" opacity=".65"/></svg>
          {t("shell_projects", "Проекты")}
        </div>
        <div className={`ni${activeNav==="map"?" on":""}`} onClick={()=>onNavigate("map")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity=".75"/><rect x="9" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity=".35"/><line x1="6" y1="3.5" x2="9" y2="3.5" stroke="currentColor" strokeWidth="1" opacity=".4"/><line x1="6" y1="11.5" x2="9" y2="11.5" stroke="currentColor" strokeWidth="1" opacity=".4"/><line x1="3.5" y1="6" x2="3.5" y2="9" stroke="currentColor" strokeWidth="1" opacity=".4"/><line x1="11.5" y1="6" x2="11.5" y2="9" stroke="currentColor" strokeWidth="1" opacity=".4"/></svg>
          {t("shell_strategy_map", "Карта стратегии")}
        </div>
        {showContentPlan&&onContentPlan&&(
          <div className={`ni${activeNav==="contentPlan"?" on":""}`} onClick={()=>onContentPlan()}>
            <svg viewBox="0 0 15 15" fill="none" aria-hidden><rect x="2" y="2" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6"/><path d="M4 6h7M4 9h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5"/></svg>
            {t("nav_workspace_content", "Контент-план")}
          </div>
        )}
        <div className={`ni${activeNav==="scenarios"?" on":""}`} onClick={()=>onNavigate("scenarios")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><path d="M2 4h11M2 7.5h8M2 11h5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".75"/><circle cx="12" cy="10" r="2.5" fill="currentColor" opacity=".5"/><polyline points="11,10 12,11 13.5,8.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".9"/></svg>
          {t("shell_scenarios", "Сценарии")}
          {(scenarioCount ?? 0) > 0&&<span className="ni-b">{Math.min(99, scenarioCount!)}</span>}
        </div>
        <div className={`ni${activeNav==="timeline"?" on":""}`} onClick={()=>onNavigate("timeline")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><rect x="1" y="3" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".5"/><line x1="5" y1="1.5" x2="5" y2="4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".7"/><line x1="10" y1="1.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".7"/><line x1="3.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1" opacity=".35"/><rect x="3" y="8.5" width="4" height="1.5" rx=".75" fill="currentColor" opacity=".65"/><rect x="8" y="8.5" width="3" height="1.5" rx=".75" fill="currentColor" opacity=".4"/></svg>
          {t("shell_timeline", "Таймлайн")}
        </div>
      </div>
      <div className="sbs">
        <div className="sbl">AI</div>
        <div className={`ni${activeNav==="ai"?" on":""}`} onClick={()=>onNavigate("ai")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><polygon points="7.5,1 9.3,5.5 14,5.5 10.4,8.4 11.8,13 7.5,10.2 3.2,13 4.6,8.4 1,5.5 5.7,5.5" fill="currentColor" opacity=".75"/></svg>
          {t("shell_ai_advisor", "AI советник")}
        </div>
        <div className={`ni${activeNav==="insights"?" on":""}`} onClick={()=>onNavigate("insights")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><polyline points="1,12 4,7 7.5,9.5 10.5,4.5 14,7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".75"/></svg>
          {t("shell_insights", "Инсайты")}
        </div>
      </div>
      <div className="sbs">
        <div className="sbl">{t("shell_team", "Команда")}</div>
        <div className={`ni${activeNav==="team"?" on":""}`} onClick={()=>onNavigate("team")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><circle cx="5.5" cy="4.5" r="2.5" fill="currentColor" opacity=".7"/><circle cx="10" cy="4.5" r="2" fill="currentColor" opacity=".45"/><path d="M1 12c0-2.5 2-4.5 4.5-4.5S10 9.5 10 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".5"/></svg>
          {t("shell_team_nav", "Команда")}
        </div>
        <div className={`ni${activeNav==="settings"?" on":""}`} onClick={()=>onNavigate("settings")}>
          <svg viewBox="0 0 15 15" fill="none" aria-hidden><circle cx="7.5" cy="7.5" r="2.2" fill="currentColor" opacity=".65"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1.1 1.1M10.7 10.7l1.1 1.1M3.2 11.8l1.1-1.1M10.7 4.3l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/></svg>
          {t("shell_settings", "Настройки")}
        </div>
      </div>
      <div className="lang-row">
        {(["en","ru","uz"] as const).map(code=>(
          <button key={code} type="button" className={`lang-btn${lang===code?" on":""}`} onClick={()=>onLang(code)}>{code.toUpperCase()}</button>
        ))}
      </div>
      <div className="crm-sync" onClick={onCrmClick} role="button" tabIndex={0} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&onCrmClick)onCrmClick();}}>
        <div className="cs-head"><div className="cs-dot"/><span className="cs-title">{t("shell_crm_title", "CRM · демо")}</span></div>
        <div className="cs-sub">{t("shell_crm_sub", "Как в макете · интеграция позже")}</div>
      </div>
      <div className="user-card" onClick={onUserCard} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onUserCard();}} style={{marginTop:"auto"}}>
        <div className="u-av">{initial}</div>
        <div className="u-info">
          <div className="u-name">{userName || userEmail.split("@")[0]}</div>
          <div className="u-role">{roleLine}</div>
        </div>
        <div className="u-dot"/>
      </div>
      {onLogout&&(
        <button type="button" className="lang-btn" onClick={onLogout} style={{margin:"0 12px 12px",alignSelf:"stretch",border:"none",cursor:"pointer",fontSize:11,color:"var(--t3)"}}>
          {t("logout","Выйти")}
        </button>
      )}
    </aside>
  );
}

export function StrategyShellBg(){
  return(
    <>
      <div className="sa-bgd" aria-hidden><div className="orb o1"/><div className="orb o2"/><div className="orb o3"/></div>
      <div className="sa-bgl" aria-hidden><div className="base"/><div className="orb o1"/><div className="orb o2"/><div className="orb o3"/></div>
    </>
  );
}
