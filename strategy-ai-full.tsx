import React, { useState, useRef, useEffect } from "react";

const NW=240,NH=128;

const fmt=n=>n>=999?"∞":String(n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=()=>Math.random().toString(36).slice(2,9);
const snap=v=>Math.round(v/20)*20;

const TIERS={
  free:    {label:"Free",    price:"Бесплатно",  color:"#64748b",badge:"⬡", projects:1,  users:1,  maps:1,  scenarios:0,  templates:false,ai:"basic",   clone:false,wl:false,api:false,report:false,pptx:false,desc:"Для знакомства"},
  starter: {label:"Starter", price:"$9/мес",    color:"#10b981",badge:"◈", projects:3,  users:1,  maps:3,  scenarios:2,  templates:false,ai:"starter", clone:false,wl:false,api:false,report:false,pptx:false,desc:"Для старта"},
  pro:     {label:"Pro",     price:"$29/мес",   color:"#8b5cf6",badge:"◆", projects:10, users:3,  maps:5,  scenarios:5,  templates:false,ai:"advanced",clone:true, wl:false,api:false,report:false,pptx:false,desc:"Для профессионалов"},
  team:    {label:"Team",    price:"$59/мес",   color:"#f59e0b",badge:"✦", projects:25, users:10, maps:15, scenarios:15, templates:true, ai:"full",    clone:true, wl:false,api:false,report:false,pptx:false,desc:"Для команд"},
  enterprise:{label:"Enterprise",price:"$149+/мес",color:"#06b6d4",badge:"💎",projects:999,users:999,maps:999,scenarios:999,templates:true,ai:"priority",clone:true,wl:true,api:true,report:true,pptx:true,desc:"Для топ-команд"},
};
const ROLES_C  ={owner:"#6366f1",editor:"#10b981",viewer:"#94a3b8"};
const STATUS  ={planning:{c:"#6366f1"},active:{c:"#0ea5e9"},completed:{c:"#10b981"},paused:{c:"#f59e0b"},blocked:{c:"#ef4444"}};
const PRIORITY={low:{c:"#475569"},medium:{c:"#f59e0b"},high:{c:"#f97316"},critical:{c:"#ef4444"}};
const ETYPE_C ={requires:{c:"#6366f1",d:"none"},affects:{c:"#8b5cf6",d:"8,4"},blocks:{c:"#ef4444",d:"4,3"},follows:{c:"#10b981",d:"12,4"}};
const getROLES=(t)=>({owner:t("role_owner","Владелец"),editor:t("role_editor","Редактор"),viewer:t("role_viewer","Зритель")});
const getSTATUS=(t)=>({planning:{c:"#6366f1",label:t("status_planning","Планирование")},active:{c:"#0ea5e9",label:t("status_active","В работе")},completed:{c:"#10b981",label:t("completed","Выполнено")},paused:{c:"#f59e0b",label:t("status_paused","На паузе")},blocked:{c:"#ef4444",label:t("status_blocked","Заблокировано")}});
const getPRIORITY=(t)=>({low:{c:"#475569",label:t("priority_low","Низкий")},medium:{c:"#f59e0b",label:t("priority_medium","Средний")},high:{c:"#f97316",label:t("priority_high","Высокий")},critical:{c:"#ef4444",label:t("priority_critical","Критично")}});
const getSTATUSES=(t)=>[{v:"planning",label:"📋 "+t("status_planning","Планирование")},{v:"active",label:"⚡ "+t("status_active","В работе")},{v:"completed",label:"✅ "+t("completed","Выполнено")},{v:"paused",label:"⏸ "+t("status_paused","На паузе")},{v:"blocked",label:"🔒 "+t("status_blocked","Заблокировано")}];
const getPRIORITIES=(t)=>[{v:"low",label:"🟢 "+t("priority_low","Низкий")},{v:"medium",label:"🟡 "+t("priority_medium","Средний")},{v:"high",label:"🟠 "+t("priority_high","Высокий")},{v:"critical",label:"🔴 "+t("priority_critical","Критично")}];
const getETYPE=(t)=>({requires:{c:"#6366f1",label:t("etype_requires","Требует"),d:"none"},affects:{c:"#8b5cf6",label:t("etype_affects","Влияет"),d:"8,4"},blocks:{c:"#ef4444",label:t("etype_blocks","Блокирует"),d:"4,3"},follows:{c:"#10b981",label:t("etype_follows","Следует"),d:"12,4"}});
const getTierPrice=(k,t)=>{const prices={free:t("free_plan","Бесплатно"),starter:"$9"+t("per_month_short","/мес"),pro:"$29"+t("per_month_short","/мес"),team:"$59"+t("per_month_short","/мес"),enterprise:"$149+"+t("per_month_short","/мес")};return prices[k]||"";};

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden;}
input,textarea,select,button{font-family:'Plus Jakarta Sans',sans-serif;}
:root{
  /* ── Spacing scale ── */
  --sp-xs:4px;--sp-sm:8px;--sp-md:12px;--sp-lg:16px;--sp-xl:24px;--sp-2xl:32px;--sp-3xl:48px;
  /* ── Border radius scale ── */
  --r-xs:4px;--r-sm:6px;--r-md:10px;--r-lg:14px;--r-xl:18px;--r-2xl:24px;--r-full:9999px;
  /* ── Brand palette ── */
  --brand:#6366f1;--brand2:#8b5cf6;--brand3:#06b6d4;
  --success:#10b981;--warning:#f59e0b;--danger:#ef4444;--info:#0ea5e9;
  /* ── Font sizes ── */
  --fz-xs:11px;--fz-sm:12px;--fz-md:13px;--fz-lg:15px;--fz-xl:18px;
  /* ── Transitions ── */
  --tr-fast:all .1s ease;--tr:all .2s ease;--tr-slow:all .35s ease;
}
/* ── Accent variables (override by data-palette) ── */
[data-theme="dark"]{
  --bg:#070b14;--bg2:#0b1120;--bg3:#0f1729;
  --surface:rgba(255,255,255,.035);--surface2:rgba(255,255,255,.06);
  --border:rgba(255,255,255,.08);--border2:rgba(255,255,255,.14);
  --text:#e2e8f0;--text2:#94a3b8;--text3:#64748b;--text4:#475569;--text5:#334155;--text6:#1e3358;
  --input-bg:rgba(255,255,255,.05);--input-border:rgba(255,255,255,.1);
  --card:rgba(255,255,255,.035);--card-hover:var(--accent-soft);
  --grid:var(--accent-grid);--scrollbar-track:#0a1020;--scrollbar-thumb:#1e335a;
  --divider:rgba(255,255,255,.08);--tag-bg:var(--accent-soft);--tag-color:var(--accent-1);
  --shadow:0 4px 24px rgba(0,0,0,.4);--shadow-lg:0 16px 48px rgba(0,0,0,.6);
  --node-bg:#0d1829;--node-stroke:rgba(255,255,255,.1);--modal-bg:#0b1120;
  --accent-1:#5b6bc0;--accent-2:#7c8dd9;--accent-soft:rgba(91,107,192,.1);--accent-grid:rgba(91,107,192,.04);--accent-glow:rgba(91,107,192,.22);
}
[data-theme="light"]{
  --bg:#f4f6fb;--bg2:#ffffff;--bg3:#eef1f8;
  --surface:rgba(0,0,0,.05);--surface2:rgba(0,0,0,.09);
  --border:rgba(0,0,0,.12);--border2:rgba(0,0,0,.2);
  --text:#0f172a;--text2:#1e293b;--text3:#334155;--text4:#64748b;--text5:#94a3b8;--text6:#cbd5e1;
  --input-bg:#ffffff;--input-border:rgba(0,0,0,.18);
  --card:rgba(255,255,255,.9);--card-hover:var(--accent-soft);
  --grid:var(--accent-grid);--scrollbar-track:#e2e8f0;--scrollbar-thumb:#94a3b8;
  --divider:rgba(0,0,0,.1);--tag-bg:var(--accent-soft);--tag-color:var(--accent-1);
  --shadow:0 4px 24px rgba(0,0,0,.12);--shadow-lg:0 16px 48px rgba(0,0,0,.18);
  --node-bg:#ffffff;--node-stroke:rgba(0,0,0,.15);--modal-bg:#ffffff;
  --accent-1:#5b6bc0;--accent-2:#7c8dd9;--accent-soft:rgba(91,107,192,.08);--accent-grid:rgba(91,107,192,.08);--accent-glow:rgba(91,107,192,.18);
}
/* ── Palettes: спокойные приглушённые цвета (только Strategy AI app, не лендинг) ── */
[data-palette="indigo"]{--accent-1:#5b6bc0;--accent-2:#7c8dd9;--accent-soft:rgba(91,107,192,.1);--accent-grid:rgba(91,107,192,.04);--accent-glow:rgba(91,107,192,.22);}
[data-theme="light"][data-palette="indigo"]{--accent-soft:rgba(91,107,192,.08);--accent-grid:rgba(91,107,192,.08);}
[data-palette="ocean"]{--accent-1:#5b8fb9;--accent-2:#7ab8d4;--accent-soft:rgba(91,143,185,.1);--accent-grid:rgba(91,143,185,.04);--accent-glow:rgba(91,143,185,.2);}
[data-theme="light"][data-palette="ocean"]{--accent-soft:rgba(91,143,185,.08);--accent-grid:rgba(91,143,185,.08);}
[data-palette="forest"]{--accent-1:#5a8c7b;--accent-2:#6ba881;--accent-soft:rgba(90,140,123,.1);--accent-grid:rgba(90,140,123,.04);--accent-glow:rgba(90,140,123,.2);}
[data-theme="light"][data-palette="forest"]{--accent-soft:rgba(90,140,123,.08);--accent-grid:rgba(90,140,123,.08);}
[data-palette="sunset"]{--accent-1:#b88a6a;--accent-2:#c9a088;--accent-soft:rgba(184,138,106,.1);--accent-grid:rgba(184,138,106,.04);--accent-glow:rgba(184,138,106,.18);}
[data-theme="light"][data-palette="sunset"]{--accent-soft:rgba(184,138,106,.08);--accent-grid:rgba(184,138,106,.08);}
[data-palette="mono"]{--accent-1:#6b7a8a;--accent-2:#8a9baa;--accent-soft:rgba(107,122,138,.12);--accent-grid:rgba(107,122,138,.05);--accent-glow:rgba(107,122,138,.2);}
[data-theme="light"][data-palette="mono"]{--accent-soft:rgba(107,122,138,.1);--accent-grid:rgba(107,122,138,.08);}
[data-theme="light"] input,[data-theme="light"] textarea,[data-theme="light"] select{
  background:var(--input-bg) !important;border-color:var(--input-border) !important;
  color:var(--text) !important;color-scheme:light;
}
[data-theme="light"] input::placeholder,[data-theme="light"] textarea::placeholder{color:var(--text5);}
[data-theme="light"] option{background:#fff;color:#0f172a;}
/* Light theme specific overrides */
[data-theme="light"] body{background:var(--bg);}
[data-theme="dark"] select{color-scheme:dark;background:#0d1829;color:#e2e8f0;border-color:rgba(255,255,255,.1);}
[data-theme="dark"] option{background:#0d1829;color:#e2e8f0;}
select{appearance:none;-webkit-appearance:none;}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--scrollbar-track,#0a1020)}
::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb,#1e335a);border-radius:3px}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes nodeHover{from{filter:brightness(1)}to{filter:brightness(1.15)}}
@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.node-card{transition:filter .15s ease;}

/* ── Info card hover system ── */
.icard{
  transition:transform .2s ease,box-shadow .2s ease,background .2s ease,border-color .2s ease;
  cursor:default;
}
.icard:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 28px var(--accent-glow);
  border-color:var(--accent-1) !important;
  background:var(--accent-soft) !important;
}
.icard .icard-title{
  transition:background-size .3s ease, opacity .2s;
}
.icard:hover .icard-title{
  background:linear-gradient(90deg,var(--accent-1),var(--accent-2),var(--accent-1));
  background-size:300% 100%;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:gradShift 5s ease infinite;
}
.icard .icard-desc{
  color:var(--text3);
  transition:color .2s ease;
  line-height:1.55;
}
.icard:hover .icard-desc{
  color:var(--text) !important;
}
/* Colored variant - uses tier/accent color */
.icard-accent:hover{
  box-shadow:0 8px 28px var(--icard-glow,var(--accent-glow));
  border-color:var(--icard-color,var(--accent-1)) !important;
  background:var(--icard-bg,var(--accent-soft)) !important;
}
.icard-accent:hover .icard-title{
  background:linear-gradient(90deg,var(--icard-color,var(--accent-1)),var(--accent-2),var(--icard-color,var(--accent-1)));
  background-size:300% 100%;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:gradShift 4s ease infinite;
}
/* Stats card variant */
.icard-stat .icard-val{
  transition:transform .2s ease, filter .2s ease;
}
.icard-stat:hover .icard-val{
  transform:scale(1.08);
  filter:brightness(1.2);
}
/* Feature row hover */
.feat-row{
  transition:background .18s ease,padding-left .18s ease;
  border-radius:8px;
  padding:5px 8px;
}
.feat-row:hover{
  background:var(--accent-soft);
  padding-left:12px;
}
.feat-row:hover .feat-icon{
  filter:brightness(1.3);
}
[data-theme="light"] .icard:hover{
  box-shadow:0 8px 28px var(--accent-glow);
  background:var(--accent-soft) !important;
}
[data-theme="light"] .icard:hover .icard-desc{
  color:var(--text) !important;
}
.node-card:hover{filter:brightness(1.12);cursor:pointer;}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--accent-glow)}50%{box-shadow:0 0 40px var(--accent-glow)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes nodeBlink{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes tierPop{0%{transform:translateY(0) scale(1)}60%{transform:translateY(-12px) scale(1.03)}100%{transform:translateY(-8px) scale(1)}}
@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes badgePulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.06)}}
@keyframes borderGlow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes priceCount{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes scrollPulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes slideRight{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes ripple{from{transform:scale(0);opacity:.4}to{transform:scale(2.5);opacity:0}}
@keyframes checkmark{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes successPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes particleFloat{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-60px) scale(0);opacity:0}}
@keyframes profileIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes thinkDot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1.2)}}
@keyframes edgePulse{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-24}}
@keyframes nodeSelect{0%{transform:scale(1)}50%{transform:scale(1.03)}100%{transform:scale(1)}}
@keyframes statusFlash{0%{opacity:0.5}50%{opacity:1}100%{opacity:0.5}}
@keyframes slideInPanel{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
@keyframes tourStep{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
@keyframes statsReveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.node-selected{animation:nodeSelect .25s ease;}
.tour-card{animation:tourStep .25s ease;}
.stats-card{animation:statsReveal .3s ease both;}
`;
const {createContext,useContext}=React;
const LangCtx=createContext({lang:'ru',setLang:()=>{},t:(k,fb)=>fb||k});
const useLang=()=>useContext(LangCtx);
const useIsMobile=()=>{const[m,setM]=useState(()=>window.innerWidth<=640);useEffect(()=>{const h=()=>setM(window.innerWidth<=640);window.addEventListener("resize",h,{passive:true});return()=>window.removeEventListener("resize",h);},[]);return m;};

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
        style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"#e2e8f0",cursor:disabled?"not-allowed":"pointer",fontSize:13.5,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap",width:"100%",minWidth:100,justifyContent:"space-between",transition:"all .15s",opacity:disabled?.5:1}}
        onMouseOver={e=>{if(!disabled)e.currentTarget.style.background="rgba(255,255,255,.1)";}}
        onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {sel?.dot&&<span style={{width:8,height:8,borderRadius:"50%",background:sel.dot,flexShrink:0,display:"inline-block"}}/>}
          {sel?.icon&&<span style={{fontSize:13}}>{sel.icon}</span>}
          {sel?.label||value}
        </span>
        <span style={{fontSize:12,color:"rgba(255,255,255,.4)",marginLeft:4,transform:open?"rotate(180deg)":"none",transition:"transform .15s"}}>▼</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:"100%",background:"var(--surface,#0d1829)",border:"1px solid var(--accent-1)",borderRadius:11,boxShadow:"var(--shadow,0 16px 48px rgba(0,0,0,.8))",zIndex:9999,overflow:"hidden",animation:"slideDown .12s ease"}}>
          {options.map(o=>{
            const isSel=o.value===value;
            return(
              <div key={o.value} onClick={e=>{e.stopPropagation();onChange(o.value);setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",cursor:"pointer",background:isSel?"var(--accent-soft)":"transparent",color:isSel?"var(--accent-1)":"var(--text)",fontSize:13,fontWeight:isSel?700:500,fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"background .1s",whiteSpace:"nowrap"}}
                onMouseOver={e=>{if(!isSel)e.currentTarget.style.background="rgba(255,255,255,.06)";}}
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

const LANGS={
  ru:{
    save:'Сохранить',cancel:'Отмена',delete:'Удалить',add:'Добавить',
    edit:'Редактировать',close:'Закрыть',confirm:'Подтвердить',back:'Назад',
    all:'Все',yes:'Да',no:'Нет',loading:'Загрузка…',search:'Поиск',
    login:'Войти',register:'Регистрация',email:'Email',password:'Пароль',name:'Имя',
    fill_fields:'Заполните все поля',welcome:'Добро пожаловать',
    create_account:'Создать аккаунт',no_account:'Нет аккаунта?',
    have_account:'Уже есть аккаунт?',sign_in:'Войти',sign_up:'Зарегистрироваться',
    status:'Статус',status_planning:'Планирование',status_active:'В работе',
    status_completed:'Выполнено',status_blocked:'Заблокировано',status_paused:'Приостановлено',
    priority:'Приоритет',priority_low:'Низкий',priority_medium:'Средний',
    priority_high:'Высокий',priority_critical:'Критический',
    etype_requires:'Требует',etype_affects:'Влияет',etype_follows:'Следует',etype_blocks:'Блокирует',
    role_owner:'Владелец',role_editor:'Редактор',role_viewer:'Зритель',
    undo:'Отменить',redo:'Повторить',new_step:'+ Шаг',connect_btn:'⇒ Связать',
    fit:'Вписать',bg_btn:'Фон',simulation:'▶ Симуляция',gantt:'Gantt',
    export_png:'PNG',export_json:'JSON↓',import_json:'JSON↑',
    ai_advisor:'✦ AI',shortcuts_btn:'?',
    dark_mode:'🌙 Тень',light_mode:'☀️ Свет',layout_btn:'⌥ Авто-раскладка',
    all_statuses:'Все',filtered_count:'отфильтровано',clear_filter:'✕ Сбросить',
    step:'Шаг',steps:'Шагов',new_step_title:'Новый шаг',
    step_title:'Название шага',description:'Описание (зачем?)',
    metric:'Метрика успеха',progress:'Прогресс',
    deadline:'Дедлайн',tags_label:'Теги',comments_label:'Комментарии',
    history_label:'История изменений',color_label:'Цвет',
    step_deleted:'удалён',undo_action:'↩ Отменить',
    saved:'Сохранено ✓',saving:'Сохраняю…',save_error:'Ошибка сохранения',connect_select_source:'⇒ выберите источник',
    connect_select_target:'→ выберите цель',
    ai_title:'AI Советник',clear_chat:'Очистить чат',
    ask_placeholder:'Спросите о стратегии…',analyzing:'анализирую…',
    ai_online:'онлайн',ai_offline:'нет связи',
    shortcuts_title:'⌨️ Горячие клавиши',
    sc_nav:'— НАВИГАЦИЯ —',sc_fit:'Вписать карту',sc_next:'Следующий шаг',
    sc_zoom:'Сброс зума',sc_pan:'Панорамировать',
    sc_edit:'— РЕДАКТИРОВАНИЕ —',sc_new:'Добавить шаг',sc_dup:'Дублировать',
    sc_open:'Открыть редактор',sc_focus:'Фокус на названии',sc_del:'Удалить',
    sc_undo:'Отменить',sc_save:'Сохранить',
    sc_search:'— ПОИСК —',sc_search_action:'Поиск шагов',sc_esc:'Закрыть/Сбросить',
    sc_ui:'— ИНТЕРФЕЙС —',
    free_forever:'Бесплатно',per_month:'/мес',current_plan:'Текущий план',
    upgrade:'Улучшить',downgrade:'Понизить',
    projects:'Проекты',new_project:'+ Новый проект',maps:'Карт',
    members:'Участников',settings:'Настройки',my_projects:'Мои проекты',
    connect_all:'🔗 Авто-связи',analyzing_map:'Анализирую связи карты…',
    no_steps:'Нет шагов',
    stats_title:'Статистика карты',total_steps:'Всего шагов',
    done_steps:'Выполнено',in_progress_steps:'В работе',
    avg_progress:'Средний прогресс',critical_count:'Критических',
    blocked_count:'Заблокировано',edges_count:'Связей',
    ai_rephrase:'✨ Перефразировать',auto_connect:'🔗 Связать',
    delete_step:'Удалить шаг',add_comment:'Добавить комментарий',
    comments_empty:'Нет комментариев',history_empty:'Нет изменений',
    scroll_to:'↗ Перейти',read_only:'Только просмотр',
    connections:'Связи',incoming:'входящих',outgoing:'исходящих',
    // ProjectsPage
    hello:'Привет',your_projects:'Мои проекты',create_first:'Создайте первый проект',
    no_projects_hint:'Создайте проект для стратегического планирования',
    new_project_name:'Название нового проекта',create_project:'Создать проект',
    open_project:'Открыть',delete_project:'Удалить',
    last_updated:'Обновлён',maps_count:'карт',
    // MapEditor toolbar
    back_btn:'← Назад',add_step:'+ Шаг',link_btn:'⇒ Связать',
    fit_view:'Вписать',auto_layout:'⌥ Авто-раскладка',
    ai_links:'🔗 AI-связи',bg_grid:'⊞',bg_stars:'✦',bg_none:'○',
    map_tour:'🗺 Тур',show_stats:'📊',shortcuts:'⌨️',
    simulate:'⎇ Симуляция',templates:'📋 Шаблоны',
    export_png2:'⬇PNG',export_json2:'⬇JSON',import_json2:'⬆JSON',
    // NodeEditor
    edit_step:'Редактирование шага',node_title:'Название',node_reason:'Причина / описание',
    node_metric:'Метрика успеха',node_progress:'Прогресс %',
    node_deadline:'Дедлайн',node_tags:'Теги (через запятую)',
    node_color:'Цвет',node_status:'Статус',node_priority:'Приоритет',
    node_comments:'Комментарии',node_history:'История',
    add_comment_ph:'Написать комментарий…',save_changes:'Сохранить',
    no_comments:'Нет комментариев',no_history:'Нет истории',
    // StatsPopup
    map_health:'Здоровье карты',health_score:'Health Score',
    completed:'Выполнено',in_progress:'В работе',planning:'Планирование',
    blocked:'Заблокировано',critical:'Критических',avg_prog:'Средний прогресс',
    total_connections:'Связей',
    // AiPanel
    ai_consultant:'AI Советник',clear_chat2:'Очистить',
    type_question:'Спросите о стратегии…',send_btn:'Отправить',
    quick_actions:'Быстрые действия',
    // GanttView
    gantt_title:'Gantt Таймлайн',no_deadlines:'Нет дедлайнов',
    gantt_hint:'Добавьте дедлайны к шагам в редакторе',
    today:'Сегодня',overdue:'Просрочено',
    // ProfileModal
    profile_title:'Профиль',security_title:'Безопасность',
    settings_title:'Настройки',stats_tab:'Статистика',billing_title:'Тариф',
    display_name:'Имя',bio_label:'О себе',change_password:'Сменить пароль',
    current_password:'Текущий пароль',new_password:'Новый пароль',
    confirm_password:'Подтвердить пароль',save_password:'Сохранить',
    danger_zone:'Опасная зона',delete_account:'Удалить аккаунт',
    theme_label:'Тема',dark_theme:'Тёмная',light_theme:'Светлая',
    compact_mode:'Компактный режим',default_view:'Вид по умолчанию',
    auto_save:'Автосохранение',ai_language:'Язык AI',
    email_notifications:'Email уведомления',push_notifications:'Push уведомления',
    // WelcomeScreen
    welcome_title:'Постройте стратегию',welcome_sub:'От целей до результатов — с AI',
    get_started:'Начать →',sign_in_btn:'Войти',
    // Misc
    version_history:'История версий',restore:'Восстановить',snapshot:'Снимок',
    no_maps:'Нет карт',create_map:'Создать карту',
    map_name:'Название карты',create_map_btn:'Создать',
    email_no_change:'Email нельзя изменить',account_created:'Аккаунт создан',pw_hint:'Пароль не менее 6 символов',pw_strength:'Надёжность пароля',delete_warning:'Все данные будут удалены',processing_payment:'Обрабатываем платёж…',edge_type:'Тип связи:',logout:'Выйти',no_edges:'Нет связей',map_limit:'Лимит карт исчерпан',author:'Автор:',
    share_btn:'Поделиться',share_map:'Поделиться картой',share_copied:'Ссылка скопирована. Откройте её для просмотра карты.',
    select_language:'Язык',
    free_plan:"Бесплатно",
    per_month_short:"/мес",
    choose_plan:"Выберите свой тариф",
    your_plan:"● Ваш тариф",
    selected:"✓ Выбрано",
    choose_btn:"Выбрать →",
    saving_map:"Сохраняю карту",
    preparing:"Подготавливаю ваше стратегическое пространство…",
    new_password_label:"Новый пароль",
    all_data_deleted:"Все данные будут удалены безвозвратно",
    change_pw_btn:"Изменить пароль",
    chars_6plus:"6+ символов",
    uppercase_chars:"Заглавные",
    choose_template:"Выберите готовую стратегическую карту или начните с нуля",
    choose_template_left:"Выберите шаблон слева",
    empty_scenario:"Пустой сценарий",
    new_scenario:"Новый сценарий",
    scenarios:"Сценарии",
    no_scenarios:"Нет сценариев",
    scenarios_pro:"Сценарии доступны с Pro",
    scenario_templates:"Шаблоны сценариев",
    no_limits:"Без лимитов.",
    no_comparison:"Без сравнения",
    view_label:"Вид",
    login_or_register:"Войдите или создайте аккаунт бесплатно",
    loading_short:"Загрузка…",
    why_label:"Зачем?",
    tools_label:"Инструментарий",
    use_ai_comment:"Используйте @AI чтобы задать вопрос AI.",
    use_connect:"Используйте ⇒ Связать или ✦ AI-связи.",
    history_empty2:"История изменений пуста.",
    metric_label:"Метрика успеха",
    observer:"Наблюдатель",
    click_new_project:"Нажмите «+ Проект» чтобы начать",
    project_name:"Название проекта",
    start_free:"Начать бесплатно",
    start_free_arrow:"Начать бесплатно →",
    start_work:"Начать работу →",
    start_ai_interview:"Начать с чистой карты и AI-интервью",
    begin:"Начните",
    no_comments2:"Нет комментариев.",
    no_projects:"Нет проектов",
    upgrade_to_pro:"Перейти на Pro",
    by_priority:"По приоритетам",
    by_status:"По статусам",
    continue_btn:"Продолжить",
    continue_arrow:"Продолжить →",
    skip:"Пропустить",
    skip_interview:"Пропустить интервью?",
    editor_role:"Редактор",
    watch_demo:"Смотреть демо →",
    create_first_map:"Создайте первую стратегическую карту",
    create_first_scenario:"Создайте первый сценарий вручную или с помощью AI шаблонов",
    create_map_free:"Создать карту бесплатно ✦",
    strategy_maps:"Стратегические карты",
    tariff:"Тариф",
    upgrade_tier_arrow:"Улучшить тариф →",
    node_color_label:"Цвет узла",
    export_label:"Экспорт",
    analyzing_short:"анализ…",
    demo_payment_skipped:"Демо — оплата пропущена",
    add_deadlines_hint:"Добавьте дедлайны к шагам — они появятся здесь",
    three_steps:"Три шага",
    strategy_hero:"Стратегия,",
    which_word:"которая",
    who_word:"кто",
    wins_word:"побеждает",
    speaks_word:"Говорят те,",
    for_free:"бесплатно.",
    included_free:"ВКЛЮЧЕНО БЕСПЛАТНО",
    upgrade_plan:"Улучшить",
    user_word:"Пользователь",
    your_plan_word:"свой тариф",
    strategic_word:"стратегического",
    activate_btn:"Активировать",
    downgrade_to:"Перейти на ",
    replacing:"Заменяю…",
    replace_btn:"🗑 Заменить",
    upgrade_tier:"✦ Расширить тариф",
    // Landing page nav
    nav_features:"Возможности",nav_process:"Процесс",nav_pricing:"Тарифы",
    // Landing hero
    hero_sub:"AI анализирует ваш бизнес, строит стратегическую карту и даёт консультацию уровня McKinsey. Для тех, кто принимает решения с последствиями.",
    // Landing features section
    tag_features:"Возможности",feat_sub:"Каждый инструмент создан для людей, которые принимают решения с последствиями. Не для экспериментов — для результата.",
    feat_leader_word:"лидера",
    lf1_title:"Стратегические карты",lf1_desc:"Причинно-следственные связи между решениями и результатами. Drag-and-drop узлы, зависимости, метрики, дедлайны на одном интерактивном canvas.",
    lf2_title:"AI-консультант",lf2_desc:"SWOT, OKR, First Principles, BCG-матрица, Porter's Five Forces. AI задаёт правильные вопросы и вскрывает системные ограничения вашего бизнеса.",
    lf3_title:"Симуляция сценариев",lf3_desc:"Три версии будущего до принятия решения. Каскадный анализ последствий. Видьте узкие места прежде, чем они станут кризисом.",
    lf4_title:"Gantt-таймлайн",lf4_desc:"Временная шкала, критический путь, роли и зоны ответственности. Стратегия не как идея, а как план с конкретными дедлайнами.",
    lf5_title:"Командная работа",lf5_desc:"Роли, комментарии, история изменений, автосохранение. Стратегия как живой командный документ, а не PDF в чьей-то папке.",
    lf6_title:"Health Score аналитика",lf6_desc:"Сводная оценка здоровья стратегии в одном числе. Приоритеты, риски, прогресс по узлам. Управляйте через данные.",
    // Landing process section
    tag_process:"Процесс",proc_heading_end:"стратегии",to_working:"до рабочей",proc_sub:"Никаких шаблонов. AI строит карту с нуля, опираясь исключительно на контекст вашего бизнеса.",
    lstep1_tag:"Шаг первый",lstep1_title:"AI-интервью",lstep1_desc:"Шесть точных вопросов. AI выявляет цели, скрытые риски и системные ограничения — то, что консалтинг находит за неделю и $50 000.",
    lstep2_tag:"Шаг второй",lstep2_title:"Построение карты",lstep2_desc:"Персональная стратегическая карта с причинно-следственными узлами, метриками, приоритетами и временными горизонтами. За 30 секунд.",
    lstep3_tag:"Шаг третий",lstep3_title:"Консультация",lstep3_desc:"Конкретные следующие шаги, расчёт рисков, альтернативные сценарии. Без воды — только применимые к вашей ситуации решения.",
    // Landing testimonials section
    tag_testimonials:"Отзывы",testi_checked:"проверил",
    lt1_q:"Strategy AI структурировал хаос из идей в чёткий план за двадцать минут. Раньше это стоило консалтинга на десятки тысяч долларов и занимало месяц.",lt1_role:"CEO, Series A стартап",
    lt2_q:"Инструмент, который мыслит как McKinsey. Карты, сценарии и Gantt в одном месте изменили наш product-процесс фундаментально.",lt2_role:"CPO, B2B SaaS",
    lt3_q:"Симуляция сценариев — это отдельный класс. Мы теперь входим в любые переговоры с тремя готовыми исходами вместо одного.",lt3_role:"Управляющий партнёр",
    // Landing pricing section
    tag_pricing_label:"Тарифы",pricing_start_word:"Начните",pricing_sub:"Первая карта и первый AI-анализ бесплатны. Платите только когда убедились в ценности инструмента.",
    pricing_hot_badge:"★ ТОП",
    lpr1_desc:"Для знакомства с инструментом",lpr1_f1:"1 проект и 1 стратегическая карта",lpr1_f2:"AI-интервью и генерация карты",lpr1_f3:"Gantt-таймлайн",lpr1_f4:"PNG / JSON экспорт",start_free_cta:"Начать бесплатно",
    lpr_starter_desc:"Мягкий вход в стратегическое планирование",lpr_starter_f1:"3 проекта, 3 карты каждый",lpr_starter_f2:"2 сценария + AI анализ рисков",lpr_starter_f3:"Полный Gantt + приоритеты",lpr_starter_f4:"1 500 AI-сообщений / мес",lpr_starter_cta:"Начать за $9 →",
    lpr2_desc:"Для профессионалов и команд",lpr2_f1:"10 проектов, 5 карт каждая",lpr2_f2:"SWOT, OKR, BCG, Porter AI-анализ",lpr2_f3:"5 сценариев + симуляция последствий",lpr2_f4:"Клонирование и версионирование карт",lpr2_f5:"Командная работа до 3 человек",lpr2_cta:"Перейти на Pro →",
    lpr3_desc:"Для организаций с системным подходом",lpr3_f1:"Без ограничений: проекты, карты, сценарии",lpr3_f2:"C-level AI коллегиум (5 экспертных ролей)",lpr3_f3:"PPTX-отчёты для совета директоров",lpr3_f4:"White-label и API-интеграции",lpr3_f5:"Выделенный менеджер поддержки",lpr3_cta:"Связаться",
    // Landing CTA section
    cta_h1:"Первый шаг",cta_h2:"занимает",cta_h3:"две минуты",
    cta_sub:"Создайте первую стратегическую карту прямо сейчас. Без кредитной карты. Без шаблонов — только ваш бизнес и AI.",
    cta_trust1:"Бесплатно навсегда",cta_trust2:"Без кредитной карты",cta_trust3:"Данные только ваши",
    // Landing metrics
    lm1_sfx:"мин",lm1_lbl:"от вопроса до первой стратегической карты",
    lm2_lbl:"точность AI-анализа на тестовых кейсах McKinsey",
    lm3_lbl:"уровней экспертной глубины — от Free до Enterprise",
    lm4_lbl:"сценариев для анализа альтернативных исходов",
    // Cookie consent
    cookie_text:"🍪 Мы используем cookies для аналитики и улучшения сервиса. Продолжая, вы соглашаетесь с нашей",cookie_policy:"Политикой конфиденциальности",cookie_accept:"Принять",
    // Footer columns
    footer_product:"Продукт",footer_company:"Компания",footer_legal:"Правовое",
    footer_features:"Возможности",footer_pricing_link:"Тарифы",footer_templates:"Шаблоны",footer_changelog:"Changelog",
    footer_about:"О нас",footer_blog:"Блог",footer_careers:"Карьера",footer_contact:"Контакты",
    footer_privacy:"Политика конфиденциальности",footer_terms:"Условия использования",footer_cookies:"Cookies",footer_gdpr:"GDPR",
    footer_tagline:"Визуальное стратегическое планирование с AI-советником уровня McKinsey.",
    footer_rights:"© 2026 Strategy AI. Все права защищены.",
    // App misc
    delete_forever:"Удалить навсегда",
    by_statuses:"По статусам",by_priorities:"По приоритетам",
    member_limit:"Лимит участников для {plan}: {n}.",
    project_name_label:"Название проекта",saved_ok:"Сохранено",
    // WelcomeScreen
    ws_start_btn:"Начать бесплатно ✦",ws_login_btn:"Уже есть аккаунт — Войти →",
    ws_feat1:"Карты целей",ws_feat2:"AI советник",ws_feat3:"Gantt-план",
    ws_feat4:"PNG/JSON экспорт",ws_feat5:"1 сценарий",ws_feat6:"До 5 шагов",
    ws_terms:"Нажимая «Начать», вы соглашаетесь с условиями использования",
    // VersionHistoryModal
    trial_active:"Пробный период активен",trial_days_left:"дней осталось",
    deadline_reminder:"Напоминания о дедлайнах",
    notif_email_desc:"Важные обновления на почту",notif_push_desc:"Уведомления в браузере",
    restore_confirm:"Восстановить эту версию? Текущие данные будут заменены.",
    versions_empty:"Нет сохранённых версий",restore_version:"Восстановить",
    version_restored:"Версия восстановлена ✓",
    // WeeklyBriefingModal
    weekly_briefing:"Еженедельный брифинг",
    weekly_briefing_date:"Неделя",
    weekly_briefing_gen:"Анализирую карту…",
    weekly_briefing_err:"Не удалось получить AI-анализ.",
    // AI/export
    ai_error:"Ошибка AI-анализа",
    ai_comment_error:"Ошибка AI. Попробуйте ещё раз.",
    ai_generation_error:"Ошибка генерации. Попробуйте ещё раз.",
    ai_sim_error:"Ошибка AI-консультанта",
    export_pdf:"Скачать PDF",export_pptx:"Скачать PPTX",
    // MapEditor toasts & misc
    imported_steps:"✅ Импортировано: {n} шагов",
    json_invalid:"Некорректный формат JSON",
    file_read_err:"Ошибка чтения файла",
    png_exported:"PNG экспортирован ✓",
    json_exported:"JSON экспортирован ✓",
    share_create_err:"Ошибка создания ссылки",
    popup_blocked:"Разрешите всплывающие окна для экспорта",
    layout_applied:"⌥ Авто-раскладка применена",
    min_2_steps:"Нужно минимум 2 шага",
    ai_analyzing_links:"🔗 AI анализирует логику карты…",
    links_added:"🔗 Добавлено: {n} связей",
    links_optimal:"Связи уже оптимальны — добавить нечего",
    copied:"📋 Скопировано",pasted:"📋 Вставлено",
    confirm_restore:"Восстановить?",
    confirm_delete_map:"Удалить карту?",
    confirm_delete_proj:"Все карты и данные проекта будут удалены безвозвратно.",
    // ProfileModal messages
    profile_saved:"Профиль обновлён ✓",
    fill_all_fields:"Заполните все поля",
    min_6_chars:"Минимум 6 символов",
    pw_mismatch:"Пароли не совпадают",
    pw_changed:"Пароль изменён ✓",
    pw_change_err:"Ошибка смены пароля",
    wrong_pw:"Неверный текущий пароль",
    delete_err:"Ошибка при удалении",
    settings_saved:"Настройки сохранены ✓",
    appearance:"Внешний вид",
    light_theme_label:"☀️ Светлая",dark_theme_label:"🌙 Тёмная",
    palette_label:"Цветовая палитра",
    compact_desc:"Уменьшенные карточки узлов",
    autosave_desc:"Сохранять карту при каждом изменении",
    canvas_view:"🗺 Канвас",gantt_view:"📅 Gantt",list_view:"📋 Список",
    ai_assistant_title:"🤖 AI-ассистент",notifications_title:"🔔 Уведомления",
    save_settings:"Сохранить настройки",
    maps_available:"Карт доступно",scenarios_available:"Сценариев",
    projects_available:"Проектов",ai_level:"AI уровень",
    // ProjectsPage/ProjectDetail
    projects_of:"{n} из {max} проектов",
    project_limit:"Лимит проектов для тарифа",
    new_project_btn:"+ Проект",
    scenarios_label:"Сценарии",
    overdue_label:"просрочено",
    updated_label:"обновлено",
    steps_label:"шагов",
    maps_label:"карт",
    scenarios_count:"сцен.",
    map_limit_tier:"Лимит карт для {tier}: {n}",
    template_applied:"Шаблон применён ✓",
    scenario_created:"Сценарий создан ✓",
    scenario_limit:"Лимит сценариев для тарифа",
    members_limit:"Лимит участников: {n}",
    member_added:"Участник добавлен",
    member_added_already:"Участник уже добавлен",
    member_add_err:"Ошибка добавления участника",
    payment_success:"✅ Оплата прошла успешно! Тариф обновлён.",
    // GanttView
    steps_with_deadlines:"{n} шагов с дедлайнами",
    days_overdue:"просрочено {n}д.",
    days_left:"{n}д.",
    tomorrow_label:"завтра",
    // Onboarding / interview
    analyzing_answers:"Анализирую ваши ответы и строю персональную карту…",
    create_map_btn2:"Создать карту ✦",answer_btn:"Ответить →",
    interview_count:"AI-интервью · {n}/{max} вопросов",
    skip_interview_confirm:"Пропустить интервью и начать с пустой карты?",
    // Simulation
    sim_goal:"🎯 Желаемый результат",sim_metric:"📊 Целевая метрика",
    sim_budget:"💰 Бюджет ($)",sim_team:"👥 Команда (чел)",
    sim_revenue:"💵 Целевая выручка ($)",sim_timeline:"⏱ Срок",
    sim_run:"▶ Запустить симуляцию",sim_stop:"⏹ Остановить",sim_reset:"↺ Сбросить",
    sim_ask_ai:"✦ Спросить AI",sim_q_ph:"Вопрос о симуляции…",
    // Tier-related
    tier_activated:"Тариф {tier} активирован ✓",
    stay_on_plan:"Остаться на {plan}",
    go_to_plan:"Перейти на {plan} — {price}",
    card_number_ph:"Номер карты…",card_holder_ph:"Имя держателя…",
    card_expiry_ph:"ММ/ГГ",card_cvv_ph:"CVV",
    card_data_title:"💳 Данные карты",
    downgrade_warning:"После смены тарифа часть данных может быть ограничена.",
    downgrade_limit_maps:"Карт на новом тарифе",
    downgrade_limit_projects:"Проектов на новом тарифе",
    downgrade_excess:"Данные сверх лимита станут доступны только для чтения.",
    current_tier_badge:"✓ Текущий тариф",
    alt_strategies:"Альтернативные стратегии сценария",
    done:"Выполнено",
    verify_email_banner:"Подтвердите ваш email для полного доступа.",
    verify_email_resend:"Отправить письмо повторно",
    verify_email_sent:"Письмо отправлено! Проверьте почту.",
    verify_email_done:"✓ Email подтверждён"},
  en:{
    save:'Save',cancel:'Cancel',delete:'Delete',add:'Add',
    edit:'Edit',close:'Close',confirm:'Confirm',back:'Back',
    all:'All',yes:'Yes',no:'No',loading:'Loading…',search:'Search',
    login:'Log In',register:'Register',email:'Email',password:'Password',name:'Name',
    fill_fields:'Please fill all fields',welcome:'Welcome back',
    create_account:'Create Account',no_account:"Don't have an account?",
    have_account:'Already have an account?',sign_in:'Sign In',sign_up:'Sign Up',
    status:'Status',status_planning:'Planning',status_active:'In Progress',
    status_completed:'Completed',status_blocked:'Blocked',status_paused:'Paused',
    priority:'Priority',priority_low:'Low',priority_medium:'Medium',
    priority_high:'High',priority_critical:'Critical',
    etype_requires:'Requires',etype_affects:'Affects',etype_follows:'Follows',etype_blocks:'Blocks',
    role_owner:'Owner',role_editor:'Editor',role_viewer:'Viewer',
    undo:'Undo',redo:'Redo',new_step:'+ Step',connect_btn:'⇒ Connect',
    fit:'Fit',bg_btn:'Grid',simulation:'▶ Simulate',gantt:'Gantt',
    export_png:'PNG',export_json:'JSON↓',import_json:'JSON↑',
    ai_advisor:'✦ AI',shortcuts_btn:'?',
    dark_mode:'🌙 Dark',light_mode:'☀️ Light',layout_btn:'⌥ Auto-layout',
    all_statuses:'All',filtered_count:'filtered',clear_filter:'✕ Clear',
    step:'Step',steps:'Steps',new_step_title:'New Step',
    step_title:'Step title',description:'Description (why?)',
    metric:'Success metric',progress:'Progress',
    deadline:'Deadline',tags_label:'Tags',comments_label:'Comments',
    history_label:'Change history',color_label:'Color',
    step_deleted:'deleted',undo_action:'↩ Undo',
    saved:'Saved ✓',saving:'Saving…',save_error:'Save failed',connect_select_source:'⇒ select source',
    connect_select_target:'→ select target',
    ai_title:'AI Advisor',clear_chat:'Clear chat',
    ask_placeholder:'Ask about strategy…',analyzing:'analyzing…',
    ai_online:'online',ai_offline:'offline',
    shortcuts_title:'⌨️ Keyboard Shortcuts',
    sc_nav:'— NAVIGATION —',sc_fit:'Fit map to screen',sc_next:'Next step',
    sc_zoom:'Reset zoom',sc_pan:'Pan canvas',
    sc_edit:'— EDITING —',sc_new:'Add step',sc_dup:'Duplicate step',
    sc_open:'Open editor',sc_focus:'Focus title field',sc_del:'Delete',
    sc_undo:'Undo',sc_save:'Save',
    sc_search:'— SEARCH —',sc_search_action:'Search steps',sc_esc:'Close/Reset',
    sc_ui:'— INTERFACE —',
    free_forever:'Free',per_month:'/mo',current_plan:'Current Plan',
    upgrade:'Upgrade',downgrade:'Downgrade',
    projects:'Projects',new_project:'+ New Project',maps:'Maps',
    members:'Members',settings:'Settings',my_projects:'My Projects',
    connect_all:'🔗 Auto-connect',analyzing_map:'Analyzing map connections…',
    no_steps:'No steps',
    stats_title:'Map Statistics',total_steps:'Total steps',
    done_steps:'Completed',in_progress_steps:'In progress',
    avg_progress:'Avg progress',critical_count:'Critical',
    blocked_count:'Blocked',edges_count:'Connections',
    ai_rephrase:'✨ Rephrase',auto_connect:'🔗 Connect',
    delete_step:'Delete step',add_comment:'Add comment',
    comments_empty:'No comments yet',history_empty:'No changes yet',
    scroll_to:'↗ Go to',read_only:'Read only',
    connections:'Connections',incoming:'incoming',outgoing:'outgoing',
    // ProjectsPage
    hello:'Hello',your_projects:'My Projects',create_first:'Create your first project',
    no_projects_hint:'Create a project to start strategic planning',
    new_project_name:'New project name',create_project:'Create project',
    open_project:'Open',delete_project:'Delete',
    last_updated:'Updated',maps_count:'maps',
    // MapEditor toolbar
    back_btn:'← Back',add_step:'+ Step',link_btn:'⇒ Connect',
    fit_view:'Fit',auto_layout:'⌥ Auto-layout',
    ai_links:'🔗 AI-links',bg_grid:'⊞',bg_stars:'✦',bg_none:'○',
    map_tour:'🗺 Tour',show_stats:'📊',shortcuts:'⌨️',
    simulate:'⎇ Simulate',templates:'📋 Templates',
    export_png2:'⬇PNG',export_json2:'⬇JSON',import_json2:'⬆JSON',
    // NodeEditor
    edit_step:'Edit Step',node_title:'Title',node_reason:'Reason / description',
    node_metric:'Success metric',node_progress:'Progress %',
    node_deadline:'Deadline',node_tags:'Tags (comma separated)',
    node_color:'Color',node_status:'Status',node_priority:'Priority',
    node_comments:'Comments',node_history:'History',
    add_comment_ph:'Write a comment…',save_changes:'Save',
    no_comments:'No comments',no_history:'No history',
    // StatsPopup
    map_health:'Map Health',health_score:'Health Score',
    completed:'Completed',in_progress:'In Progress',planning:'Planning',
    blocked:'Blocked',critical:'Critical',avg_prog:'Avg progress',
    total_connections:'Connections',
    // AiPanel
    ai_consultant:'AI Advisor',clear_chat2:'Clear',
    type_question:'Ask about strategy…',send_btn:'Send',
    quick_actions:'Quick actions',
    // GanttView
    gantt_title:'Gantt Timeline',no_deadlines:'No deadlines',
    gantt_hint:'Add deadlines to steps in the editor',
    today:'Today',overdue:'Overdue',
    // ProfileModal
    profile_title:'Profile',security_title:'Security',
    settings_title:'Settings',stats_tab:'Statistics',billing_title:'Billing',
    display_name:'Name',bio_label:'Bio',change_password:'Change password',
    current_password:'Current password',new_password:'New password',
    confirm_password:'Confirm password',save_password:'Save',
    danger_zone:'Danger zone',delete_account:'Delete account',
    theme_label:'Theme',dark_theme:'Dark',light_theme:'Light',
    compact_mode:'Compact mode',default_view:'Default view',
    auto_save:'Auto-save',ai_language:'AI language',
    email_notifications:'Email notifications',push_notifications:'Push notifications',
    // WelcomeScreen
    welcome_title:'Build your strategy',welcome_sub:'From goals to results — with AI',
    get_started:'Get started →',sign_in_btn:'Sign In',
    // Misc
    version_history:'Version history',restore:'Restore',snapshot:'Snapshot',
    no_maps:'No maps',create_map:'Create map',
    map_name:'Map name',create_map_btn:'Create',
    email_no_change:'Email cannot be changed',account_created:'Account created',pw_hint:'Password min 6 characters',pw_strength:'Password strength',delete_warning:'All data will be deleted permanently',processing_payment:'Processing payment…',edge_type:'Connection type:',logout:'Log out',no_edges:'No connections',map_limit:'Map limit reached',author:'Author:',
    share_btn:'Share',share_map:'Share map',share_copied:'Link copied. Open it to view the map.',
    select_language:'Language',
    free_plan:"Free",
    per_month_short:"/mo",
    choose_plan:"Choose your plan",
    your_plan:"● Your plan",
    selected:"✓ Selected",
    choose_btn:"Choose →",
    saving_map:"Saving map",
    preparing:"Preparing your strategic workspace…",
    new_password_label:"New password",
    all_data_deleted:"All data will be permanently deleted",
    change_pw_btn:"Change password",
    chars_6plus:"6+ chars",
    uppercase_chars:"Uppercase",
    choose_template:"Choose a ready-made strategy map or start from scratch",
    choose_template_left:"Choose a template on the left",
    empty_scenario:"Empty scenario",
    new_scenario:"New scenario",
    scenarios:"Scenarios",
    no_scenarios:"No scenarios",
    scenarios_pro:"Scenarios available with Pro",
    scenario_templates:"Scenario Templates",
    no_limits:"No limits.",
    no_comparison:"No comparison",
    view_label:"View",
    login_or_register:"Sign in or create a free account",
    loading_short:"Loading…",
    why_label:"Why?",
    tools_label:"Toolkit",
    use_ai_comment:"Use @AI to ask the AI a question.",
    use_connect:"Use ⇒ Connect or ✦ AI-links.",
    history_empty2:"Change history is empty.",
    metric_label:"Success metric",
    observer:"Observer",
    click_new_project:"Click «+ Project» to get started",
    project_name:"Project name",
    start_free:"Start free",
    start_free_arrow:"Start free →",
    start_work:"Get started →",
    start_ai_interview:"Start with blank map and AI interview",
    begin:"Begin",
    no_comments2:"No comments.",
    no_projects:"No projects",
    upgrade_to_pro:"Upgrade to Pro",
    by_priority:"By priority",
    by_status:"By status",
    continue_btn:"Continue",
    continue_arrow:"Continue →",
    skip:"Skip",
    skip_interview:"Skip interview?",
    editor_role:"Editor",
    watch_demo:"Watch demo →",
    create_first_map:"Create your first strategy map",
    create_first_scenario:"Create your first scenario manually or with AI templates",
    create_map_free:"Create map free ✦",
    strategy_maps:"Strategy Maps",
    tariff:"Plan",
    upgrade_tier_arrow:"Upgrade plan →",
    node_color_label:"Node color",
    export_label:"Export",
    analyzing_short:"analyzing…",
    demo_payment_skipped:"Demo — payment skipped",
    add_deadlines_hint:"Add deadlines to steps — they will appear here",
    three_steps:"Three steps",
    strategy_hero:"Strategy,",
    which_word:"that",
    who_word:"who",
    wins_word:"wins",
    speaks_word:"From those who",
    for_free:"for free.",
    included_free:"INCLUDED FREE",
    upgrade_plan:"Upgrade",
    user_word:"User",
    your_plan_word:"your plan",
    strategic_word:"strategic",
    activate_btn:"Activate",
    downgrade_to:"Switch to ",
    replacing:"Replacing…",
    replace_btn:"🗑 Replace",
    upgrade_tier:"✦ Upgrade plan",
    // Landing page nav
    nav_features:"Features",nav_process:"Process",nav_pricing:"Pricing",
    // Landing hero
    hero_sub:"AI analyzes your business, builds a strategic map and delivers McKinsey-level consultation. For those who make decisions with consequences.",
    // Landing features section
    tag_features:"Features",feat_sub:"Every tool is built for people who make decisions with real consequences. Not for experimentation — for results.",
    feat_leader_word:"leader",
    lf1_title:"Strategy Maps",lf1_desc:"Cause-and-effect relationships between decisions and outcomes. Drag-and-drop nodes, dependencies, metrics, and deadlines on one interactive canvas.",
    lf2_title:"AI Consultant",lf2_desc:"SWOT, OKR, First Principles, BCG matrix, Porter's Five Forces. AI asks the right questions and uncovers systemic constraints in your business.",
    lf3_title:"Scenario Simulation",lf3_desc:"Three versions of the future before making a decision. Cascading analysis of consequences. See bottlenecks before they become a crisis.",
    lf4_title:"Gantt Timeline",lf4_desc:"Timeline, critical path, roles and responsibility areas. Strategy not as an idea, but as a plan with concrete deadlines.",
    lf5_title:"Team Collaboration",lf5_desc:"Roles, comments, change history, auto-save. Strategy as a living team document, not a PDF in someone's folder.",
    lf6_title:"Health Score Analytics",lf6_desc:"A single number that summarizes the health of your strategy. Priorities, risks, node progress. Manage through data.",
    // Landing process section
    tag_process:"Process",proc_heading_end:"strategy",to_working:"to a working",proc_sub:"No templates. AI builds the map from scratch based exclusively on the context of your business.",
    lstep1_tag:"Step one",lstep1_title:"AI Interview",lstep1_desc:"Six precise questions. AI identifies goals, hidden risks and systemic constraints — what consulting takes a week and $50,000 to find.",
    lstep2_tag:"Step two",lstep2_title:"Map Building",lstep2_desc:"A personal strategy map with cause-and-effect nodes, metrics, priorities and time horizons. In 30 seconds.",
    lstep3_tag:"Step three",lstep3_title:"Consultation",lstep3_desc:"Concrete next steps, risk assessment, alternative scenarios. No fluff — only solutions applicable to your specific situation.",
    // Landing testimonials section
    tag_testimonials:"Reviews",testi_checked:"tested it",
    lt1_q:"Strategy AI structured the chaos of ideas into a clear plan in twenty minutes. Previously this cost tens of thousands in consulting and took a month.",lt1_role:"CEO, Series A startup",
    lt2_q:"A tool that thinks like McKinsey. Maps, scenarios and Gantt in one place fundamentally changed our product process.",lt2_role:"CPO, B2B SaaS",
    lt3_q:"Scenario simulation is a class of its own. We now enter any negotiation with three prepared outcomes instead of one.",lt3_role:"Managing Partner",
    // Landing pricing section
    tag_pricing_label:"Pricing",pricing_start_word:"Start",pricing_sub:"Your first map and first AI analysis are free. Pay only when you're convinced of the tool's value.",
    pricing_hot_badge:"★ TOP",
    lpr1_desc:"To get acquainted with the tool",lpr1_f1:"1 project and 1 strategy map",lpr1_f2:"AI interview and map generation",lpr1_f3:"Gantt timeline",lpr1_f4:"PNG / JSON export",start_free_cta:"Start free",
    lpr_starter_desc:"A gentle entry into strategic planning",lpr_starter_f1:"3 projects, 3 maps each",lpr_starter_f2:"2 scenarios + AI risk analysis",lpr_starter_f3:"Full Gantt + priorities",lpr_starter_f4:"1,500 AI messages / month",lpr_starter_cta:"Start for $9 →",
    lpr2_desc:"For professionals and teams",lpr2_f1:"10 projects, 5 maps each",lpr2_f2:"SWOT, OKR, BCG, Porter AI-analysis",lpr2_f3:"5 scenarios + consequence simulation",lpr2_f4:"Map cloning and versioning",lpr2_f5:"Team collaboration up to 3 people",lpr2_cta:"Go Pro →",
    lpr3_desc:"For organizations with a systematic approach",lpr3_f1:"Unlimited: projects, maps, scenarios",lpr3_f2:"C-level AI collegium (5 expert roles)",lpr3_f3:"PPTX reports for board of directors",lpr3_f4:"White-label and API integrations",lpr3_f5:"Dedicated support manager",lpr3_cta:"Contact us",
    // Landing CTA section
    cta_h1:"The first step",cta_h2:"takes only",cta_h3:"two minutes",
    cta_sub:"Create your first strategy map right now. No credit card. No templates — just your business and AI.",
    cta_trust1:"Free forever",cta_trust2:"No credit card",cta_trust3:"Your data only",
    // Landing metrics
    lm1_sfx:"min",lm1_lbl:"from question to first strategy map",
    lm2_lbl:"AI analysis accuracy on McKinsey test cases",
    lm3_lbl:"levels of expert depth — from Free to Enterprise",
    lm4_lbl:"scenarios for analyzing alternative outcomes",
    // Cookie consent
    cookie_text:"🍪 We use cookies for analytics and service improvement. By continuing, you agree to our",cookie_policy:"Privacy Policy",cookie_accept:"Accept",
    // Footer columns
    footer_product:"Product",footer_company:"Company",footer_legal:"Legal",
    footer_features:"Features",footer_pricing_link:"Pricing",footer_templates:"Templates",footer_changelog:"Changelog",
    footer_about:"About",footer_blog:"Blog",footer_careers:"Careers",footer_contact:"Contact",
    footer_privacy:"Privacy Policy",footer_terms:"Terms of Service",footer_cookies:"Cookies",footer_gdpr:"GDPR",
    footer_tagline:"Visual strategic planning with a McKinsey-level AI advisor.",
    footer_rights:"© 2026 Strategy AI. All rights reserved.",
    // App misc
    delete_forever:"Delete permanently",
    by_statuses:"By statuses",by_priorities:"By priorities",
    member_limit:"Member limit for {plan}: {n}.",
    project_name_label:"Project name",saved_ok:"Saved",
    // WelcomeScreen
    ws_start_btn:"Start free ✦",ws_login_btn:"Already have an account — Sign in →",
    ws_feat1:"Goal maps",ws_feat2:"AI advisor",ws_feat3:"Gantt plan",
    ws_feat4:"PNG/JSON export",ws_feat5:"1 scenario",ws_feat6:"Up to 5 steps",
    ws_terms:"By clicking «Start», you agree to the Terms of Service",
    // VersionHistoryModal
    trial_active:"Trial period active",trial_days_left:"days left",
    deadline_reminder:"Deadline reminders",
    notif_email_desc:"Important updates by email",notif_push_desc:"Browser notifications",
    restore_confirm:"Restore this version? Current data will be replaced.",
    versions_empty:"No saved versions",restore_version:"Restore",
    version_restored:"Version restored ✓",
    // WeeklyBriefingModal
    weekly_briefing:"Weekly briefing",
    weekly_briefing_date:"Week",
    weekly_briefing_gen:"Analyzing map…",
    weekly_briefing_err:"Failed to get AI analysis.",
    // AI/export
    ai_error:"AI analysis error",
    ai_comment_error:"AI error. Please try again.",
    ai_generation_error:"Generation error. Please try again.",
    ai_sim_error:"AI consultant error",
    export_pdf:"Download PDF",export_pptx:"Download PPTX",
    // MapEditor toasts & misc
    imported_steps:"✅ Imported: {n} steps",
    json_invalid:"Invalid JSON format",
    file_read_err:"File read error",
    png_exported:"PNG exported ✓",
    json_exported:"JSON exported ✓",
    share_create_err:"Failed to create share link",
    popup_blocked:"Allow pop-ups for export",
    layout_applied:"⌥ Auto-layout applied",
    min_2_steps:"At least 2 steps required",
    ai_analyzing_links:"🔗 AI is analyzing map logic…",
    links_added:"🔗 Added: {n} connections",
    links_optimal:"Connections are already optimal — nothing to add",
    copied:"📋 Copied",pasted:"📋 Pasted",
    confirm_restore:"Restore?",
    confirm_delete_map:"Delete this map?",
    confirm_delete_proj:"All maps and project data will be permanently deleted.",
    // ProfileModal messages
    profile_saved:"Profile updated ✓",
    fill_all_fields:"Please fill all fields",
    min_6_chars:"Minimum 6 characters",
    pw_mismatch:"Passwords do not match",
    pw_changed:"Password changed ✓",
    pw_change_err:"Password change error",
    wrong_pw:"Incorrect current password",
    delete_err:"Error deleting account",
    settings_saved:"Settings saved ✓",
    appearance:"Appearance",
    light_theme_label:"☀️ Light",dark_theme_label:"🌙 Dark",
    palette_label:"Color palette",
    compact_desc:"Smaller node cards",
    autosave_desc:"Save map on every change",
    canvas_view:"🗺 Canvas",gantt_view:"📅 Gantt",list_view:"📋 List",
    ai_assistant_title:"🤖 AI Assistant",notifications_title:"🔔 Notifications",
    save_settings:"Save settings",
    maps_available:"Maps available",scenarios_available:"Scenarios",
    projects_available:"Projects",ai_level:"AI level",
    // ProjectsPage/ProjectDetail
    projects_of:"{n} of {max} projects",
    project_limit:"Project limit for plan",
    new_project_btn:"+ Project",
    scenarios_label:"Scenarios",
    overdue_label:"overdue",
    updated_label:"updated",
    steps_label:"steps",
    maps_label:"maps",
    scenarios_count:"scen.",
    map_limit_tier:"Map limit for {tier}: {n}",
    template_applied:"Template applied ✓",
    scenario_created:"Scenario created ✓",
    scenario_limit:"Scenario limit for plan",
    members_limit:"Member limit: {n}",
    member_added:"Member added",
    member_added_already:"Member already added",
    member_add_err:"Failed to add member",
    payment_success:"✅ Payment successful! Plan updated.",
    // GanttView
    steps_with_deadlines:"{n} steps with deadlines",
    days_overdue:"overdue {n}d.",
    days_left:"{n}d.",
    tomorrow_label:"tomorrow",
    // Onboarding / interview
    analyzing_answers:"Analyzing your answers and building a personal map…",
    create_map_btn2:"Create map ✦",answer_btn:"Answer →",
    interview_count:"AI interview · {n}/{max} questions",
    skip_interview_confirm:"Skip interview and start with blank map?",
    // Simulation
    sim_goal:"🎯 Desired outcome",sim_metric:"📊 Target metric",
    sim_budget:"💰 Budget ($)",sim_team:"👥 Team (people)",
    sim_revenue:"💵 Target revenue ($)",sim_timeline:"⏱ Timeline",
    sim_run:"▶ Run simulation",sim_stop:"⏹ Stop",sim_reset:"↺ Reset",
    sim_ask_ai:"✦ Ask AI",sim_q_ph:"Question about simulation…",
    // Tier-related
    tier_activated:"Plan {tier} activated ✓",
    stay_on_plan:"Stay on {plan}",
    go_to_plan:"Switch to {plan} — {price}",
    card_number_ph:"Card number…",card_holder_ph:"Cardholder name…",
    card_expiry_ph:"MM/YY",card_cvv_ph:"CVV",
    card_data_title:"💳 Card details",
    downgrade_warning:"After downgrading, some data may be restricted.",
    downgrade_limit_maps:"Maps on new plan",
    downgrade_limit_projects:"Projects on new plan",
    downgrade_excess:"Data exceeding limits will become read-only.",
    current_tier_badge:"✓ Current plan",
    alt_strategies:"Alternative scenario strategies",
    done:"Completed",
    verify_email_banner:"Please verify your email for full access.",
    verify_email_resend:"Resend verification email",
    verify_email_sent:"Email sent! Check your inbox.",
    verify_email_done:"✓ Email verified"},
  uz:{
    save:"Saqlash",cancel:"Bekor",delete:"O'chirish",add:"Qo'shish",
    edit:"Tahrirlash",close:"Yopish",confirm:"Tasdiqlash",back:"Orqaga",
    all:"Barchasi",yes:"Ha",no:"Yo'q",loading:"Yuklanmoqda…",search:"Qidirish",
    login:"Kirish",register:"Ro'yxatdan o'tish",email:"Email",password:"Parol",name:"Ism",
    fill_fields:"Barcha maydonlarni to'ldiring",welcome:"Xush kelibsiz",
    create_account:"Hisob yaratish",no_account:"Hisobingiz yo'qmi?",
    have_account:"Hisobingiz bormi?",sign_in:"Kirish",sign_up:"Ro'yxatdan o'tish",
    status:"Holat",status_planning:"Rejalashtirish",status_active:"Jarayonda",
    status_completed:"Bajarildi",status_blocked:"Bloklangan",status_paused:"To'xtatildi",
    priority:"Muhimlik",priority_low:"Past",priority_medium:"O'rta",
    priority_high:"Yuqori",priority_critical:"Kritik",
    etype_requires:"Talab qiladi",etype_affects:"Ta'sir qiladi",
    etype_follows:"Keyingi",etype_blocks:"Bloklaydi",
    role_owner:"Egasi",role_editor:"Muharrir",role_viewer:"Ko'ruvchi",
    undo:"Bekor qilish",redo:"Qaytarish",new_step:"+ Qadam",connect_btn:"⇒ Bog'lash",
    fit:"Moslashtirish",bg_btn:"Fon",simulation:"▶ Simulyatsiya",gantt:"Gantt",
    export_png:"PNG",export_json:"JSON↓",import_json:"JSON↑",
    ai_advisor:"✦ AI",shortcuts_btn:"?",
    dark_mode:"🌙 Qorong'u",light_mode:"☀️ Yorug'",layout_btn:"⌥ Avto-joylashtirish",
    all_statuses:"Barchasi",filtered_count:"filtrlangan",clear_filter:"✕ Tozalash",
    step:"Qadam",steps:"Qadam",new_step_title:"Yangi qadam",
    step_title:"Qadam nomi",description:"Tavsif (nima uchun?)",
    metric:"Muvaffaqiyat metrikasi",progress:"Jarayon",
    deadline:"Muddat",tags_label:"Teglar",comments_label:"Izohlar",
    history_label:"O'zgarishlar tarixi",color_label:"Rang",
    step_deleted:"o'chirildi",undo_action:"↩ Bekor qilish",
    saved:"Saqlandi ✓",saving:"Saqlanmoqda…",save_error:"Saqlashda xato",
    connect_select_source:"⇒ manba tanlang",connect_select_target:"→ maqsad tanlang",
    ai_title:"AI Maslahatchi",clear_chat:"Chatni tozalash",
    ask_placeholder:"Strategiya haqida so'rang…",analyzing:"tahlil qilinmoqda…",
    ai_online:"onlayn",ai_offline:"aloqa yo'q",
    shortcuts_title:"⌨️ Tezkor tugmalar",
    sc_nav:"— NAVIGATSIYA —",sc_fit:"Xaritani moslashtirish",sc_next:"Keyingi qadam",
    sc_zoom:"Zoomni tiklash",sc_pan:"Kanvada harakatlanish",
    sc_edit:"— TAHRIRLASH —",sc_new:"Qadam qo'shish",sc_dup:"Nusxa ko'chirish",
    sc_open:"Muharrir ochish",sc_focus:"Sarlavhaga fokus",sc_del:"O'chirish",
    sc_undo:"Bekor qilish",sc_save:"Saqlash",
    sc_search:"— QIDIRISH —",sc_search_action:"Qadamlarni qidirish",sc_esc:"Yopish/Tiklash",
    sc_ui:"— INTERFEYS —",
    free_forever:"Bepul",per_month:"/oy",current_plan:"Joriy reja",
    upgrade:"Yaxshilash",downgrade:"Pasaytirish",
    projects:"Loyihalar",new_project:"+ Yangi loyiha",maps:"Xaritalar",
    members:"A'zolar",settings:"Sozlamalar",my_projects:"Mening loyihalarim",
    connect_all:"🔗 Avto-bog'lash",analyzing_map:"Xarita bog'liqliklarini tahlil qilish…",
    no_steps:"Qadamlar yo'q",
    stats_title:"Xarita statistikasi",total_steps:"Jami qadamlar",
    done_steps:"Bajarildi",in_progress_steps:"Jarayonda",
    avg_progress:"O'rtacha jarayon",critical_count:"Kritik",
    blocked_count:"Bloklangan",edges_count:"Bog'liqliklar",
    ai_rephrase:"✨ Qayta yozish",auto_connect:"🔗 Bog'lash",
    delete_step:"Qadamni o'chirish",add_comment:"Izoh qo'shish",
    comments_empty:"Izohlar yo'q",history_empty:"O'zgarishlar yo'q",
    scroll_to:"↗ O'tish",read_only:"Faqat ko'rish",
    connections:"Bog'liqliklar",incoming:"kiruvchi",outgoing:"chiquvchi",
    // ProjectsPage
    hello:"Salom",your_projects:"Loyihalarim",create_first:"Birinchi loyihani yarating",
    no_projects_hint:"Strategik rejalashtirish uchun loyiha yarating",
    new_project_name:"Yangi loyiha nomi",create_project:"Loyiha yaratish",
    open_project:"Ochish",delete_project:"O'chirish",
    last_updated:"Yangilangan",maps_count:"xarita",
    // MapEditor toolbar
    back_btn:"← Orqaga",add_step:"+ Qadam",link_btn:"⇒ Bog'lash",
    fit_view:"Moslashtirish",auto_layout:"⌥ Joylashtirish",
    ai_links:"🔗 AI-bog'liqliklar",bg_grid:"⊞",bg_stars:"✦",bg_none:"○",
    map_tour:"🗺 Tur",show_stats:"📊",shortcuts:"⌨️",
    simulate:"⎇ Simulyatsiya",templates:"📋 Shablonlar",
    export_png2:'⬇PNG',export_json2:'⬇JSON',import_json2:'⬆JSON',
    // NodeEditor
    edit_step:"Qadam tahrirlash",node_title:"Sarlavha",node_reason:"Sabab / tavsif",
    node_metric:"Muvaffaqiyat metrikasi",node_progress:"Jarayon %",
    node_deadline:"Muddat",node_tags:"Teglar (vergul bilan)",
    node_color:"Rang",node_status:"Holat",node_priority:"Muhimlik",
    node_comments:"Izohlar",node_history:"Tarix",
    add_comment_ph:"Izoh yozing…",save_changes:"Saqlash",
    no_comments:"Izoh yo'q",no_history:"Tarix yo'q",
    // StatsPopup
    map_health:"Xarita salomatligi",health_score:"Salomatlik bali",
    completed:"Bajarildi",in_progress:"Jarayonda",planning:"Rejalashtirish",
    blocked:"Bloklangan",critical:"Kritik",avg_prog:"O'rtacha jarayon",
    total_connections:"Bog'liqliklar",
    // AiPanel
    ai_consultant:"AI Maslahatchi",clear_chat2:"Tozalash",
    type_question:"Savol yozing…",send_btn:"Yuborish",
    quick_actions:"Tezkor harakatlar",
    // GanttView
    gantt_title:"Gantt Taymlayn",no_deadlines:"Muddatlar yo'q",
    gantt_hint:"Muddatlarni qadam muharririda qo'shing",
    today:"Bugun",overdue:"Kechiktirilgan",
    // ProfileModal
    profile_title:"Profil",security_title:"Xavfsizlik",
    settings_title:"Sozlamalar",stats_tab:"Statistika",billing_title:"Tarif",
    display_name:"Ism",bio_label:"Bio",change_password:"Parolni o'zgartirish",
    current_password:"Joriy parol",new_password:"Yangi parol",
    confirm_password:"Parolni tasdiqlash",save_password:"Saqlash",
    danger_zone:"Xavfli zona",delete_account:"Hisobni o'chirish",
    theme_label:"Mavzu",dark_theme:"Qorong'u",light_theme:"Yorug'",
    light_theme_label:"☀️ Yorug'",dark_theme_label:"🌙 Qorong'u",
    palette_label:"Rang palitrasi",
    compact_mode:"Ixcham rejim",default_view:"Standart ko'rinish",
    auto_save:"Avtomatik saqlash",ai_language:"AI tili",
    email_notifications:"Email bildirishnomalar",push_notifications:"Push bildirishnomalar",
    // WelcomeScreen
    welcome_title:"Strategiyangizni quring",welcome_sub:"Maqsadlardan natijalargacha — AI bilan",
    get_started:"Boshlash →",sign_in_btn:"Kirish",
    // Misc
    version_history:"Versiyalar tarixi",restore:"Tiklash",snapshot:"Snimok",
    no_maps:"Xaritalar yo'q",create_map:"Xarita yaratish",
    map_name:"Xarita nomi",create_map_btn:"Yaratish",
    email_no_change:"Email o'zgartirib bo'lmaydi",account_created:"Hisob yaratilgan",pw_hint:"Parol kamida 6 belgi",pw_strength:"Parol kuchi",delete_warning:"Barcha ma'lumotlar o'chiriladi",processing_payment:"To'lov amalga oshirilmoqda…",edge_type:"Bog'liqlik turi:",logout:"Chiqish",no_edges:"Bog'liqliklar yo'q",map_limit:"Xarita limiti tugadi",author:"Muallif:",
    share_btn:"Ulashish",share_map:"Xaritani ulashish",share_copied:"Link nusxalandi. Xaritani ko'rish uchun oching.",
    select_language:"Til",
    
    free_plan:"Bepul",
    per_month_short:"/oy",
    choose_plan:"O'z tarifingizni tanlang",
    your_plan:"● Sizning tarifingiz",
    selected:"✓ Tanlangan",
    choose_btn:"Tanlash →",
    saving_map:"Xarita saqlanmoqda",
    preparing:"Strategik ish maydoningiz tayyorlanmoqda…",
    new_password_label:"Yangi parol",
    all_data_deleted:"Barcha ma'lumotlar butunlay o'chiriladi",
    change_pw_btn:"Parolni o'zgartirish",
    chars_6plus:"6+ belgi",
    uppercase_chars:"Bosh harflar",
    choose_template:"Tayyor strategiya xaritasini tanlang yoki noldan boshlang",
    choose_template_left:"Chapdan shablon tanlang",
    empty_scenario:"Bo'sh stsenariy",
    new_scenario:"Yangi stsenariy",
    scenarios:"Stsenariylar",
    no_scenarios:"Stsenariylar yo'q",
    scenarios_pro:"Stsenariylar Pro bilan mavjud",
    scenario_templates:"Stsenariy shablonlari",
    no_limits:"Cheksiz.",
    no_comparison:"Taqqoslash yo'q",
    view_label:"Ko'rinish",
    login_or_register:"Kiring yoki bepul akkaunt yarating",
    loading_short:"Yuklanmoqda…",
    why_label:"Nima uchun?",
    tools_label:"Vositalar",
    use_ai_comment:"AI ga savol berish uchun @AI dan foydalaning.",
    use_connect:"Bog'lash yoki ✦ AI-bog'lanishlardan foydalaning.",
    history_empty2:"O'zgartirish tarixi bo'sh.",
    metric_label:"Muvaffaqiyat mezoni",
    observer:"Kuzatuvchi",
    click_new_project:"Boshlash uchun «+ Loyiha» tugmasini bosing",
    project_name:"Loyiha nomi",
    start_free:"Bepul boshlash",
    start_free_arrow:"Bepul boshlash →",
    start_work:"Boshlash →",
    start_ai_interview:"Bo'sh xarita va AI intervyu bilan boshlash",
    begin:"Boshlang",
    no_comments2:"Izohlar yo'q.",
    no_projects:"Loyihalar yo'q",
    upgrade_to_pro:"Pro ga o'tish",
    by_priority:"Muhimlik bo'yicha",
    by_status:"Holat bo'yicha",
    continue_btn:"Davom etish",
    continue_arrow:"Davom etish →",
    skip:"O'tkazib yuborish",
    skip_interview:"Intervyuni o'tkazib yuborasizmi?",
    editor_role:"Muharrir",
    watch_demo:"Demo ko'rish →",
    create_first_map:"Birinchi strategiya xaritangizni yarating",
    create_first_scenario:"Birinchi stsenariyni qo'lda yoki AI shablonlari bilan yarating",
    create_map_free:"Bepul xarita yaratish ✦",
    strategy_maps:"Strategiya xaritalari",
    tariff:"Tarif",
    upgrade_tier_arrow:"Tarifni yaxshilash →",
    node_color_label:"Tugun rangi",
    export_label:"Eksport",
    analyzing_short:"tahlil…",
    demo_payment_skipped:"Demo — to'lov o'tkazib yuborildi",
    add_deadlines_hint:"Qadamlarga muddat qo'shing — ular bu yerda paydo bo'ladi",
    three_steps:"Uch qadam",
    strategy_hero:"Strategiya,",
    which_word:"qaysi",
    who_word:"kim",
    wins_word:"g'alaba qozonadi",
    speaks_word:"Tekshirganlar aytadi,",
    for_free:"bepul.",
    included_free:"BEPUL KIRITILGAN",
    upgrade_plan:"Yaxshilash",
    user_word:"Foydalanuvchi",
    your_plan_word:"o'z tarifingiz",
    strategic_word:"strategik",
    activate_btn:"Faollashtirish",
    downgrade_to:"Ga o'tish ",
    replacing:"Almashtirmoqda…",
    replace_btn:"🗑 Almashtirish",
    upgrade_tier:"✦ Tarifni yaxshilash",
    // Landing page nav
    nav_features:"Imkoniyatlar",nav_process:"Jarayon",nav_pricing:"Narxlar",
    // Landing hero
    hero_sub:"AI biznesingizni tahlil qiladi, strategik xarita tuzadi va McKinsey darajasida maslahat beradi. Oqibatli qarorlar qabul qiladiganlar uchun.",
    // Landing features section
    tag_features:"Imkoniyatlar",feat_sub:"Har bir vosita oqibatli qarorlar qabul qiladiganlar uchun yaratilgan. Tajriba uchun emas — natija uchun.",
    feat_leader_word:"rahbar",
    lf1_title:"Strategiya xaritalari",lf1_desc:"Qarorlar va natijalar o'rtasidagi sabab-oqibat munosabatlari. Bir interaktiv canvas'da drag-and-drop tugunlar, bog'liqliklar, metrikalar, muddatlar.",
    lf2_title:"AI Maslahatchi",lf2_desc:"SWOT, OKR, First Principles, BCG matritsasi, Porter's Five Forces. AI to'g'ri savollar beradi va biznesingizdagi tizimli cheklovlarni ochib beradi.",
    lf3_title:"Stsenariy simulyatsiyasi",lf3_desc:"Qaror qabul qilishdan oldin kelajakning uch versiyasi. Oqibatlarning kaskadli tahlili. Inqirozga aylanishidan oldin tor joylarni ko'ring.",
    lf4_title:"Gantt taymlayn",lf4_desc:"Vaqt jadvali, kritik yo'l, rollar va mas'uliyat zonalari. Strategiya g'oya sifatida emas, balki aniq muddatli reja sifatida.",
    lf5_title:"Jamoa hamkorligi",lf5_desc:"Rollar, izohlar, o'zgarishlar tarixi, avtosaqlash. Strategiya birovning papkasidagi PDF emas, balki jonli jamoa hujjati sifatida.",
    lf6_title:"Health Score tahlili",lf6_desc:"Strategiyangiz salomatligini bitta raqamda. Ustuvorliklar, risklar, tugun bo'yicha progress. Ma'lumotlar orqali boshqaring.",
    // Landing process section
    tag_process:"Jarayon",proc_heading_end:"strategiyasi",to_working:"ishlaydigan",proc_sub:"Hech qanday shablon yo'q. AI xaritani noldan, faqat biznesingiz kontekstiga asoslanib tuzadi.",
    lstep1_tag:"Birinchi qadam",lstep1_title:"AI suhbat",lstep1_desc:"Oltita aniq savol. AI maqsadlarni, yashirin risklarni va tizimli cheklovlarni aniqlaydi — konsalting bir haftada $50 000 ga topadigan narsani.",
    lstep2_tag:"Ikkinchi qadam",lstep2_title:"Xarita qurilishi",lstep2_desc:"Sabab-oqibat tugunlari, metrikalar, ustuvorliklar va vaqt gorizontlari bilan shaxsiy strategiya xaritasi. 30 soniyada.",
    lstep3_tag:"Uchinchi qadam",lstep3_title:"Maslahat",lstep3_desc:"Aniq keyingi qadamlar, risk hisob-kitobi, muqobil stsenariylar. Suvsiz — faqat sizning vaziyatingizga qo'llaniladigan echimlar.",
    // Landing testimonials section
    tag_testimonials:"Sharhlar",testi_checked:"tekshirdi",
    lt1_q:"Strategy AI g'oyalar tartibsizligini yigirma daqiqada aniq rejaga tizimlashtirdi. Ilgari bu o'n minglab dollarlik konsalting va bir oy vaqtni olardi.",lt1_role:"CEO, Series A startap",
    lt2_q:"McKinsey kabi o'ylaydigan vosita. Bir joyda xaritalar, stsenariylar va Gantt bizning mahsulot jarayonimizni tubdan o'zgartirdi.",lt2_role:"CPO, B2B SaaS",
    lt3_q:"Stsenariy simulyatsiyasi alohida sinf. Endi biz har qanday muzokaralarga bitta o'rniga uchta tayyor natija bilan kiramiz.",lt3_role:"Boshqaruvchi hamkor",
    // Landing pricing section
    tag_pricing_label:"Narxlar",pricing_start_word:"Boshlang",pricing_sub:"Birinchi xarita va birinchi AI tahlil bepul. Faqat vosita qiymatiga ishonch hosil qilganingizdan keyin to'lang.",
    pricing_hot_badge:"★ TOP",
    lpr1_desc:"Vosita bilan tanishish uchun",lpr1_f1:"1 loyiha va 1 strategiya xaritasi",lpr1_f2:"AI suhbat va xarita generatsiyasi",lpr1_f3:"Gantt taymlayn",lpr1_f4:"PNG / JSON eksport",start_free_cta:"Bepul boshlash",
    lpr_starter_desc:"Strategik rejalashtishga yumshoq kirish",lpr_starter_f1:"3 loyiha, har birida 3 xarita",lpr_starter_f2:"2 stsenariy + AI xavf tahlili",lpr_starter_f3:"To'liq Gantt + ustuvorliklar",lpr_starter_f4:"1 500 AI xabarlari / oy",lpr_starter_cta:"$9 dan boshlash →",
    lpr2_desc:"Mutaxassislar va jamoalar uchun",lpr2_f1:"10 loyiha, har birida 5 xarita",lpr2_f2:"SWOT, OKR, BCG, Porter AI tahlili",lpr2_f3:"5 stsenariy + oqibatlar simulyatsiyasi",lpr2_f4:"Xaritani klonlash va versiyalash",lpr2_f5:"3 kishigacha jamoa hamkorligi",lpr2_cta:"Pro ga o'tish →",
    lpr3_desc:"Tizimli yondashuvga ega tashkilotlar uchun",lpr3_f1:"Cheksiz: loyihalar, xaritalar, stsenariylar",lpr3_f2:"C-level AI kollegium (5 ekspert rol)",lpr3_f3:"Direktorlar kengashi uchun PPTX hisobotlar",lpr3_f4:"White-label va API integratsiyalar",lpr3_f5:"Maxsus qo'llab-quvvatlash menejeri",lpr3_cta:"Bog'lanish",
    // Landing CTA section
    cta_h1:"Birinchi qadam",cta_h2:"faqat",cta_h3:"ikki daqiqa oladi",
    cta_sub:"Birinchi strategiya xaritangizni hoziroq yarating. Kredit kartasisiz. Shablonsiz — faqat sizning biznesingiz va AI.",
    cta_trust1:"Abadiy bepul",cta_trust2:"Kredit kartasi shart emas",cta_trust3:"Ma'lumotlar faqat sizniki",
    // Landing metrics
    lm1_sfx:"daq",lm1_lbl:"savoldan birinchi strategiya xaritasigacha",
    lm2_lbl:"McKinsey test holatlarida AI tahlil aniqligi",
    lm3_lbl:"ekspert chuqurligi darajalari — Free dan Enterprise gacha",
    lm4_lbl:"muqobil natijalarni tahlil qilish stsenariylari",
    // Cookie consent
    cookie_text:"🍪 Biz analitika va xizmatni yaxshilash uchun cookies ishlatamiz. Davom etish orqali siz bizning",cookie_policy:"Maxfiylik siyosati",cookie_accept:"Qabul qilish",
    // Footer columns
    footer_product:"Mahsulot",footer_company:"Kompaniya",footer_legal:"Huquqiy",
    footer_features:"Imkoniyatlar",footer_pricing_link:"Narxlar",footer_templates:"Shablonlar",footer_changelog:"Changelog",
    footer_about:"Biz haqimizda",footer_blog:"Blog",footer_careers:"Karyera",footer_contact:"Aloqa",
    footer_privacy:"Maxfiylik siyosati",footer_terms:"Foydalanish shartlari",footer_cookies:"Cookies",footer_gdpr:"GDPR",
    footer_tagline:"McKinsey darajasidagi AI maslahatchi bilan vizual strategik rejalashtirish.",
    footer_rights:"© 2026 Strategy AI. Barcha huquqlar himoyalangan.",
    // App misc
    delete_forever:"Butunlay o'chirish",
    by_statuses:"Holat bo'yicha",by_priorities:"Muhimlik bo'yicha",
    member_limit:"A'zo limiti {plan} uchun: {n}.",
    project_name_label:"Loyiha nomi",saved_ok:"Saqlandi",
    // WelcomeScreen
    ws_start_btn:"Bepul boshlash ✦",ws_login_btn:"Hisobingiz bormi — Kirish →",
    ws_feat1:"Maqsad xaritalari",ws_feat2:"AI maslahatchi",ws_feat3:"Gantt rejasi",
    ws_feat4:"PNG/JSON eksport",ws_feat5:"1 stsenariy",ws_feat6:"5 tagacha qadam",
    ws_terms:"«Boshlash» tugmasini bosish orqali foydalanish shartlariga rozisiz",
    // VersionHistoryModal
    trial_active:"Sinov davri faol",trial_days_left:"kun qoldi",
    deadline_reminder:"Muddat eslatmalari",
    notif_email_desc:"Muhim yangilanishlar email orqali",notif_push_desc:"Brauzer bildirishnomalari",
    restore_confirm:"Bu versiyani tiklashni xohlaysizmi? Joriy ma'lumotlar almashtiriladi.",
    versions_empty:"Saqlangan versiyalar yo'q",restore_version:"Tiklash",
    version_restored:"Versiya tiklandi ✓",
    // WeeklyBriefingModal
    weekly_briefing:"Haftalik xisobot",
    weekly_briefing_date:"Hafta",
    weekly_briefing_gen:"Xarita tahlil qilinmoqda…",
    weekly_briefing_err:"AI tahlilini olib bo'lmadi.",
    // AI/export
    ai_error:"AI tahlil xatosi",
    ai_comment_error:"AI xatosi. Qayta urining.",
    ai_generation_error:"Generatsiya xatosi. Qayta urining.",
    ai_sim_error:"AI maslahatchi xatosi",
    export_pdf:"PDF yuklab olish",export_pptx:"PPTX yuklab olish",
    // MapEditor toasts & misc
    imported_steps:"✅ Yuklandi: {n} qadam",
    json_invalid:"Noto'g'ri JSON formati",
    file_read_err:"Fayl o'qish xatosi",
    png_exported:"PNG eksport qilindi ✓",
    json_exported:"JSON eksport qilindi ✓",
    share_create_err:"Havola yaratishda xato",
    popup_blocked:"Eksport uchun oynalarga ruxsat bering",
    layout_applied:"⌥ Avto-joylashtirildi",
    min_2_steps:"Kamida 2 qadam kerak",
    ai_analyzing_links:"🔗 AI xarita mantiqini tahlil qilmoqda…",
    links_added:"🔗 Qo'shildi: {n} bog'liqlik",
    links_optimal:"Bog'liqliklar allaqachon optimal — qo'shish uchun hech narsa yo'q",
    copied:"📋 Nusxalandi",pasted:"📋 Qo'yildi",
    confirm_restore:"Tiklashni xohlaysizmi?",
    confirm_delete_map:"Xaritani o'chirishni xohlaysizmi?",
    confirm_delete_proj:"Loyihaning barcha xaritalari va ma'lumotlari butunlay o'chiriladi.",
    // ProfileModal messages
    profile_saved:"Profil yangilandi ✓",
    fill_all_fields:"Barcha maydonlarni to'ldiring",
    min_6_chars:"Kamida 6 belgi",
    pw_mismatch:"Parollar mos kelmaydi",
    pw_changed:"Parol o'zgartirildi ✓",
    pw_change_err:"Parol o'zgartirishda xato",
    wrong_pw:"Joriy parol noto'g'ri",
    delete_err:"O'chirishda xato",
    settings_saved:"Sozlamalar saqlandi ✓",
    appearance:"Ko'rinish",
    light_theme_label:"☀️ Yorug'",dark_theme_label:"🌙 Qorong'u",
    compact_desc:"Kichroq tugun kartalari",
    autosave_desc:"Har bir o'zgarishda xaritani saqlash",
    canvas_view:"🗺 Canvas",gantt_view:"📅 Gantt",list_view:"📋 Ro'yxat",
    ai_assistant_title:"🤖 AI Yordamchi",notifications_title:"🔔 Bildirishnomalar",
    save_settings:"Sozlamalarni saqlash",
    maps_available:"Xaritalar mavjud",scenarios_available:"Stsenariylar",
    projects_available:"Loyihalar",ai_level:"AI darajasi",
    // ProjectsPage/ProjectDetail
    projects_of:"{n} dan {max} loyiha",
    project_limit:"Tarif uchun loyiha limiti",
    new_project_btn:"+ Loyiha",
    scenarios_label:"Stsenariylar",
    overdue_label:"kechiktirilgan",
    updated_label:"yangilangan",
    steps_label:"qadam",
    maps_label:"xarita",
    scenarios_count:"stsen.",
    map_limit_tier:"Tarif uchun xarita limiti {tier}: {n}",
    template_applied:"Shablon qo'llanildi ✓",
    scenario_created:"Stsenariy yaratildi ✓",
    scenario_limit:"Tarif uchun stsenariy limiti",
    members_limit:"A'zo limiti: {n}",
    member_added:"A'zo qo'shildi",
    member_added_already:"A'zo allaqachon qo'shilgan",
    member_add_err:"A'zo qo'shishda xato",
    payment_success:"✅ To'lov muvaffaqiyatli! Tarif yangilandi.",
    // GanttView
    steps_with_deadlines:"{n} qadam muddatlari bilan",
    days_overdue:"kechiktirildi {n}k.",
    days_left:"{n}k.",
    tomorrow_label:"ertaga",
    // Onboarding / interview
    analyzing_answers:"Javoblaringizni tahlil qilmoqdaman va shaxsiy xarita quryapman…",
    create_map_btn2:"Xarita yaratish ✦",answer_btn:"Javob berish →",
    interview_count:"AI suhbat · {n}/{max} savol",
    skip_interview_confirm:"Intervyuni o'tkazib yuborib, bo'sh xaritadan boshlashni xohlaysizmi?",
    // Simulation
    sim_goal:"🎯 Maqsadli natija",sim_metric:"📊 Maqsad metrikasi",
    sim_budget:"💰 Byudjet ($)",sim_team:"👥 Jamoa (kishi)",
    sim_revenue:"💵 Maqsad daromad ($)",sim_timeline:"⏱ Muddat",
    sim_run:"▶ Simulyatsiyani ishga tushirish",sim_stop:"⏹ To'xtatish",sim_reset:"↺ Tiklash",
    sim_ask_ai:"✦ AI dan so'rash",sim_q_ph:"Simulyatsiya haqida savol…",
    // Tier-related
    tier_activated:"{tier} tarifi faollashtirildi ✓",
    stay_on_plan:"{plan} da qolish",
    go_to_plan:"{plan} ga o'tish — {price}",
    card_number_ph:"Karta raqami…",card_holder_ph:"Karta egasining ismi…",
    card_expiry_ph:"OY/YIL",card_cvv_ph:"CVV",
    card_data_title:"💳 Karta ma'lumotlari",
    downgrade_warning:"Tarifni pasaytirgandan so'ng ba'zi ma'lumotlar cheklanishi mumkin.",
    downgrade_limit_maps:"Yangi tarifda xaritalar",
    downgrade_limit_projects:"Yangi tarifda loyihalar",
    downgrade_excess:"Limitdan ortiq ma'lumotlar faqat o'qish uchun bo'ladi.",
    current_tier_badge:"✓ Joriy tarif",
    alt_strategies:"Stsenariyning muqobil strategiyalari",
    done:"Bajarildi",
    verify_email_banner:"To'liq kirish uchun emailingizni tasdiqlang.",
    verify_email_resend:"Tasdiqlash xatini qayta yuborish",
    verify_email_sent:"Xat yuborildi! Pochtangizni tekshiring.",
    verify_email_done:"✓ Email tasdiqlandi"
  },
};

function makeTfn(lang){
  const d=LANGS[lang]||LANGS.ru;
  return (key,fallback)=>d[key]!==undefined?d[key]:(fallback!==undefined?fallback:key);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CLIENT — общается с Railway-бэкендом, fallback на localStorage
// Установи window.__STRATEGY_AI_API_URL__ = "https://your-backend.railway.app"
// (или через script tag: <script>window.__STRATEGY_AI_API_URL__="..."</script>)
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE=(typeof window!=="undefined"&&(window as any).__STRATEGY_AI_API_URL__)||"";

// JWT хранится в localStorage ключ "sa_jwt"
function getJWT():string{try{return localStorage.getItem("sa_jwt")||"";}catch{return "";}}
function setJWT(t:string){try{localStorage.setItem("sa_jwt",t);}catch{}}
function clearJWT(){try{localStorage.removeItem("sa_jwt");}catch{}}
function getRefreshToken():string{try{return localStorage.getItem("sa_refresh_jwt")||"";}catch{return "";}}
function setRefreshToken(t:string){try{localStorage.setItem("sa_refresh_jwt",t);}catch{}}
function clearRefreshToken(){try{localStorage.removeItem("sa_refresh_jwt");}catch{}}

// Сохраняем и access и refresh при логине/регистрации
function saveTokens(token:string,refreshToken?:string){
  setJWT(token);
  if(refreshToken)setRefreshToken(refreshToken);
}

let _refreshingPromise:Promise<boolean>|null=null;

async function tryRefreshToken():Promise<boolean>{
  if(_refreshingPromise)return _refreshingPromise;
  _refreshingPromise=(async()=>{
    try{
      const rt=getRefreshToken();
      if(!rt)return false;
      const r=await fetch(`${API_BASE}/api/auth/refresh`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({refreshToken:rt}),
      });
      if(!r.ok){clearJWT();clearRefreshToken();return false;}
      const d=await r.json();
      saveTokens(d.token,d.refreshToken);
      return true;
    }catch{return false;}
    finally{_refreshingPromise=null;}
  })();
  return _refreshingPromise;
}

async function apiFetch(path:string,opts:RequestInit={},retry=true):Promise<any>{
  const headers:Record<string,string>={
    "Content-Type":"application/json",
    ...(opts.headers as Record<string,string>||{}),
  };
  const jwt=getJWT();
  if(jwt)headers["Authorization"]=`Bearer ${jwt}`;
  const r=await fetch(`${API_BASE}${path}`,{...opts,headers});
  if(r.status===204)return{};

  // Access token истёк — пробуем обновить через refresh token
  if(r.status===401&&retry){
    const refreshed=await tryRefreshToken();
    if(refreshed)return apiFetch(path,opts,false);
    clearJWT();clearRefreshToken();
    // Уведомляем App о необходимости разлогина
    try{(window as any).__sa_onSessionExpired?.();}catch{}
    throw new Error("session_expired");
  }

  let data:any;
  try{data=await r.json();}catch{data={};}
  if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);
  return data;
}

// ── localStorage fallback store (используется ТОЛЬКО если API_BASE пустой) ──
if(typeof window!=="undefined"&&!(window as any).storage){
  (window as any).storage={
    async get(k:string){try{const v=localStorage.getItem(k);return v!=null?{value:v}:null;}catch{return null;}},
    async set(k:string,v:string){try{localStorage.setItem(k,v);}catch{}},
    async delete(k:string){try{localStorage.removeItem(k);}catch{}}
  };
}
const store={
  async get(k:string){try{const r=await (window as any).storage.get(k);return r?JSON.parse(r.value):null;}catch{return null;}},
  async set(k:string,v:any){try{await (window as any).storage.set(k,JSON.stringify(v));}catch{}},
  async del(k:string){try{await (window as any).storage.delete(k);}catch{}},
};

// ── auth ──
const hashPw=(e:string,p:string)=>btoa(`${e}:${p}:sa2026`);

async function getSession(){
  if(API_BASE){
    const jwt=getJWT();
    if(!jwt)return null;
    try{const d=await apiFetch("/api/auth/me");return d.user?{email:d.user.email}:null;}
    catch(e:any){if(e?.message==="session_expired"){clearJWT();clearRefreshToken();}return null;}
  }
  return store.get("sa_sess");
}
async function setSession(email:string){
  if(!API_BASE)await store.set("sa_sess",{email});
}
async function clearSession(){
  if(API_BASE){clearJWT();clearRefreshToken();}
  else await store.del("sa_sess");
}
async function seedDefault(){
  if(API_BASE)return; // dev-аккаунт создаётся через API при первом запуске
  const a=await store.get("sa_acc")||[],e="denisblackman2@gmail.com";
  if(!a.find((x:any)=>x.email===e))await store.set("sa_acc",[...a,{email:e,pwHash:hashPw(e,"Denis123"),name:"Denis",tier:"team",createdAt:Date.now()}]);
}
function normalizeUser(raw:any){
  if(!raw)return raw;
  return{
    ...raw,
    notifEmail:raw.notifEmail??raw.notif_email,
    notifPush:raw.notifPush??raw.notif_push,
    autoSave:raw.autoSave??raw.auto_save,
    compactMode:raw.compactMode??raw.compact_mode,
    defaultView:raw.defaultView??raw.default_view,
    aiLang:raw.aiLang??raw.ai_lang,
    theme:raw.theme??"dark",
    palette:raw.palette??"indigo",
    createdAt:raw.createdAt??raw.created_at,
    trialEndsAt:raw.trialEndsAt??raw.trial_ends_at,
    emailVerified:raw.emailVerified??raw.email_verified??true,
  };
}

async function register(email:string,pw:string,name:string){
  if(API_BASE){
    try{
      const d=await apiFetch("/api/auth/register",{method:"POST",body:JSON.stringify({email,password:pw,name})});
      saveTokens(d.token,d.refreshToken);
      return{user:normalizeUser(d.user),isNew:true};
    }catch(e:any){return{error:e.message};}
  }
  const e2=email.trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e2))return{error:"Некорректный формат email"};
  if(pw.length<6)return{error:"Пароль должен быть не менее 6 символов"};
  const a=await store.get("sa_acc")||[];
  if(a.find((x:any)=>x.email===e2))return{error:"Email уже зарегистрирован"};
  const u={email:e2,pwHash:hashPw(e2,pw),name:name?.trim()||e2.split("@")[0],tier:"free",createdAt:Date.now()};
  await store.set("sa_acc",[...a,u]);await setSession(e2);return{user:u,isNew:true};
}
async function login(email:string,pw:string){
  if(API_BASE){
    try{
      const d=await apiFetch("/api/auth/login",{method:"POST",body:JSON.stringify({email,password:pw})});
      saveTokens(d.token,d.refreshToken);
      return{user:normalizeUser(d.user),isNew:false};
    }catch(e:any){return{error:e.message};}
  }
  const e=email.trim().toLowerCase();
  const a=await store.get("sa_acc")||[],u=a.find((x:any)=>x.email===e&&x.pwHash===hashPw(e,pw));
  if(!u)return{error:"Неверный email или пароль"};
  await setSession(e);return{user:u,isNew:false};
}
async function patchUser(email:string,patch:any){
  if(API_BASE){
    try{
      const body:any={};
      if(patch.name!==undefined)body.name=patch.name;
      if(patch.bio!==undefined)body.bio=patch.bio;
      if(patch.aiLang!==undefined)body.ai_lang=patch.aiLang;
      if(patch.notifEmail!==undefined)body.notif_email=patch.notifEmail;
      if(patch.notifPush!==undefined)body.notif_push=patch.notifPush;
      if(patch.autoSave!==undefined)body.auto_save=patch.autoSave;
      if(patch.compactMode!==undefined)body.compact_mode=patch.compactMode;
      if(patch.defaultView!==undefined)body.default_view=patch.defaultView;
      if(patch.tier!==undefined)body.tier=patch.tier;
      if(patch.theme!==undefined)body.theme=patch.theme;
      if(patch.palette!==undefined)body.palette=patch.palette;
      const d=await apiFetch("/api/auth/profile",{method:"PATCH",body:JSON.stringify(body)});
      return normalizeUser(d.user);
    }catch(e:any){throw e;}
  }
  const a=await store.get("sa_acc")||[],upd=a.map((x:any)=>x.email===email?{...x,...patch}:x);
  await store.set("sa_acc",upd);return upd.find((x:any)=>x.email===email);
}

// ── projects ──
function normalizeProject(p:any){
  if(!p)return p;
  return{...p,owner:p.owner??p.owner_email};
}
async function getProjects(email:string){
  if(API_BASE){
    try{const d=await apiFetch("/api/projects");return (d.projects||[]).map(normalizeProject);}
    catch{return[];}
  }
  const a=await store.get("sa_proj")||[];
  return a.filter((p:any)=>p.owner===email||p.members?.find((m:any)=>m.email===email));
}
async function saveProject(p:any){
  if(API_BASE){
    try{
      if(p._new){const d=await apiFetch("/api/projects",{method:"POST",body:JSON.stringify({name:p.name})});return normalizeProject(d.project);}
      else{const body:any={name:p.name};if(p.members!==undefined)body.members=p.members;const d=await apiFetch(`/api/projects/${p.id}`,{method:"PATCH",body:JSON.stringify(body)});return normalizeProject(d.project);}
    }catch{return p;}
  }
  const a=await store.get("sa_proj")||[],i=a.findIndex((x:any)=>x.id===p.id);
  const pp={...p,updatedAt:Date.now()};
  await store.set("sa_proj",i>=0?a.map((x:any)=>x.id===p.id?pp:x):[...a,pp]);
  return pp;
}
async function addProjectMember(projectId:string,email:string,role:string){
  if(API_BASE){
    try{const d=await apiFetch(`/api/projects/${projectId}/members`,{method:"POST",body:JSON.stringify({email,role})});return normalizeProject(d.project);}
    catch{return null;}
  }
  return null;
}
async function removeProjectMember(projectId:string,email:string):Promise<any>{
  if(API_BASE){
    try{const d=await apiFetch(`/api/projects/${projectId}/members/${encodeURIComponent(email)}`,{method:"DELETE"});return normalizeProject(d?.project);}
    catch{return null;}
  }
  return null;
}
async function deleteProject(id:string){
  if(API_BASE){
    try{await apiFetch(`/api/projects/${id}`,{method:"DELETE"});}
    catch{}
    return;
  }
  const a=await store.get("sa_proj")||[];
  await store.set("sa_proj",a.filter((p:any)=>p.id!==id));
  await store.del(`sa_maps_${id}`);
}
async function getMaps(pid:string){
  if(API_BASE){
    try{const d=await apiFetch(`/api/projects/${pid}/maps`);return d.maps||[];}
    catch{return[];}
  }
  return(await store.get(`sa_maps_${pid}`))||[];
}
async function saveMap(pid:string,map:any){
  if(API_BASE){
    try{
      if(map._new){
        const d=await apiFetch(`/api/projects/${pid}/maps`,{method:"POST",body:JSON.stringify({name:map.name,nodes:map.nodes,edges:map.edges,ctx:map.ctx,is_scenario:map.isScenario})});
        return d.map;
      } else {
        const d=await apiFetch(`/api/projects/${pid}/maps/${map.id}`,{method:"PUT",body:JSON.stringify({name:map.name,nodes:map.nodes,edges:map.edges,ctx:map.ctx})});
        return d.map;
      }
    }catch(e:any){
      if(e.message?.includes("MAP_LIMIT")||e.message?.includes("Лимит карт"))throw e;
      return map;
    }
  }
  const a=await getMaps(pid),i=a.findIndex((m:any)=>m.id===map.id);
  await store.set(`sa_maps_${pid}`,i>=0?a.map((m:any)=>m.id===map.id?map:m):[...a,map]);
  return map;
}
async function deleteMap(pid:string,mid:string){
  if(API_BASE){
    try{await apiFetch(`/api/projects/${pid}/maps/${mid}`,{method:"DELETE"});}
    catch{}
    return;
  }
  const a=await getMaps(pid);
  await store.set(`sa_maps_${pid}`,a.filter((m:any)=>m.id!==mid));
}

// ── utils ──
function edgePt(cx,cy,tx,ty){const dx=tx-cx,dy=ty-cy;if(!dx&&!dy)return{x:cx,y:cy};const hw=NW/2+8,hh=NH/2+8,t=Math.abs(dy)*hw<Math.abs(dx)*hh?hw/Math.abs(dx):hh/Math.abs(dy);return{x:cx+dx*t,y:cy+dy*t};}
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
function defaultNodes(){return[{id:"n1",x:200,y:270,title:"Анализ рынка",reason:"Понять ЦА",metric:"100 интервью",status:"completed",priority:"high",progress:100},{id:"n2",x:480,y:155,title:"MVP продукт",reason:"Проверить гипотезу",metric:"50 платящих",status:"active",priority:"critical",progress:60},{id:"n3",x:480,y:395,title:"Маркетинг",reason:"Первые клиенты",metric:"CAC < $100",status:"active",priority:"high",progress:25},{id:"n4",x:760,y:270,title:"Рост",reason:"Масштаб",metric:"$50k MRR",status:"planning",priority:"critical",progress:0}];}
function topSort(nodes,edges){
  const ind=Object.fromEntries(nodes.map(n=>[n.id,0])),adj=Object.fromEntries(nodes.map(n=>[n.id,[]]));
  edges.forEach(e=>{if(adj[e.from]!==undefined&&ind[e.to]!==undefined){adj[e.from].push(e.to);ind[e.to]++;}});
  const q=nodes.filter(n=>ind[n.id]===0).map(n=>n.id),out=[];
  while(q.length){const id=q.shift();const n=nodes.find(x=>x.id===id);if(n)out.push(n);(adj[id]||[]).forEach(nid=>{if(--ind[nid]===0)q.push(nid);});}
  nodes.forEach(n=>{if(!out.find(x=>x.id===n.id))out.push(n);});return out;
}

function simNode(node,params,depResults,incomingEdges){
  const progBase=node.progress||0;
  const statusK={completed:1.0,active:0.82,planning:0.55,paused:0.45,blocked:0.15}[node.status]??0.5;
  const prioBonus={low:8,medium:4,high:0,critical:-4}[node.priority]??0;
  const budgetFactor=params.budget>=100000?1.0:params.budget>=50000?0.92:params.budget>=20000?0.82:params.budget>=5000?0.70:0.55;
  const teamFactor=params.team>=10?1.0:params.team>=5?0.93:params.team>=3?0.84:params.team>=1?0.74:0.60;
  const resourceFactor=(budgetFactor+teamFactor)/2;
  let depPenalty=0,autoFail=false;
  if(incomingEdges&&depResults){
    for(const edge of incomingEdges){
      const dep=depResults[edge.from];if(!dep)continue;
      if(edge.type==="blocks"){if(dep.outcome==="fail"){autoFail=true;break;}if(dep.outcome==="partial")depPenalty+=22;}
      else if(edge.type==="requires"){if(dep.outcome==="fail")depPenalty+=30;else if(dep.outcome==="partial")depPenalty+=14;}
      else if(edge.type==="affects"){if(dep.outcome==="fail")depPenalty+=16;else if(dep.outcome==="partial")depPenalty+=7;}
      else if(edge.type==="follows"){if(dep.outcome==="fail")depPenalty+=20;else if(dep.outcome==="partial")depPenalty+=9;}
    }
  }
  if(autoFail)return{score:Math.floor(Math.random()*18)+2,outcome:"fail",autoFail:true};
  const raw=(progBase*statusK)+prioBonus-depPenalty;
  const sc=Math.max(2,Math.min(98,Math.round(raw*resourceFactor+(Math.random()-.5)*16)));
  return{score:sc,outcome:sc>=70?"success":sc>=42?"partial":"fail",depPenalty:Math.round(depPenalty)};
}


// ── AI tier configs ──
const AI_TIER={
  free:{label:"Free",badge:"⬡",color:"#64748b",
    system:(ctx,map)=>`Ты — AI-помощник по стратегии. Контекст бизнеса: ${ctx||"стартап"}.
Текущая карта шагов: ${map||"пустая карта"}.

Правила ответа:
- Отвечай по-русски, конкретно, 2–4 предложения
- Давай один чёткий совет или следующий шаг
- Если пользователь не знает с чего начать — предложи добавить первый шаг
- Не используй профессиональный жаргон без объяснения

Если уместно добавить шаг на карту:
<ADD>{"title":"Конкретное действие","reason":"Почему это важно","metric":"Измеримый результат","status":"planning","priority":"medium","progress":0,"tags":[]}</ADD>`,
  },
  starter:{label:"Starter",badge:"◈",color:"#10b981",
    system:(ctx,map)=>`Ты — стратегический помощник уровня бизнес-консультанта. Контекст: ${ctx||"стартап"}.
Карта: ${map||"пустая"}.

Подход к анализу:
- Выявляй узкие места и пробелы в логике карты
- Указывай риски, которые пользователь мог не заметить
- Предлагай альтернативные пути
- Задавай уточняющие вопросы для точного совета
- Анализ рисков: технологические, рыночные, операционные

Формат: проблема/инсайт → что делать → как измерить.
По-русски, практично.
Если добавить шаг: <ADD>{"title":"...","reason":"...","metric":"...","status":"planning","priority":"medium","progress":0,"tags":[]}</ADD>`,
  },
  pro:{label:"Pro",badge:"◆",color:"#8b5cf6",
    system:(ctx,map)=>`Ты — опытный стратегический советник с 15+ годами опыта. Контекст: ${ctx||"стартап"}.
Текущая карта: ${map||"пустая"}.

Методологии в арсенале:
- SWOT + PESTEL для контекста
- OKR / Jobs-to-be-Done для приоритизации
- First Principles мышление
- Конкурентный анализ (positioning map, competitive moats)
- Метрики: CAC, LTV, MRR, NPS, retention

Формат ответа:
**Диагноз** — что происходит на самом деле
**Рекомендация** — 2-3 конкретных шага с метриками
**Риск** — главная угроза для этого шага
**Быстрая победа** — что можно сделать прямо сейчас

Говори прямо. Указывай противоречия. Не льсти.
Добавить шаг: <ADD>{"title":"...","reason":"...","metric":"...","status":"active","priority":"high","progress":0,"tags":[]}</ADD>`,
  },
  team:{label:"Team",badge:"✦",color:"#f59e0b",
    system:(ctx,map)=>`Ты — старший партнёр стратегической консалтинговой компании. Клиент: ${ctx||"компания"}.
Текущая стратегическая карта: ${map||"пустая"}.

Уровень анализа McKinsey:
① СТРАТЕГИЧЕСКИЙ СЛОЙ: конкурентное преимущество, positioning, market timing, sustainable moat
② РЫНОЧНЫЙ СЛОЙ: TAM/SAM/SOM, сегменты, Job-to-be-Done, конкурентная динамика
③ ОПЕРАЦИОННЫЙ СЛОЙ: unit economics, burn rate, команда, процессы, bottlenecks
④ РИСКИ: регуляторные, технологические, конкурентные, операционные, рыночные

Структура ответа:
**Executive Insight** — главный инсайт в 1 предложении
**Ситуация** — что реально происходит (без прикрас)
**Топ-3 приоритета** — с метриками успеха и дедлайнами
**Critical Risk** — что может убить стратегию
**Следующий шаг** — одно действие на этой неделе

Говори как партнёр в зале заседаний. Конкретика важнее теории.
Добавить шаг: <ADD>{"title":"...","reason":"...","metric":"...","status":"active","priority":"critical","progress":0,"tags":[]}</ADD>`,
  },
  enterprise:{label:"Enterprise",badge:"💎",color:"#06b6d4",
    system:(ctx,map)=>`Ты — коллегиум четырёх C-level экспертов. Клиент: ${ctx||"компания"}.
Стратегическая карта: ${map||"пустая"}.

Команда экспертов:
① **CHIEF STRATEGIST** (BCG·Porter·Blue Ocean): Где конкурентный ров? Голубой океан? Какие позиции атакуемы? Что защищено?
② **CFO** (unit economics·LTV/CAC·runway·cash flow): Где деньги утекают? Какая юнит-экономика? Когда breakeven? Что влияет на маржу?
③ **LEAD INVESTOR** (TAM·SAM·SOM·defensibility·VC-lens): Как выглядит для Series A? Масштабируемость? Exit options? Red flags?
④ **COO** (процессы·bottleneck·автоматизация·team): Что тормозит скорость? Что автоматизировать первым? Где риск ключевого человека?

Формат ответа:
**EXECUTIVE SUMMARY** — 2-3 предложения о состоянии стратегии
**CRITICAL FINDINGS** — 2-3 критические находки (то, что нужно исправить немедленно)
**TOP PRIORITIES** — 3 действия с дедлайнами и метриками, от каждого эксперта своё
**STRATEGIC RISK** — самая серьёзная угроза, которую пользователь недооценивает
**NON-OBVIOUS MOVE** — неочевидный ход, который может изменить игру

Говори как C-level на board meeting. Не щади. Не льсти. Факты и цифры важнее слов.
Добавить шаг: <ADD>{"title":"...","reason":"...","metric":"...","status":"active","priority":"critical","progress":0,"tags":[]}</ADD>`,
  },
};

// ── Templates ──
const TEMPLATES=[
  {id:"launch",name:"🚀 Запуск продукта",desc:"Вывод MVP на рынок",
    nodes:[
      {id:"t1",x:160,y:260,title:"Исследование рынка",reason:"Понять ЦА и боли",metric:"100 интервью",status:"planning",priority:"high",progress:0,tags:["research"],color:""},
      {id:"t2",x:420,y:150,title:"MVP разработка",reason:"Проверить гипотезу",metric:"50 первых пользователей",status:"planning",priority:"critical",progress:0,tags:["product"],color:""},
      {id:"t3",x:420,y:370,title:"GTM стратегия",reason:"Выход на рынок",metric:"Первые 10 продаж",status:"planning",priority:"high",progress:0,tags:["marketing"],color:""},
      {id:"t4",x:680,y:260,title:"Привлечение клиентов",reason:"Рост базы",metric:"CAC < $50",status:"planning",priority:"critical",progress:0,tags:["growth"],color:""},
      {id:"t5",x:940,y:260,title:"Product-Market Fit",reason:"Доказать PMF",metric:"NPS > 40",status:"planning",priority:"critical",progress:0,tags:["pmf"],color:""},
    ],
    edges:[
      {id:"te1",source:"t1",target:"t2",type:"requires",label:""},
      {id:"te2",source:"t1",target:"t3",type:"affects",label:""},
      {id:"te3",source:"t2",target:"t4",type:"requires",label:""},
      {id:"te4",source:"t3",target:"t4",type:"affects",label:""},
      {id:"te5",source:"t4",target:"t5",type:"follows",label:""},
    ]
  },
  {id:"growth",name:"📈 Стратегия роста",desc:"Масштабирование существующего бизнеса",
    nodes:[
      {id:"g1",x:160,y:260,title:"Аудит текущих каналов",reason:"Найти эффективные каналы",metric:"ROI по каналам",status:"planning",priority:"high",progress:0,tags:["audit"],color:""},
      {id:"g2",x:420,y:150,title:"Удвоить лучший канал",reason:"Масштабировать работающее",metric:"×2 к объёму",status:"planning",priority:"critical",progress:0,tags:["scale"],color:""},
      {id:"g3",x:420,y:370,title:"Реферальная программа",reason:"Органический рост",metric:"20% пользователей из рефералов",status:"planning",priority:"high",progress:0,tags:["referral"],color:""},
      {id:"g4",x:680,y:260,title:"Улучшить retention",reason:"Снизить отток",metric:"Churn < 5%/мес",status:"planning",priority:"critical",progress:0,tags:["retention"],color:""},
      {id:"g5",x:940,y:260,title:"Новый рынок / сегмент",reason:"Диверсификация",metric:"$100k из нового сегмента",status:"planning",priority:"medium",progress:0,tags:["expansion"],color:""},
    ],
    edges:[
      {id:"ge1",source:"g1",target:"g2",type:"requires",label:""},
      {id:"ge2",source:"g1",target:"g3",type:"affects",label:""},
      {id:"ge3",source:"g2",target:"g4",type:"affects",label:""},
      {id:"ge4",source:"g4",target:"g5",type:"follows",label:""},
    ]
  },
  {id:"pivot",name:"🔄 Pivot стратегия",desc:"Смена направления с минимальными потерями",
    nodes:[
      {id:"p1",x:160,y:260,title:"Диагностика провала",reason:"Понять почему текущее не работает",metric:"5 корневых причин",status:"planning",priority:"critical",progress:0,tags:["analysis"],color:""},
      {id:"p2",x:420,y:150,title:"Анализ альтернатив",reason:"Найти новое направление",metric:"3 validated идеи",status:"planning",priority:"high",progress:0,tags:["ideation"],color:""},
      {id:"p3",x:420,y:370,title:"Сохранить ресурсы",reason:"Runway для pivot",metric:"6+ месяцев runway",status:"planning",priority:"critical",progress:0,tags:["finance"],color:""},
      {id:"p4",x:680,y:260,title:"Быстрый прототип",reason:"Проверить новое направление",metric:"10 первых пользователей",status:"planning",priority:"critical",progress:0,tags:["prototype"],color:""},
      {id:"p5",x:940,y:260,title:"Валидация нового PMF",reason:"Убедиться в правильности направления",metric:"NPS > 30, retention > 40%",status:"planning",priority:"critical",progress:0,tags:["validation"],color:""},
    ],
    edges:[
      {id:"pe1",source:"p1",target:"p2",type:"requires",label:""},
      {id:"pe2",source:"p1",target:"p3",type:"affects",label:""},
      {id:"pe3",source:"p2",target:"p4",type:"requires",label:""},
      {id:"pe4",source:"p3",target:"p4",type:"affects",label:""},
      {id:"pe5",source:"p4",target:"p5",type:"follows",label:""},
    ]
  },
  {id:"fundraising",name:"💰 Привлечение инвестиций",desc:"Путь от идеи до закрытого раунда",
    nodes:[
      {id:"f1",x:160,y:260,title:"Подготовка материалов",reason:"Профессиональное первое впечатление",metric:"Pitch deck + финмодель",status:"planning",priority:"high",progress:0,tags:["prep"],color:""},
      {id:"f2",x:420,y:150,title:"Warm intros к инвесторам",reason:"Обход холодного outreach",metric:"50 warm intros",status:"planning",priority:"critical",progress:0,tags:["network"],color:""},
      {id:"f3",x:420,y:370,title:"Улучшить ключевые метрики",reason:"Сильная позиция на переговорах",metric:"MoM рост > 15%",status:"planning",priority:"critical",progress:0,tags:["metrics"],color:""},
      {id:"f4",x:680,y:260,title:"Переговоры и term sheet",reason:"Закрыть лучший term sheet",metric:"3+ term sheets",status:"planning",priority:"critical",progress:0,tags:["deals"],color:""},
      {id:"f5",x:940,y:260,title:"Due diligence и закрытие",reason:"Получить деньги",metric:"Раунд закрыт",status:"planning",priority:"critical",progress:0,tags:["close"],color:""},
    ],
    edges:[
      {id:"fe1",source:"f1",target:"f2",type:"requires",label:""},
      {id:"fe2",source:"f1",target:"f3",type:"affects",label:""},
      {id:"fe3",source:"f2",target:"f4",type:"requires",label:""},
      {id:"fe4",source:"f3",target:"f4",type:"affects",label:""},
      {id:"fe5",source:"f4",target:"f5",type:"follows",label:""},
    ]
  },
  {id:"enterprise_sales",name:"🤝 Enterprise продажи",desc:"Цикл B2B продаж крупным клиентам",
    nodes:[
      {id:"es1",x:160,y:260,title:"ICP и таргетинг",reason:"Работать с правильными клиентами",metric:"Список 100 ICP компаний",status:"planning",priority:"high",progress:0,tags:["targeting"],color:""},
      {id:"es2",x:420,y:150,title:"Discovery call",reason:"Понять боль и budget",metric:"20 qualified leads",status:"planning",priority:"critical",progress:0,tags:["sales"],color:""},
      {id:"es3",x:420,y:370,title:"Proof of concept",reason:"Снизить риск для клиента",metric:"5 POC запущено",status:"planning",priority:"high",progress:0,tags:["poc"],color:""},
      {id:"es4",x:680,y:260,title:"Коммерческое предложение",reason:"Закрыть сделку",metric:"ACV > $50k",status:"planning",priority:"critical",progress:0,tags:["proposal"],color:""},
      {id:"es5",x:940,y:260,title:"Expansion и upsell",reason:"Рост LTV",metric:"NRR > 120%",status:"planning",priority:"high",progress:0,tags:["expansion"],color:""},
    ],
    edges:[
      {id:"ese1",source:"es1",target:"es2",type:"requires",label:""},
      {id:"ese2",source:"es2",target:"es3",type:"requires",label:""},
      {id:"ese3",source:"es2",target:"es4",type:"affects",label:""},
      {id:"ese4",source:"es3",target:"es4",type:"requires",label:""},
      {id:"ese5",source:"es4",target:"es5",type:"follows",label:""},
    ]
  },
];

// ── Toast ──
function Toast({msg,type="info",onClose,action,onAction}){
  const[progress,setProgress]=useState(100);
  const DURATION=4000;
  useEffect(()=>{
    const start=Date.now();
    const tick=()=>{const elapsed=Date.now()-start;const pct=Math.max(0,100-(elapsed/DURATION*100));setProgress(pct);if(pct<=0){onClose();}else{requestAnimationFrame(tick);}};
    const raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[]);
  const C={info:"#6366f1",error:"#ef4444",success:"#10b981",warn:"#f59e0b"};
  const icons={error:"⚠",success:"✓",warn:"⚡",info:"ℹ"};
  return(
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,borderRadius:12,background:"var(--bg3)",border:`1px solid ${C[type]}55`,color:"var(--text)",fontSize:13,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,.6)",animation:"slideUp .25s ease",maxWidth:480,backdropFilter:"blur(14px)",overflow:"hidden"}}
      onClick={onClose}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer"}}>
        <span style={{color:C[type],fontSize:14,flexShrink:0}}>{icons[type]}</span>
        <span style={{flex:1}}>{msg}</span>
        {action&&onAction&&(
          <button onClick={e=>{e.stopPropagation();onAction();onClose();}}
            style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${C[type]}55`,background:`${C[type]}15`,color:C[type],fontSize:13,cursor:"pointer",fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>
            {action}
          </button>
        )}
        <button onClick={e=>{e.stopPropagation();onClose();}} style={{color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
      </div>
      <div style={{height:2,background:`${C[type]}20`}}>
        <div style={{width:`${progress}%`,height:"100%",background:C[type],transition:"width .1s linear",opacity:.7}}/>
      </div>
    </div>
  );
}

// ── ConfirmDialog ──
function ConfirmDialog({title,message,confirmLabel="Удалить",onConfirm,onCancel,danger=true}){
  const{t}=useLang();
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onCancel();if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))onConfirm();};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,backdropFilter:"blur(8px)",animation:"fadeIn .15s ease"}} onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div style={{width:360,background:"var(--surface,#0f1729)",borderRadius:20,border:`1px solid ${danger?"rgba(239,68,68,.35)":"var(--accent-1)"}`,boxShadow:"var(--shadow,0 32px 80px rgba(0,0,0,.9))",overflow:"hidden",animation:"slideUp .2s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{padding:"26px 24px 20px",textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:15,background:danger?"rgba(239,68,68,.15)":"rgba(99,102,241,.15)",border:`1.5px solid ${danger?"rgba(239,68,68,.4)":"rgba(99,102,241,.4)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 16px"}}>
            {danger?"🗑":"⚡"}
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0",letterSpacing:-.3,marginBottom:10}}>{title}</div>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.65,marginBottom:24}}>{message}</div>
        </div>
        <div style={{display:"flex",gap:10,padding:"0 24px 24px"}}>
          <button onClick={onCancel} style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"#cbd5e1",fontSize:13,fontWeight:600,cursor:"pointer"}} onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";}} onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}>{t("cancel","Отмена")}</button>
          <button onClick={onConfirm} style={{flex:1,padding:"12px",borderRadius:11,border:"none",background:danger?"linear-gradient(135deg,#dc2626,#ef4444)":"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}} onMouseOut={e=>{e.currentTarget.style.transform="none";}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── AuthModal ──
function AuthModal({initialTab="login",onClose,onAuth,theme='dark',title,subtitle}){
  const{lang,setLang,t}=useLang();
  const[tab,setTab]=useState(initialTab),[email,setEmail]=useState(""),[pw,setPw]=useState(""),[name,setName]=useState(""),[err,setErr]=useState(""),[loading,setLoading]=useState(false);
  async function submit(){if(!email||!pw){setErr(t("fill_fields","Заполните все поля"));return;}setLoading(true);setErr("");const res=tab==="login"?await login(email,pw):await register(email,pw,name);setLoading(false);if(res.error)setErr(res.error);else onAuth(res.user,res.isNew||false);}
  const inp={width:"100%",padding:"11px 14px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",outline:"none",marginBottom:10,fontFamily:"'Plus Jakarta Sans',sans-serif"};
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(8px)",animation:"fadeIn .2s ease"}}>
      <div style={{width:400,background:"var(--bg3)",border:"1px solid var(--accent-1)",borderRadius:20,overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,.8)",animation:"slideUp .3s ease"}}>
        <div style={{padding:"18px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:6}}>
            {[["login",t("login","Войти")],["register",t("register","Регистрация")]].map(([t2,l])=>(
              <button key={t2} onClick={()=>{setTab(t2);setErr("");}} style={{padding:"7px 18px",borderRadius:9,border:"none",background:tab===t2?"var(--accent-soft)":"transparent",color:tab===t2?"var(--accent-1)":"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {/* Lang switcher */}
            <div style={{display:"flex",alignItems:"center",gap:2,padding:"3px 4px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)"}}>
              {[["RU","ru"],["EN","en"],["UZ","uz"]].map(([label,code])=>(
                <button key={code} onClick={()=>setLang(code)}
                  style={{padding:"3px 8px",borderRadius:6,border:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:.8,cursor:"pointer",transition:"all .18s",
                    background:lang===code?"var(--accent-soft)":"transparent",
                    color:lang===code?"var(--accent-1)":"var(--text4)"}}>
                  {label}
                </button>
              ))}
            </div>
            {onClose&&<button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text4)",cursor:"pointer",fontSize:16}}>×</button>}
          </div>
        </div>
        <div style={{padding:"20px 24px 24px"}}>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,margin:"0 auto 12px"}}>✦</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>{title||(tab==="login"?t("welcome","Добро пожаловать"):t("create_account","Создать аккаунт"))}</div>
            {subtitle&&<div style={{fontSize:13,color:"var(--text4)",marginTop:6,lineHeight:1.5}}>{subtitle}</div>}
          </div>
          {tab==="register"&&<input placeholder={t("name","Имя")} value={name} onChange={e=>setName(e.target.value)} style={inp}/>}
          <input type="email" placeholder={t("email","Email")} value={email} onChange={e=>setEmail(e.target.value)} style={inp} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <input type="password" placeholder={t("password","Пароль")} value={pw} onChange={e=>setPw(e.target.value)} style={{...inp,marginBottom:0}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {err&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:13}}>{err}</div>}
          <button onClick={submit} disabled={loading} style={{width:"100%",marginTop:16,padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading&&<div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
            {tab==="login"?t("sign_in","Войти"):t("sign_up","Зарегистрироваться")}
          </button>
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
  free:{icon:"⬡",color:"#64748b",badge:null,headline:"Попробуй бесплатно",sub:"Без карты. Навсегда.",accent:"Для первых шагов",features:["1 проект","1 карта","AI-интервью","Gantt таймлайн","Экспорт PNG"],missing:["Команда","Сценарии","Конкурентный анализ"],gradient:"linear-gradient(135deg,#64748b22,#64748b08)",glow:"#64748b",popular:false},
  starter:{icon:"◈",color:"#10b981",badge:"🌱 Новинка",headline:"Первый платный шаг",sub:"Мягкий вход в стратегию",accent:"Лучший старт за $9",features:["3 проекта","3 карты","2 сценария","Анализ рисков AI","Gantt + PNG"],missing:["Команда","Конкурентный анализ","Шаблоны"],gradient:"linear-gradient(135deg,#10b98118,#10b98108)",glow:"#10b981",popular:false},
  pro:{icon:"◆",color:"#8b5cf6",badge:"🔥 Популярный",headline:"Для профессионала",sub:"Полная стратегическая мощь",accent:"73% платящих выбирают Pro",features:["10 проектов","5 карт","3 участника","Конкурентный анализ AI","OKR·SWOT·Риски","Клонирование карт"],missing:["Unit economics","Шаблоны","McKinsey-AI"],gradient:"linear-gradient(135deg,#8b5cf618,#8b5cf608)",glow:"#8b5cf6",popular:true},
  team:{icon:"✦",color:"#f59e0b",badge:"⭐ Лучшая ценность",headline:"Для команд",sub:"Стратегия на уровне McKinsey",accent:"В 2× больше функций чем Pro",features:["25 проектов","15 карт","10 участников","Unit economics разбор","AI авто-связи","Шаблоны стратегий"],missing:["BCG·Porter·Blue Ocean","PowerPoint экспорт","AI-отчёты"],gradient:"linear-gradient(135deg,#f59e0b18,#f59e0b08)",glow:"#f59e0b",popular:false,highlight:true},
  enterprise:{icon:"💎",color:"#06b6d4",badge:"💎 Топ-уровень",headline:"Без компромиссов",sub:"AI-директор по стратегии",accent:"Окупается за 1 решение",features:["∞ проектов и карт","∞ участников","AI = стратег+финансист+инвестор","BCG·Porter·Blue Ocean","PowerPoint экспорт","API-доступ"],missing:[],gradient:"linear-gradient(135deg,#06b6d418,#06b6d408)",glow:"#06b6d4",popular:false},
};

const TIER_PRICES={free:"Бесплатно",starter:"$9/мес",pro:"$29/мес",team:"$59/мес",enterprise:"$149+/мес"};
const TIER_PRICE_NUM={free:"0",starter:"9",pro:"29",team:"59",enterprise:"149+"};
const TIER_ORDER=["free","starter","pro","team","enterprise"];
const TIER_FEAT_KEY={free:"free",starter:"str",pro:"pro",team:"team",enterprise:"ent"};

function FeatureValue({val}){
  if(val===false)return <span style={{color:"var(--text6)",fontSize:13}}>—</span>;
  if(val===true)return <span style={{color:"#10b981",fontWeight:700,fontSize:14}}>✓</span>;
  return <span style={{color:"var(--text2)",fontSize:13,fontWeight:500}}>{val}</span>;
}

function TierSelectionScreen({isNew,currentUser,theme="dark",palette="indigo",onSelect,onBack}){
  const{t}=useLang();
  const curTier=currentUser?.tier||"free";
  const[selected,setSelected]=useState(()=>{const idx=TIER_ORDER.indexOf(curTier);return TIER_ORDER[Math.min(idx+1,TIER_ORDER.length-1)]||"pro";});
  const[loading,setLoading]=useState(false);
  const[hovered,setHovered]=useState(null);
  const curIdx=TIER_ORDER.indexOf(curTier);
  async function proceed(){setLoading(true);await onSelect(selected);setLoading(false);}
  const sel=TIERS[selected]||TIERS.pro;
  const selMkt=TIER_MKT[selected]||TIER_MKT.pro;
  return(
    <div data-theme={theme} data-palette={palette} style={{width:"100vw",minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",overflowY:"auto",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(var(--accent-grid) 1px,transparent 1px),linear-gradient(90deg,var(--accent-grid) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      <div style={{position:"fixed",width:800,height:800,borderRadius:"50%",background:`radial-gradient(circle,${selMkt.glow}18 0%,transparent 65%)`,top:"-20%",right:"-15%",filter:"blur(100px)",pointerEvents:"none",transition:"background 1.4s ease"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 32px",position:"relative",flexShrink:0,borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 6px 24px var(--accent-glow)"}}>✦</div>
          <span style={{fontSize:16,fontWeight:800,color:"var(--text)",letterSpacing:-.3}}>Strategy AI</span>
        </div>
        {!isNew&&onBack&&<button onClick={onBack} style={{padding:"7px 16px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,cursor:"pointer",fontWeight:500}}>{t("back_btn","← Назад")}</button>}
      </div>
      <div style={{position:"relative",maxWidth:1300,width:"100%",margin:"0 auto",padding:"0 24px 80px",flex:1}}>
        <div style={{textAlign:"center",padding:"40px 0 44px"}}>
          <h1 style={{fontSize:52,fontWeight:900,color:"var(--text)",letterSpacing:-2,lineHeight:1.05,marginBottom:10,animation:"slideUp .4s .1s both"}}>
            Выберите<br/>
            <span style={{background:`linear-gradient(135deg,${selMkt.glow},${selMkt.glow}99,var(--accent-1))`,backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradShift 4s ease infinite"}}>свой тариф</span>
          </h1>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:36,alignItems:"stretch"}}>
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
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(10px)"}}>
      <div style={{width:480,background:"var(--bg2)",border:"1px solid rgba(239,68,68,.3)",borderRadius:22,overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,.85)"}}>
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
            <button onClick={doReplace} disabled={!replaceId||loading} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:replaceId&&!loading?"linear-gradient(135deg,#dc2626,#ef4444)":"var(--surface2)",color:replaceId&&!loading?"#fff":"var(--text4)",fontSize:13,fontWeight:700,cursor:replaceId&&!loading?"pointer":"not-allowed"}}>{loading?t("replacing",t("replacing","Заменяю…")):t("replace_btn","🗑 Заменить")}</button>
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
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18}}>
      <style>{CSS}</style>
      <div style={{width:52,height:52,borderRadius:15,background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,animation:"float 2s ease infinite"}}>✦</div>
      <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>Сохраняю карту…</div>
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
    await saveMap(proj.id,map);setSaving(false);onComplete(u,proj,map);
  }
  if(saving)return <SavingScreen theme={theme}/>;
  if(step==="auth")return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <style>{CSS}</style>
      <AuthModal initialTab="register" theme={theme} title="Сохранить карту" subtitle="Создайте аккаунт — карта сохранится автоматически" onAuth={afterAuth}/>
      <button onClick={onBack} style={{position:"absolute",top:16,left:16,padding:"5px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>{t("back_btn","← Назад")}</button>
    </div>
  );
  if(step==="tier")return <TierSelectionScreen isNew={isNew} currentUser={user} theme={theme} onSelect={afterTierSelect} onBack={()=>setStep("auth")}/>;
  if(step==="conflict")return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <MapConflictModal existingMaps={existingMaps} newNodeCount={pendingMap?.nodes?.length||0} tierLabel={(TIERS[user?.tier]||TIERS.free).label} tierMapsCount={(TIERS[user?.tier]||TIERS.free).maps} onReplace={async(mapId)=>{await doSaveAndGo(targetProject,user,mapId);}} onUpgrade={()=>setStep("tier")} theme={theme}/>
    </div>
  );
  return <SavingScreen theme={theme}/>;
}

// ── Toggle (reusable) ──
function Toggle({val,onChange,label,desc}){
  return(
    <div onClick={()=>onChange(!val)} className="icard" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:8,cursor:"pointer"}}>
      <div>
        <div className="icard-title" style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{label}</div>
        {desc&&<div className="icard-desc" style={{fontSize:13,marginTop:2}}>{desc}</div>}
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

  const selTier=TIERS[selected]||TIERS.free;
  const curIdx=TIER_ORDER.indexOf(user.tier||"free");
  const isCurrentTier=selected===user.tier;
  const isUpgrade=TIER_ORDER.indexOf(selected)>curIdx;
  const fi={width:"100%",padding:"10px 13px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:9,color:"var(--text)",outline:"none",marginBottom:10,fontFamily:"'Plus Jakarta Sans',sans-serif"};
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
      const u=await patchUser(user.email,{notifEmail,notifPush,autoSave,compactMode,defaultView,aiLang});
      if(u)onUpdate(u);
      if(uiLang!==lang)setLang(uiLang);
      setSettingsSaved(true);
      setTimeout(()=>setSettingsSaved(false),2200);
    }catch(e:any){setMsg({t:e?.message||t("save_error","Ошибка сохранения"),ok:false});}
    setLoading(false);
  }
  async function executeBuy(){
    // Dev-аккаунт — мгновенное переключение без оплаты
    if(user.email==="denisblackman2@gmail.com"){
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
  useEffect(()=>{const h=e=>{if(e.key==="Escape"&&!buyPhase)onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[buyPhase]);

  const TABS=[
    ["profile","👤",t("profile_title","Профиль")],
    ["security","🔐",t("security_title","Безопасность")],
    ["settings","⚙",t("settings_title","Настройки")],
    ["stats","📊",t("stats_tab","Статистика")],
    ["tier","💳",t("billing_title","Тариф")],
  ];

  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(16px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget&&!buyPhase&&!showDeleteConfirm)onClose();}}>
      <style>{CSS}</style>
      <div style={{position:"relative",width:isMobile?"100%":"min(96vw,980px)",maxHeight:isMobile?"90vh":"94vh",background:"var(--bg2)",borderRadius:isMobile?20:28,borderTopLeftRadius:20,borderTopRightRadius:20,border:"1px solid var(--border2)",boxShadow:"0 50px 120px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",animation:isMobile?"slideUp .25s ease":"none",overflow:"hidden"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"18px 24px",flexShrink:0,borderBottom:"1px solid var(--border)",background:"var(--bg3)"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${tier.color},${tier.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff",boxShadow:`0 6px 20px ${tier.color}44`}}>{(user.name||user.email)[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{user.name||t("user_word","Пользователь")}</div>
            <div style={{fontSize:13,color:"var(--text4)",marginTop:1}}>{user.email}</div>
            {user.bio&&<div style={{fontSize:13,color:"var(--text5)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:320}}>{user.bio}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:`${tier.color}18`,border:`1px solid ${tier.color}44`}}>
            <span style={{fontSize:14}}>{tier.badge}</span>
            <span style={{fontSize:13,fontWeight:700,color:tier.color}}>{tier.label}</span>
          </div>
          <button onClick={onClose} style={{width:34,height:34,borderRadius:"50%",border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}} onMouseOver={e=>e.currentTarget.style.background="var(--surface2)"} onMouseOut={e=>e.currentTarget.style.background="var(--surface)"}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",gap:0,padding:"0 24px",flexShrink:0,borderBottom:"1px solid var(--border)",background:"var(--bg2)"}}>
          {TABS.map(([k,icon,label])=>(
            <button key={k} onClick={()=>{setTab(k);setMsg(null);}} style={{padding:"11px 14px",border:"none",background:"transparent",color:tab===k?"var(--text)":"var(--text4)",fontSize:13.5,fontWeight:tab===k?700:500,cursor:"pointer",borderBottom:tab===k?`2px solid ${tier.color}`:"2px solid transparent",transition:"all .15s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
              <span style={{fontSize:13}}>{icon}</span>{label}
            </button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={onLogout} style={{padding:"11px 14px",border:"none",background:"transparent",color:"#ef4444",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}} onMouseOver={e=>e.currentTarget.style.opacity=".7"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
            <span>⎋</span> {t("logout","Выйти")}
          </button>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* ── PROFILE TAB ── */}
          {tab==="profile"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28,maxWidth:680}}>
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
              {msg&&<div style={{marginTop:16,maxWidth:680,padding:"10px 15px",borderRadius:10,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#10b981":"#ef4444",fontSize:13.5}}>{msg.t}</div>}
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {tab==="security"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{maxWidth:420}}>
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
                        <div key={i} style={{flex:1,height:4,borderRadius:2,background:ok?"#10b981":"var(--border2)",transition:"background .3s"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:13,color:"var(--text5)",marginTop:4}}>{[np.length>=6&&t("chars_6plus","6+"),/[A-Z]/.test(np)&&t("uppercase_chars","A-Z"),/[0-9]/.test(np)&&"0-9",/[^a-zA-Z0-9]/.test(np)&&"!@#"].filter(Boolean).join(" · ")}</div>
                  </div>
                )}
                <button onClick={changePw} disabled={loading} style={{padding:"12px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>
                  {loading?t("saving","Сохраняю…"):t("change_pw_btn","Изменить пароль")}
                </button>
                {msg&&<div style={{padding:"10px 14px",borderRadius:9,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#10b981":"#ef4444",fontSize:13.5}}>{msg.t}</div>}

                <div style={{marginTop:24,paddingTop:24,borderTop:"1px solid var(--border)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#ef4444",marginBottom:8}}>{t("danger_zone","Опасная зона")}</div>
                  <div style={{padding:"14px 16px",borderRadius:11,background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.15)"}}>
                    <div style={{fontSize:13.5,color:"var(--text)",fontWeight:600}}>{t("delete_account","Удалить аккаунт")}</div>
                    <div style={{fontSize:13.5,color:"var(--text4)",marginTop:3,marginBottom:10}}>{t("all_data_deleted","Все данные будут удалены безвозвратно")}</div>
                    <button onClick={()=>setShowDeleteConfirm(true)} disabled={loading} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(239,68,68,.35)",background:"transparent",color:"#ef4444",fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>{loading?t("loading_short","Загрузка…"):t("delete_account","Удалить аккаунт")}</button>
                  </div>
                </div>
                {showDeleteConfirm&&(
                  <div style={{position:"fixed",inset:0,zIndex:210,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowDeleteConfirm(false)}>
                    <div style={{background:"var(--bg2)",borderRadius:16,border:"1px solid var(--border)",padding:"24px 28px",maxWidth:400,width:"100%",boxShadow:"0 24px 48px rgba(0,0,0,.5)"}} onClick={e=>e.stopPropagation()}>
                      <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>{t("delete_account","Удалить аккаунт")}?</div>
                      <div style={{fontSize:13.5,color:"var(--text3)",marginBottom:20}}>{t("delete_warning","Все данные будут удалены безвозвратно")}</div>
                      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                        <button onClick={()=>setShowDeleteConfirm(false)} style={{padding:"10px 20px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("cancel","Отмена")}</button>
                        <button onClick={handleDeleteAccount} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#ef4444",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("delete_forever","Удалить навсегда")}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab==="settings"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,maxWidth:720}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span>🎨</span> {t("appearance","Внешний вид")}</div>
                  <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{t("theme_label","Тема")}</div>
                      <div style={{fontSize:13,color:"var(--text4)",marginTop:2}}>{theme==="dark"?t("dark_theme_label","🌙 Тёмная"):t("light_theme_label","☀️ Светлая")}</div>
                    </div>
                    <button onClick={onToggleTheme} style={{padding:"6px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                      {theme==="dark"?t("light_theme_label","☀️ Светлая"):t("dark_theme_label","🌙 Тёмная")}
                    </button>
                  </div>
                  {onPaletteChange&&(
                    <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginTop:8,marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:8}}>{t("palette_label","Цветовая палитра")}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {[
                          {id:"indigo",label:"◆ Indigo",c1:"#5b6bc0",c2:"#7c8dd9"},
                          {id:"ocean",label:"◇ Ocean",c1:"#5b8fb9",c2:"#7ab8d4"},
                          {id:"forest",label:"◇ Forest",c1:"#5a8c7b",c2:"#6ba881"},
                          {id:"sunset",label:"◇ Sunset",c1:"#b88a6a",c2:"#c9a088"},
                          {id:"mono",label:"◇ Mono",c1:"#6b7a8a",c2:"#8a9baa"},
                        ].map(({id,label,c1,c2})=>(
                          <button key={id} onClick={()=>onPaletteChange(id)} style={{padding:"7px 12px",borderRadius:8,border:`2px solid ${palette===id?"var(--accent-1)":"var(--border)"}`,background:palette===id?"var(--accent-soft)":"transparent",color:"var(--text)",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                            <span style={{width:12,height:12,borderRadius:4,background:`linear-gradient(135deg,${c1},${c2})`}}/>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Toggle val={compactMode} onChange={setCompactMode} label={t("compact_mode","Компактный режим")} desc={t("compact_desc","Уменьшенные карточки узлов")}/>

                  <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginTop:8,marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:8}}>{t("select_language","Язык интерфейса")}</div>
                    <div style={{display:"flex",gap:6}}>
                      {[["ru","🇷🇺 RU"],["en","🇬🇧 EN"],["uz","🇺🇿 UZ"]].map(([v,label])=>(
                        <button key={v} onClick={()=>setUiLang(v)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${uiLang===v?"var(--accent-1)":"var(--border)"}`,background:uiLang===v?"var(--accent-soft)":"transparent",color:uiLang===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginTop:18,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span>🗺</span> {t("strategy_maps","Карты")}</div>
                  <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:8}}>{t("default_view","Вид по умолчанию")}</div>
                    <div style={{display:"flex",gap:6}}>
                      {[["canvas",t("canvas_view","🗺 Канвас")],["gantt",t("gantt_view","📅 Gantt")],["list",t("list_view","📋 Список")]].map(([v,label])=>(
                        <button key={v} onClick={()=>setDefaultView(v)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${defaultView===v?"var(--accent-1)":"var(--border)"}`,background:defaultView===v?"var(--accent-soft)":"transparent",color:defaultView===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle val={autoSave} onChange={setAutoSave} label={t("auto_save","Автосохранение")} desc={t("autosave_desc","Сохранять карту при каждом изменении")}/>
                </div>

                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>{t("ai_assistant_title","🤖 AI-ассистент")}</div>
                  <div style={{padding:"13px 16px",borderRadius:11,background:"var(--surface)",border:"1px solid var(--border)",marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:8}}>{t("ai_language","Язык ответов AI")}</div>
                    <div style={{display:"flex",gap:6}}>
                      {[["ru","🇷🇺 Русский"],["en","🇬🇧 English"],["uz","🇺🇿 O'zbekcha"]].map(([v,label])=>(
                        <button key={v} onClick={()=>setAiLang(v)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${aiLang===v?"var(--accent-1)":"var(--border)"}`,background:aiLang===v?"var(--accent-soft)":"transparent",color:aiLang===v?"var(--accent-1)":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"center"}}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginTop:18,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>{t("notifications_title","🔔 Уведомления")}</div>
                  <Toggle val={notifEmail} onChange={setNotifEmail} label={t("email_notifications","Email уведомления")} desc={t("notif_email_desc","Важные обновления на почту")}/>
                  <Toggle val={notifPush} onChange={setNotifPush} label={t("push_notifications","Push уведомления")} desc={t("notif_push_desc","Уведомления в браузере")}/>
                </div>
              </div>

              <div style={{marginTop:24,maxWidth:720,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <button onClick={saveSettings} disabled={loading} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent-1),var(--accent-2))",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                  {loading?t("saving","Сохраняю…"):t("save_settings","Сохранить настройки")}
                </button>
                {settingsSaved&&<div style={{fontSize:13.5,color:"#10b981",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span> {t("settings_saved","Настройки сохранены ✓")}</div>}
                {msg&&!settingsSaved&&<div style={{padding:"10px 14px",borderRadius:9,background:msg.ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",border:`1px solid ${msg.ok?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}`,color:msg.ok?"#10b981":"#ef4444",fontSize:13.5}}>{msg.t}</div>}
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab==="stats"&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:20}}>{t("stats_tab","Статистика аккаунта")}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24,maxWidth:620}}>
                {[
                  {icon:"📁",label:t("billing_title","Тариф"),val:tier.label,color:tier.color},
                  {icon:"🗺",label:t("maps_available","Карт доступно"),val:fmt(tier.maps),color:"var(--accent-1)"},
                  {icon:"👥",label:t("members","Участников"),val:fmt(tier.users),color:"var(--accent-2)"},
                  {icon:"⎇",label:t("scenarios_available","Сценариев"),val:fmt(tier.scenarios),color:"#0ea5e9"},
                  {icon:"📁",label:t("projects_available","Проектов"),val:fmt(tier.projects),color:"#10b981"},
                  {icon:"🤖",label:t("ai_level","AI уровень"),val:tier.ai,color:"#f59e0b"},
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
                    {label:"White-label",ok:tier.wl},
                    {label:"API",ok:tier.api},
                    {label:t("export_pdf","Отчёты"),ok:tier.report},
                    {label:t("export_pptx","PowerPoint экспорт"),ok:tier.pptx},
                  ].map(f=>(
                    <div key={f.label} className="icard feat-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
                      <span className="icard-title" style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>{f.label}</span>
                      <span style={{fontSize:13,fontWeight:700,color:f.ok?"#10b981":"var(--text5)"}}>{f.ok?"✓ "+t("done","Включено"):"✗ —"}</span>
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
            <div style={{display:"flex",width:"100%",overflow:"hidden"}}>
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
                    {isUpgrade&&user.email!=="denisblackman2@gmail.com"&&(
                      <div style={{marginBottom:16,padding:"14px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:12}}>{t("card_data_title","💳 Данные карты")}</div>
                        <input style={fi} placeholder={t("card_number_ph","Номер карты…")} value={cardNum} onChange={e=>setCardNum(formatCardNum(e.target.value))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        <input style={fi} placeholder={t("card_holder_ph","Имя держателя…")} value={cardName} onChange={e=>setCardName(e.target.value)} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <input style={{...fi,marginBottom:0}} placeholder={t("card_expiry_ph","ММ/ГГ")} value={cardExp} onChange={e=>setCardExp(formatExp(e.target.value))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                          <input style={{...fi,marginBottom:0}} placeholder={t("card_cvv_ph","CVV")} value={cardCvv} onChange={e=>setCardCvv(e.target.value.replace(/\D/g,"").slice(0,4))} onFocus={e=>e.target.style.borderColor=selTier.color} onBlur={e=>e.target.style.borderColor="var(--input-border)"}/>
                        </div>
                        {cardError&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:13}}>⚠️ {cardError}</div>}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,paddingTop:12,marginTop:12,borderTop:"1px solid var(--border)"}}>
                          {["🔒 SSL","💳 Visa/MC","✓ PCI DSS"].map(b=><div key={b} style={{fontSize:13,color:"var(--text4)",fontWeight:500}}>{b}</div>)}
                        </div>
                      </div>
                    )}
                    {!isCurrentTier&&!isUpgrade&&(
                      <div style={{marginBottom:12,padding:"12px 14px",borderRadius:10,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",fontSize:13,color:"#f59e0b"}}>
                        <div style={{fontWeight:700,marginBottom:6}}>⚠️ {t("downgrade_warning","После смены тарифа часть данных может быть ограничена.")}</div>
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
                        {isUpgrade?(user.email==="denisblackman2@gmail.com"?t("activate_btn","⚡ Активировать")+" "+selTier.label:"🔒 "+t("go_to_plan","Перейти на {plan} — {price}").replace("{plan}",selTier.label).replace("{price}",getTierPrice(selected,t))):t("downgrade_to","↓ Перейти на ")+selTier.label}
                      </button>
                    )}
                    {isUpgrade&&user.email==="denisblackman2@gmail.com"&&<div style={{textAlign:"center",marginTop:8,fontSize:13.5,color:"var(--text4)"}}>{t("demo_payment_skipped","Демо — оплата пропущена")}</div>}
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

// ── Landing ──
const OB_SYS=`Ты — стратегический консультант, проводишь глубокое интервью для создания персонального стратегического плана.
Правила: задавай ровно по одному вопросу, короткие и конкретные (1–2 предложения). Углубляйся в детали — что за продукт, кто платит, где узкое место роста, какой главный риск, следующий шаг.
После 6-го ответа пользователя ответь ТОЛЬКО словом: READY`;

const MAP_GEN_SYS=`Создай стратегическую карту на основе интервью. Верни ТОЛЬКО валидный JSON без markdown:
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"high","progress":35,"tags":[]}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"requires","label":""}]}
Требования: 7–9 узлов, конкретные названия (не абстракции), X: 150–900, Y: 80–520, связи отражают зависимости.`;

function Landing({onStart,onLogin,hasSaved,theme="dark",onToggleTheme}){
  const{t}=useLang();
  const[showAuth,setShowAuth]=useState(false);
  const FEATURES=[
    {icon:"🧠",title:"AI-интервью",desc:"6 умных вопросов — и ваша стратегия уже на карте"},
    {icon:"🗺",title:"Визуальная карта",desc:"Drag & drop, связи, статусы, прогресс в реальном времени"},
    {icon:"⚡",title:"AI-советник",desc:"Задавайте вопросы прямо в контексте вашей карты"},
    {icon:"📊",title:"Сценарии",desc:"Симулируйте разные стратегии без риска для основного плана"},
  ];
  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Plus Jakarta Sans',sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse 80% 60% at 50% -20%,rgba(99,102,241,.12) 0%,transparent 60%),linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",backgroundSize:"auto,60px 60px,60px 60px",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",padding:"14px 28px",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>✦</div>
          <span style={{fontSize:16,fontWeight:800,color:"var(--text)",letterSpacing:-.4}}>Strategy AI</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onToggleTheme} style={{padding:"7px 12px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,cursor:"pointer"}}>{theme==="dark"?"☀️":"🌙"}</button>
          <button onClick={()=>setShowAuth(true)} style={{padding:"7px 16px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("sign_in","Войти")}</button>
          <button onClick={onStart} style={{padding:"7px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(99,102,241,.35)"}}>{t("start_free_arrow","Начать бесплатно →")}</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",position:"relative",zIndex:10}}>
        <div style={{textAlign:"center",maxWidth:680,marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:20,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",marginBottom:20}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#10b981",animation:"pulse 2s infinite",display:"inline-block"}}/>
            <span style={{fontSize:13,color:"#818cf8",fontWeight:600}}>AI-powered стратегическое планирование</span>
          </div>
          <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:900,color:"var(--text)",letterSpacing:-2,lineHeight:1.1,marginBottom:16}}>
            Ваша стратегия —<br/>
            <span style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>за 3 минуты</span>
          </h1>
          <p style={{fontSize:17,color:"var(--text3)",lineHeight:1.6,marginBottom:32}}>AI задаст 6 вопросов о вашем бизнесе и построит персональную стратегическую карту с приоритетами, метриками и связями.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onStart}
              style={{padding:"14px 32px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 28px rgba(99,102,241,.4)",letterSpacing:-.3,transition:"all .2s"}}
              onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseOut={e=>e.currentTarget.style.transform="none"}>
              ✦ Создать карту бесплатно
            </button>
            {hasSaved&&<button onClick={()=>setShowAuth(true)} style={{padding:"14px 28px",borderRadius:14,border:"1px solid var(--border2)",background:"var(--surface)",color:"var(--text)",fontSize:15,fontWeight:700,cursor:"pointer"}}>{t("continue_arrow","Продолжить →")}</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,width:"100%",maxWidth:860}}>
          {FEATURES.map(f=>(
            <div key={f.title} className="icard" style={{padding:"18px 20px",borderRadius:16,background:"var(--card)",border:"1px solid var(--border)",backdropFilter:"blur(10px)"}}>
              <div style={{fontSize:24,marginBottom:8}}>{f.icon}</div>
              <div className="icard-title" style={{fontSize:13.5,fontWeight:700,color:"var(--text)",marginBottom:4}}>{f.title}</div>
              <div className="icard-desc" style={{fontSize:13,lineHeight:1.55}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <LandingFooter/>
      {showAuth&&<AuthModal theme={theme} onClose={()=>setShowAuth(false)} onAuth={(u:any)=>{setShowAuth(false);onLogin(u);}}/>}
      <CookieConsent/>
    </div>
  );
}

// ── CookieConsent ──
function CookieConsent(){
  const{t}=useLang();
  const[shown,setShown]=useState(()=>{
    try{return!localStorage.getItem("sa_cookie_ok");}catch{return true;}
  });
  if(!shown)return null;
  function accept(){try{localStorage.setItem("sa_cookie_ok","1");}catch{}setShown(false);}
  return(
    <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"rgba(15,23,42,.95)",backdropFilter:"blur(12px)",border:"1px solid rgba(99,102,241,.25)",borderRadius:14,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,maxWidth:560,width:"92vw",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}>
      <span style={{fontSize:12,color:"#94a3b8",flex:1,lineHeight:1.5}}>{t("cookie_text","🍪 Мы используем cookies для аналитики и улучшения сервиса. Продолжая, вы соглашаетесь с нашей")} <a href="/privacy" target="_blank" style={{color:"#818cf8",textDecoration:"underline"}}>{t("cookie_policy","Политикой конфиденциальности")}</a>.</span>
      <button onClick={accept} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{t("cookie_accept","Принять")}</button>
    </div>
  );
}

// ── LandingFooter ──
function LandingFooter(){
  const{t}=useLang();
  const cols=[
    {titleKey:"footer_product",links:[{labelKey:"footer_features",href:"#features"},{labelKey:"footer_pricing_link",href:"#pricing"},{labelKey:"footer_templates",href:"#templates"},{labelKey:"footer_changelog",href:"/changelog"}]},
    {titleKey:"footer_company",links:[{labelKey:"footer_about",href:"/about"},{labelKey:"footer_blog",href:"/blog"},{labelKey:"footer_careers",href:"/careers"},{labelKey:"footer_contact",href:"/contact"}]},
    {titleKey:"footer_legal",links:[{labelKey:"footer_privacy",href:"/privacy"},{labelKey:"footer_terms",href:"/terms"},{labelKey:"footer_cookies",href:"/cookies"},{labelKey:"footer_gdpr",href:"/gdpr"}]},
  ];
  return(
    <footer style={{background:"rgba(15,23,42,.8)",backdropFilter:"blur(8px)",borderTop:"1px solid rgba(99,102,241,.1)",padding:"28px 40px",marginTop:40}}>
      <div style={{maxWidth:1100,margin:"0 auto",display:"flex",flexWrap:"wrap",gap:24,justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✦</div>
            <span style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>Strategy AI</span>
          </div>
          <p style={{fontSize:12,color:"#64748b",maxWidth:200,lineHeight:1.6,margin:0}}>{t("footer_tagline","Визуальное стратегическое планирование с AI-советником уровня McKinsey.")}</p>
        </div>
        {cols.map(col=>(
          <div key={col.titleKey}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,textTransform:"uppercase",letterSpacing:.8}}>{t(col.titleKey)}</div>
            {col.links.map(l=>(
              <a key={l.labelKey} href={l.href} style={{display:"block",fontSize:13,color:"#64748b",marginBottom:6,textDecoration:"none",transition:"color .15s"}}
                onMouseOver={e=>(e.target as HTMLElement).style.color="#818cf8"}
                onMouseOut={e=>(e.target as HTMLElement).style.color="#64748b"}>{t(l.labelKey)}</a>
            ))}
          </div>
        ))}
      </div>
      <div style={{maxWidth:1100,margin:"20px auto 0",paddingTop:16,borderTop:"1px solid rgba(99,102,241,.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,color:"#475569"}}>{t("footer_rights","© 2026 Strategy AI. Все права защищены.")}</span>
        <div style={{display:"flex",gap:14}}>
          {[{icon:"𝕏",href:"https://twitter.com/strategyai"},{icon:"in",href:"https://linkedin.com/company/strategyai"},{icon:"💬",href:"https://t.me/strategyai"}].map(s=>(
            <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer" style={{width:30,height:30,borderRadius:8,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#818cf8",fontSize:12,fontWeight:700,textDecoration:"none"}}>{s.icon}</a>
          ))}
        </div>
      </div>
    </footer>
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
  const[history,setHistory]=useState([]);
  const[qCount,setQCount]=useState(0);
  const endRef=useRef(null);
  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью — задай первый вопрос."}]:hist,OB_SYS,300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{setMsgs(m=>[...m,{role:"ai",text:reply.trim()}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:"Расскажите о своём продукте — что создаёте и для кого?"}]);
      setQCount(1);setLoading(false);
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
    setGenerating(true);
    setMsgs(m=>[...m,{role:"ai",text:"Анализирую ваши ответы и строю персональную карту…"}]);
    const ctx=hist.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    try{
      const raw=await callAI([{role:"user",content:"Интервью:\n"+ctx+"\n\nСоздай стратегическую карту."}],MAP_GEN_SYS,1500);
      const clean=raw.replace(/```json|```/g,"").trim();
      const data=JSON.parse(clean);
      onDone({nodes:data.nodes||[],edges:data.edges||[],ctx});
    }catch{
      onDone({nodes:defaultNodes(),edges:[{id:"e1",source:"n1",target:"n2",type:"requires",label:""},{id:"e2",source:"n2",target:"n4",type:"requires",label:""},{id:"e3",source:"n3",target:"n4",type:"affects",label:""}],ctx});
    }
  }
  const progress=Math.min(100,Math.round(qCount/MAX_Q*100));
  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",fontFamily:"'Plus Jakarta Sans',sans-serif",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",position:"relative",zIndex:10}}>
        <button onClick={onBack} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{t("back_btn","← Назад")}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>AI-интервью · {qCount}/{MAX_Q} вопросов</div>
          <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
            <div style={{height:"100%",width:progress+"%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:2,transition:"width .4s ease"}}/>
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:12,maxWidth:720,margin:"0 auto",width:"100%"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
            <div style={{maxWidth:"80%",padding:"11px 15px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",background:m.role==="user"?"rgba(99,102,241,.18)":"var(--surface)",border:`1px solid ${m.role==="user"?"rgba(99,102,241,.3)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
        {(loading||generating)&&(
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
            <div style={{display:"flex",gap:5,padding:"11px 15px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"4px 14px 14px 14px"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      {!generating&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:720,margin:"0 auto",width:"100%"}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}}
            placeholder={qCount>=MAX_Q?"Нажмите Enter для генерации карты…":"Ваш ответ…"}
            style={{flex:1,padding:"11px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}
            disabled={loading}/>
          <button onClick={submit} disabled={!inp.trim()||loading}
            style={{padding:"11px 22px",borderRadius:12,border:"none",background:inp.trim()&&!loading?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface)",color:inp.trim()&&!loading?"#fff":"var(--text4)",fontSize:14,fontWeight:700,cursor:inp.trim()&&!loading?"pointer":"not-allowed",transition:"all .15s"}}>
            {qCount>=MAX_Q?"Создать карту ✦":"Ответить →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── MiniMap ──
function MiniMap({nodes,edges,viewX,viewY,zoom,canvasW,canvasH,onJump,theme}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
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
    <div onClick={handleClick} style={{position:"absolute",bottom:16,right:16,width:W,height:H,borderRadius:10,overflow:"hidden",background:"var(--bg2)",border:"1px solid var(--border2)",boxShadow:"0 4px 16px rgba(0,0,0,.4)",cursor:"crosshair",zIndex:50}}>
      <svg width={W} height={H}>
        {edges.map(e=>{
          const s2=nodes.find(n=>n.id===e.source),t2=nodes.find(n=>n.id===e.target);
          if(!s2||!t2)return null;
          return <line key={e.id} x1={tx(s2)+12} y1={ty(s2)+7} x2={tx(t2)+12} y2={ty(t2)+7} stroke="rgba(99,102,241,.35)" strokeWidth={1}/>;
        })}
        {nodes.map(n=>{
          const st=STATUS[n.status];
          return <rect key={n.id} x={tx(n)} y={ty(n)} width={24} height={14} rx={3} fill={st?st.c+"33":"#6366f133"} stroke={st?st.c:"#6366f1"} strokeWidth={.8}/>;
        })}
        <rect x={Math.max(0,vpX)} y={Math.max(0,vpY)} width={Math.min(vpW,W)} height={Math.min(vpH,H)} fill="rgba(99,102,241,.06)" stroke="#6366f1" strokeWidth={1} strokeDasharray="3,2"/>
      </svg>
    </div>
  );
}

// ── StatsPopup ──
function StatsPopup({nodes,edges,onClose}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const total=nodes.length;
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
  const healthColor=healthScore>=70?"#10b981":healthScore>=40?"#f59e0b":"#ef4444";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,backdropFilter:"blur(10px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"min(96vw,620px)",background:"var(--bg2)",borderRadius:22,border:"1px solid var(--border)",boxShadow:"0 50px 120px rgba(0,0,0,.7)",padding:"24px 26px",animation:"scaleIn .22s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"var(--text)",letterSpacing:-.3}}>📊 Аналитика карты</div>
            <div style={{fontSize:13.5,color:"var(--text4)",marginTop:2}}>{total} шагов · {edges.length} связей</div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
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
            {[[done,"✅",t("completed","Выполнено"),"#10b981"],[active,"⚡",t("in_progress","В работе"),"#0ea5e9"],[blocked,"🔒","Блокировано","#ef4444"],[overdue,"⚠️",t("overdue","Просрочено"),"#f97316"],[critical,"🔴","Критичных","#ef4444"],[edges.length,"🔗","Связей","#8b5cf6"]].map(([v,ic,lbl,col])=>(
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
            <span style={{fontSize:13,fontWeight:900,color:"#6366f1"}}>{avgProg}%</span>
          </div>
          <div style={{height:10,borderRadius:5,background:"var(--surface2)",overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",inset:0,height:"100%",width:avgProg+"%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:5,transition:"width .7s cubic-bezier(.34,1.56,.64,1)"}}/>
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

// ── RichEditorPanel ──
function RichEditorPanel({node,ctx,readOnly,userName,onUpdate,onDelete,onClose,allNodes=[],allEdges=[],onScrollTo,onConnect}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const ETYPE=getETYPE(t);
  const[tab,setTab]=useState("info");
  const[newComment,setNewComment]=useState("");
  const[aiRephrLoading,setAiRephrLoading]=useState(false);
  const[aiCommentLoading,setAiCommentLoading]=useState(false);
  const[autoConnLoading,setAutoConnLoading]=useState(false);
  const comments=node.comments||[];
  const history=node.history||[];
  const COLORS=["","#6366f1","#8b5cf6","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#84cc16","#f97316"];

  async function aiRephrase(){
    if(aiRephrLoading)return;
    setAiRephrLoading(true);
    try{
      const raw=await callAI([{role:"user",content:`Перефразируй шаг стратегической карты — сделай название конкретным и actionable.
Название: ${node.title||""}
Причина: ${node.reason||"нет"}
Метрика: ${node.metric||"нет"}
Контекст: ${ctx||"стартап"}
Верни ТОЛЬКО JSON: {"title":"...","reason":"...","metric":"..."}`}]);
      let p;
      try{p=JSON.parse(raw.replace(/```json|```/g,"").trim());}
      catch{const m=raw.match(/\{[\s\S]*\}/);p=m?JSON.parse(m[0]):null;}
      if(p?.title){
        const hEntry={id:uid(),type:"ai_rephrase",at:Date.now(),by:"AI ✦",before:{title:node.title},after:{title:p.title}};
        onUpdate({...p,history:[...history,hEntry]});
      }
    }catch{}
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
        const answer=await callAI([{role:"user",content:`Вопрос по узлу "${node.title||""}": ${q}\nКонтекст: ${ctx||"стартап"}. Ответь кратко, 2–3 предложения.`}]);
        onUpdate({comments:[...base,{...aiPlaceholder,text:answer}]});
      }catch{onUpdate({comments:[...base,{...aiPlaceholder,text:t("ai_comment_error","Ошибка AI. Попробуйте ещё раз.")}]});}
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
    const others=allNodes.filter(n=>n.id!==node.id);
    const prompt=`Узел: "${node.title}". Другие узлы: ${others.map(n=>`"${n.id}:${n.title}"`).join(", ")}.
Верни JSON массив связей для этого узла: [{"from":"${node.id}","to":"id2","type":"requires|affects|blocks|follows"}]
Максимум 3 связи, только логичные. ТОЛЬКО JSON.`;
    try{
      const raw=await callAI([{role:"user",content:prompt}],"Верни только JSON массив.",400);
      const arr=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const valid=arr.filter(e=>e.from&&e.to&&e.from!==e.to&&allNodes.find(n=>n.id===e.to||n.id===e.from));
      const toAdd=valid.filter(ne=>!allEdges.find(ex=>(ex.source===ne.from&&ex.target===ne.to)||(ex.from===ne.from&&ex.to===ne.to)));
      if(toAdd.length>0){
        // Push edges up via callback - we signal it via onConnect with special flag
        toAdd.forEach(e=>{
          onConnect&&onConnect({source:e.from,target:e.to,type:e.type||"requires"});
        });
      }
    }catch{}
    setAutoConnLoading(false);
  }

  const iS={width:"100%",padding:"7px 10px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",resize:"none"};
  const connCount=allEdges.filter(e=>(e.source||e.from)===node.id||(e.target||e.to)===node.id).length;
  const tabs=[["info","◈ Инфо"],["comments",`💬${comments.length?" "+comments.length:""}`],["connections",`⇄${connCount?" "+connCount:""}`],["history",`⏱${history.length?" "+history.length:""}`]];

  return(
    <div style={{position:"absolute",right:0,top:0,bottom:0,width:290,background:"var(--bg2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:40,boxShadow:"-8px 0 30px rgba(0,0,0,.3)",animation:"slideRight .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{width:8,height:8,borderRadius:2,background:STATUS[node.status]?.c||"#6366f1",flexShrink:0}}/>
        <div style={{flex:1,fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{node.title||"Без названия"}</div>
        {onScrollTo&&<button onClick={()=>onScrollTo(node)} title="Найти на карте" style={{width:24,height:24,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>↗</button>}
        <button onClick={onClose} style={{width:24,height:24,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",flexShrink:0,overflowX:"auto"}}>
        {tabs.map(item=>{
          const k=item[0],lbl=item[1];
          return <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px 4px",border:"none",background:"transparent",color:tab===k?"var(--text)":"var(--text4)",fontSize:13.5,fontWeight:tab===k?700:500,cursor:"pointer",borderBottom:tab===k?"2px solid #6366f1":"2px solid transparent",whiteSpace:"nowrap",minWidth:0}}>{lbl}</button>;
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                Название
                {!readOnly&&<button onClick={aiRephrase} disabled={aiRephrLoading} style={{fontSize:12.5,padding:"1px 6px",borderRadius:4,border:"1px solid var(--border)",background:"var(--surface)",color:aiRephrLoading?"var(--text4)":"#818cf8",cursor:aiRephrLoading?"wait":"pointer"}}>{aiRephrLoading?"✦…":"✨ AI"}</button>}
              </div>
              <textarea value={node.title||""} onChange={e=>!readOnly&&onUpdate({title:e.target.value})} rows={2} style={iS} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("why_label","Зачем?")}</div>
              <textarea value={node.reason||""} onChange={e=>!readOnly&&onUpdate({reason:e.target.value})} rows={2} style={iS} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("metric_label","Метрика успеха")}</div>
              <input value={node.metric||""} onChange={e=>!readOnly&&onUpdate({metric:e.target.value})} style={{...iS,resize:undefined}} readOnly={readOnly}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("status","Статус")}</div>
                <CustomSelect
                  value={node.status||"planning"}
                  onChange={v=>!readOnly&&onUpdate({status:v})}
                  disabled={readOnly}
                  style={{width:"100%"}}
                  options={Object.entries(STATUS).map(([k,s])=>({value:k,label:s.label,dot:s.c}))}
                />
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("priority","Приоритет")}</div>
                <CustomSelect
                  value={node.priority||"medium"}
                  onChange={v=>!readOnly&&onUpdate({priority:v})}
                  disabled={readOnly}
                  style={{width:"100%"}}
                  options={Object.entries(PRIORITY).map(([k,p])=>({value:k,label:p.label,dot:p.c}))}
                />
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                Прогресс <span style={{color:"#6366f1",fontWeight:800}}>{node.progress||0}%</span>
              </div>
              <input type="range" min={0} max={100} value={node.progress||0} onChange={e=>!readOnly&&onUpdate({progress:+e.target.value})} style={{width:"100%",accentColor:"#6366f1"}} disabled={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("node_deadline","Дедлайн")}</div>
              <input type="date" value={node.deadline||""} onChange={e=>!readOnly&&onUpdate({deadline:e.target.value})} style={{...iS,resize:undefined}} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{t("tags_label","Теги")}</div>
              <input value={(node.tags||[]).join(", ")} onChange={e=>!readOnly&&onUpdate({tags:e.target.value.split(",").map(tc=>tc.trim()).filter(Boolean)})} placeholder="тег1, тег2…" style={{...iS,resize:undefined}} readOnly={readOnly}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{t("node_color_label","Цвет узла")}</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {COLORS.map((c,i)=>(
                  <div key={i} onClick={()=>!readOnly&&onUpdate({color:c})} style={{width:18,height:18,borderRadius:4,background:c||"var(--surface2)",border:(node.color||"")===(c)?"2px solid var(--text)":"1px solid var(--border)",cursor:readOnly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"var(--text5)"}}>
                    {!c&&"∅"}
                  </div>
                ))}
              </div>
            </div>
            {!readOnly&&(
              <div style={{display:"flex",gap:6,paddingTop:4}}>
                {onConnect&&<button onClick={()=>onConnect({startNode:node})} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid rgba(99,102,241,.3)",background:"rgba(99,102,241,.06)",color:"#818cf8",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("link_btn","⇒ Связать")}</button>}
                <button onClick={doAutoConnect} disabled={autoConnLoading} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid rgba(99,102,241,.25)",background:"rgba(99,102,241,.06)",color:autoConnLoading?"var(--text4)":"#818cf8",cursor:autoConnLoading?"wait":"pointer",fontSize:13,fontWeight:600}}>{autoConnLoading?"✦…":"✦ AI-связи"}</button>
                <button onClick={()=>onDelete(node.id)} style={{padding:"7px 9px",borderRadius:8,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#ef4444",cursor:"pointer",fontSize:13}}>🗑</button>
              </div>
            )}
          </div>
        )}
        {tab==="comments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {comments.length===0&&<div style={{padding:"20px",textAlign:"center",color:"var(--text5)",fontSize:13,border:"1px dashed var(--border2)",borderRadius:8}}>{t("no_comments2","Нет комментариев.")}<br/><span style={{fontSize:13}}>{t("use_ai_comment","Используйте @AI чтобы задать вопрос AI.")}</span></div>}
            {comments.map(c=>(
              <div key={c.id} style={{padding:"9px 11px",borderRadius:9,background:c.isAI?"rgba(99,102,241,.06)":"var(--surface)",border:`1px solid ${c.isAI?"rgba(99,102,241,.2)":"var(--border)"}`,position:"relative"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:c.isAI?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:c.isAI?"#fff":"var(--text4)",fontWeight:700,flexShrink:0}}>{c.isAI?"✦":(c.author||"?")[0].toUpperCase()}</div>
                  <div style={{fontSize:13.5,fontWeight:700,color:c.isAI?"#818cf8":"var(--text3)"}}>{c.author}</div>
                  <div style={{fontSize:12,color:"var(--text5)",marginLeft:"auto"}}>{new Date(c.at).toLocaleString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                  {!readOnly&&!c.isAI&&<button onClick={()=>onUpdate({comments:comments.filter(x=>x.id!==c.id)})} style={{width:16,height:16,borderRadius:4,border:"none",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
                </div>
                <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{c.text}</div>
                {c.text==="…"&&aiCommentLoading&&<div style={{display:"flex",gap:3,marginTop:4}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>}
              </div>
            ))}
            {!readOnly&&(
              <div style={{marginTop:4,borderTop:"1px solid var(--border)",paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Комментарий… или @AI вопрос (Ctrl+Enter)" rows={2} onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();addComment();}}} style={{...iS,lineHeight:1.5}}/>
                <button onClick={addComment} disabled={!newComment.trim()||aiCommentLoading} style={{padding:"7px",borderRadius:8,border:"none",background:newComment.trim()&&!aiCommentLoading?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface2)",color:newComment.trim()&&!aiCommentLoading?"#fff":"var(--text4)",fontSize:13,cursor:newComment.trim()&&!aiCommentLoading?"pointer":"not-allowed",fontWeight:600}}>{aiCommentLoading?"AI отвечает…":"Отправить"}</button>
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
                          <div style={{flex:1,fontSize:13,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{other?.title||"Удалён"}</div>
                          <div style={{fontSize:12,color:et.c,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{et.label}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return(
                <React.Fragment>
                  <ConnSection title={`→ Исходящие (${outgoing.length})`} edges={outgoing}/>
                  <ConnSection title={`← Входящие (${incoming.length})`} edges={incoming}/>
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
                  <span style={{fontSize:13.5,fontWeight:700,color:h.type==="ai_rephrase"?"#818cf8":"var(--text3)"}}>{h.type==="ai_rephrase"?"✦ AI переформулировал":"✏️ Изменено"}</span>
                  <span style={{fontSize:12,color:"var(--text5)",marginLeft:"auto"}}>{new Date(h.at).toLocaleString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div style={{fontSize:13,color:"var(--text4)",marginBottom:3}}>Автор: {h.by}</div>
                {h.before?.title&&<div style={{fontSize:13,color:"var(--text5)",padding:"3px 7px",background:"rgba(239,68,68,.04)",borderRadius:5,borderLeft:"2px solid rgba(239,68,68,.3)",marginBottom:2}}>До: {h.before.title}</div>}
                {h.after?.title&&<div style={{fontSize:13,color:"var(--text3)",padding:"3px 7px",background:"rgba(16,185,129,.04)",borderRadius:5,borderLeft:"2px solid rgba(16,185,129,.3)"}}>После: {h.after.title}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AiPanel ──
function AiPanel({nodes,edges,ctx,tier,onAddNode,onClose,externalMsgs=[],onClearExternal}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const tierCfg=AI_TIER[tier]||AI_TIER.free;
  const[msgs,setMsgs]=useState([]);
  const[inp,setInp]=useState("");
  const[load,setLoad]=useState(false);
  const endRef=useRef(null);

  // Inject external messages (e.g. from autoConnect)
  useEffect(()=>{
    if(externalMsgs&&externalMsgs.length>0){
      setMsgs(m=>[...m,...externalMsgs.map(em=>({role:"ai",text:em.content}))]);
      onClearExternal&&onClearExternal();
    }
  },[externalMsgs]);

  useEffect(()=>{
    const greetings={
      free:"Привет! Я базовый AI-советник. Могу ответить на простые вопросы по стратегии.",
      starter:"Привет! Я ваш стратегический помощник. Анализирую карту и помогаю с первыми шагами.",
      pro:"Привет! Я AI-советник (Pro). Анализирую карту системно: SWOT, OKR, риски, приоритеты.",
      team:"Добрый день. Я ваш стратегический партнёр (Team). Готов провести глубокий анализ на уровне McKinsey.",
      enterprise:"Добрый день. Я — коллегиум из четырёх экспертов (Enterprise). Провожу стратегический, финансовый, инвестиционный и операционный анализ одновременно.",
    };
    setMsgs([{role:"ai",text:greetings[tier]||greetings.free}]);
  },[tier]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const quickByTier={
    free:["Что добавить?","Главные риски?","Следующий шаг?"],
    starter:["Проанализируй карту","Найди риски","Предложи шаги"],
    pro:["Полный анализ","Найди узкие места","Риски и контрмеры","Приоритизируй"],
    team:["Стратегический аудит","Конкурентный анализ","Unit economics","Точки масштабирования","Сценарии роста"],
    enterprise:["Executive audit","BCG анализ","OKR для карты","Blue Ocean","Due diligence угол"],
  };
  const quick=quickByTier[tier]||quickByTier.free;

  async function send(text){
    const q=text||inp.trim();
    if(!q||load)return;
    setInp("");
    const nM=[...msgs,{role:"user",text:q}];
    setMsgs(nM);
    setLoad(true);
    const mapSummary=nodes.map(n=>`${n.title}(${STATUS[n.status]?.label||n.status},${n.progress||0}%,${PRIORITY[n.priority]?.label||n.priority})`).join("; ");
    const sys=tierCfg.system(ctx||"",mapSummary);
    try{
      const history=nM.slice(-10).map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text}));
      const reply=await callAI(history,sys,1200);
      // Parse <ADD> tags for new nodes
      const addMatch=reply.match(/<ADD>([\s\S]*?)<\/ADD>/);
      let displayReply=reply.replace(/<ADD>[\s\S]*?<\/ADD>/g,"").trim();
      setMsgs(m=>[...m,{role:"ai",text:displayReply}]);
      if(addMatch&&onAddNode){
        try{
          const nodeData=JSON.parse(addMatch[1]);
          onAddNode(nodeData);
          setMsgs(m=>[...m,{role:"sys",text:"✅ Шаг добавлен на карту: "+nodeData.title}]);
        }catch{}
      }
    }catch(e:any){
      const msg=e?.message||"Ошибка подключения. Проверьте сеть.";
      setMsgs(m=>[...m,{role:"ai",text:msg}]);
    }
    setLoad(false);
  }

  return(
    <div style={{position:"absolute",right:0,top:0,bottom:0,width:320,background:"var(--bg2)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:45,boxShadow:"-8px 0 30px rgba(0,0,0,.35)",animation:"slideRight .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"11px 13px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)"}}>{t("ai_consultant","AI Советник")}</div>
          <div style={{fontSize:13,color:tierCfg.color||"#10b981",fontWeight:600}}>{tierCfg.badge} {tierCfg.label}</div>
        </div>
        <button onClick={()=>setMsgs([{role:"ai",text:"Чат очищен."}])} style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>✕</button>
        <button onClick={onClose} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
      </div>
      <div style={{padding:"8px 10px",borderBottom:"1px solid var(--border)",display:"flex",gap:5,flexWrap:"wrap",flexShrink:0}}>
        {quick.map(q=>(
          <button key={q} onClick={()=>send(q)} style={{padding:"4px 9px",borderRadius:16,border:"1px solid rgba(99,102,241,.25)",background:"rgba(99,102,241,.06)",color:"#818cf8",cursor:"pointer",fontSize:13.5,fontWeight:600}}>{q}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 11px",display:"flex",flexDirection:"column",gap:9}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":m.role==="sys"?"center":"flex-start",gap:7,alignItems:"flex-start"}}>
            {m.role==="ai"&&<div style={{width:20,height:20,borderRadius:6,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginTop:2}}>✦</div>}
            <div style={{maxWidth:"88%",padding:"8px 11px",borderRadius:m.role==="user"?"11px 11px 3px 11px":m.role==="sys"?"8px":"3px 11px 11px 11px",background:m.role==="user"?"rgba(99,102,241,.15)":m.role==="sys"?"rgba(16,185,129,.08)":"var(--surface)",border:`1px solid ${m.role==="user"?"rgba(99,102,241,.25)":m.role==="sys"?"rgba(16,185,129,.2)":"var(--border)"}`,fontSize:13,lineHeight:1.65,color:m.role==="sys"?"#10b981":"var(--text)",whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
        {load&&<div style={{display:"flex",gap:7,alignItems:"center"}}><div style={{width:20,height:20,borderRadius:6,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✦</div><div style={{display:"flex",gap:4,padding:"8px 11px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"3px 11px 11px 11px"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"9px 11px",borderTop:"1px solid var(--border)",display:"flex",gap:7,flexShrink:0}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={t("ask_placeholder","Спросите о стратегии…")} style={{flex:1,padding:"8px 11px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:9,color:"var(--text)",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
        <button onClick={()=>send()} disabled={!inp.trim()||load} style={{width:34,height:34,borderRadius:9,border:"none",background:inp.trim()&&!load?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface)",color:inp.trim()&&!load?"#fff":"var(--text4)",cursor:inp.trim()&&!load?"pointer":"not-allowed",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
      </div>
    </div>
  );
}


// ── EdgeLine ──
function EdgeLine({edge,nodes,selected,onClick}){
  const{t}=useLang();
  const ETYPE=getETYPE(t);
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
    <g onClick={e=>{e.stopPropagation();onClick(edge);}}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{cursor:"pointer"}}/>
      <path d={d} fill="none" stroke={selected?"#6366f1":et.c} strokeWidth={selected?2.5:1.5} strokeDasharray={et.d==="none"?"none":et.d} opacity={selected?1:.65} style={{transition:"stroke .15s,opacity .15s"}}/>
      <polygon points="-5,-3 5,0 -5,3" fill={selected?"#6366f1":et.c} transform={`translate(${ep.x},${ep.y}) rotate(${ang})`} opacity={selected?1:.7}/>
      {edge.label&&<text x={bmx} y={bmy-6} textAnchor="middle" fontSize={9.5} fill="var(--text3)" style={{pointerEvents:"none",userSelect:"none"}}>{edge.label}</text>}
    </g>
  );
}

// ── NodeCard ──
function NodeCard({node,selected,connecting,connectSource,onClick,onMouseDown,theme}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
  const PRIORITY=getPRIORITY(t);
  const st=STATUS[node.status]||STATUS.planning;
  const pr=PRIORITY[node.priority]||PRIORITY.medium;
  const isLight=theme==="light";
  const bg=node.color?node.color+(isLight?"22":"18"):(isLight?"#ffffff":"var(--node-bg)");
  const titleColor=selected?"#6366f1":isLight?"#0f172a":"#e2e8f0";
  const reasonColor=isLight?"#475569":"#64748b";
  const statusColor=isLight?"#334155":"#475569";
  const progressTrack=isLight?"rgba(0,0,0,.07)":"rgba(255,255,255,.06)";
  const tagBg=isLight?"rgba(99,102,241,.1)":"rgba(99,102,241,.1)";
  const tagColor=isLight?"#4338ca":"#818cf8";
  const isOverdue=node.deadline&&new Date(node.deadline)<new Date()&&node.status!=="completed";
  const isConnSrc=connecting&&connectSource?.id===node.id;
  const commentCount=(node.comments||[]).length;
  const progress=node.progress||0;
  const progressW=Math.max(0,progress/100*204);
  const title=(node.title||"Новый шаг").slice(0,26);
  const hasMeta=node.reason||node.metric;
  const reasonY=hasMeta?40:null;
  const metricY=node.reason&&node.metric?55:node.metric?40:null;
  const progressY=hasMeta?70:40;
  const statusY=progressY+16;
  const tagsY=statusY+16;
  return(
    <g className="node-card" transform={`translate(${node.x},${node.y})`} onClick={e=>{e.stopPropagation();onClick(node);}} onMouseDown={e=>onMouseDown(e,node)} style={{cursor:connecting?"crosshair":"grab"}}>
      {selected&&<rect x={-1} y={1} width={242} height={130} rx={13} fill={`rgba(99,102,241,${isLight?.1:.18})`} style={{filter:"blur(8px)"}}/>}
      <rect width={240} height={128} rx={12} fill={bg}
        stroke={selected?"#6366f1":isConnSrc?"#10b981":isOverdue?"#ef4444":isLight?(node.color||"rgba(0,0,0,.15)"):(node.color||"rgba(255,255,255,.1)")}
        strokeWidth={selected||isConnSrc||isOverdue?2:1}
        filter={selected?"url(#glow)":"none"}/>
      {selected&&<rect width={240} height={128} rx={12} fill="rgba(99,102,241,.04)"/>}
      <rect x={0} y={0} width={4} height={128} rx={2} fill={st.c}/>
      <rect x={160} y={7} width={74} height={16} rx={8} fill={`${pr.c}18`} stroke={`${pr.c}40`} strokeWidth={1}/>
      <circle cx={171} cy={15} r={3} fill={pr.c}/>
      <text x={177} y={15} fontSize={9} fontWeight={700} fill={pr.c} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>{pr.label}</text>
      <text x={14} y={23} fontSize={12} fontWeight={800} fill={titleColor} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>
        {title}{(node.title||"").length>26?"…":""}
      </text>
      {node.reason&&(
        <text x={14} y={reasonY} fontSize={9.5} fill={reasonColor} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>
          {node.reason.slice(0,34)}{node.reason.length>34?"…":""}
        </text>
      )}
      {node.metric&&(
        <text x={14} y={metricY} fontSize={9.5} fill={isLight?"#6366f1":"#818cf8"} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>
          ◈ {node.metric.slice(0,28)}{node.metric.length>28?"…":""}
        </text>
      )}
      <rect x={14} y={progressY} width={212} height={5} rx={2.5} fill={progressTrack}/>
      {progress>0&&<rect x={14} y={progressY} width={Math.min(212,progressW)} height={5} rx={2.5} fill={node.status==="completed"?"#10b981":st.c} opacity={.85}/>}
      {progress>0&&(
        <text x={228} y={progressY+2.5} fontSize={8} fontWeight={700} fill={st.c} textAnchor="end" style={{fontFamily:"'JetBrains Mono',monospace",dominantBaseline:"middle"}}>{progress}%</text>
      )}
      <circle cx={14} cy={statusY} r={3.5} fill={st.c}/>
      <text x={23} y={statusY} fontSize={9} fill={statusColor} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>{st.label}</text>
      {isOverdue&&(
        <>
          <rect x={110} y={statusY-7} width={60} height={14} rx={4} fill="rgba(239,68,68,.15)"/>
          <text x={140} y={statusY} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#ef4444" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>⚠ просрочено</text>
        </>
      )}
      {node.deadline&&!isOverdue&&(
        <text x={236} y={statusY} fontSize={8} fill={isLight?"#64748b":"#334155"} textAnchor="end" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>📅 {node.deadline}</text>
      )}
      <g transform={`translate(14,${tagsY})`}>
        {(node.tags||[]).slice(0,2).map((tag,i)=>(
          <g key={i} transform={`translate(${i*76},0)`}>
            <rect width={70} height={13} rx={6} fill={tagBg}/>
            <text x={6} y={6.5} fontSize={8} fill={tagColor} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>{tag.slice(0,9)}</text>
          </g>
        ))}
        {commentCount>0&&(
          <g transform="translate(194,0)">
            <rect width={32} height={13} rx={6} fill={tagBg}/>
            <text x={5} y={6.5} fontSize={8} fill={tagColor} style={{fontFamily:"'Plus Jakarta Sans',sans-serif",dominantBaseline:"middle"}}>💬 {commentCount}</text>
          </g>
        )}
      </g>
      {isConnSrc&&<rect x={-2} y={-2} width={244} height={132} rx={13} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="6,3" opacity={.8}/>}
    </g>
  );
}

// ── GanttView ──
function GanttView({nodes,onClose}){
  const{t,lang}=useLang();
  const STATUS=getSTATUS(t);
  const withDates=nodes.filter(n=>n.deadline);
  const now=new Date();
  if(withDates.length===0)return(
    <div style={{position:"absolute",bottom:70,left:"50%",transform:"translateX(-50%)",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 22px",zIndex:30,boxShadow:"0 20px 60px rgba(0,0,0,.5)",textAlign:"center",minWidth:280}}>
      <div style={{fontSize:22,marginBottom:6}}>📅</div>
      <div style={{fontSize:13,fontWeight:700,color:"var(--text3)"}}>{t("no_deadlines","Нет дедлайнов")}</div>
      <div style={{fontSize:13.5,color:"var(--text5)",marginBottom:12}}>{t("gantt_hint","Добавьте дедлайны к шагам в редакторе")}</div>
      <button onClick={onClose} style={{padding:"6px 16px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{t("close","Закрыть")}</button>
    </div>
  );
  const sorted=[...withDates].sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const minDate=new Date(sorted[0].deadline);
  const maxDate=new Date(sorted[sorted.length-1].deadline);
  const range=Math.max(1,(maxDate-minDate)/864e5);

  return(
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:220,background:"var(--bg2)",borderTop:"1px solid var(--border)",zIndex:30,display:"flex",flexDirection:"column",animation:"slideUp .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{t("gantt","📅 Gantt")}</span>
        <span style={{fontSize:13.5,color:"var(--text5)",flex:1}}>{t("steps_with_deadlines","{n} шагов с дедлайнами").replace("{n}",String(sorted.length))}</span>
        <button onClick={onClose} style={{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"auto",padding:"8px 14px"}}>
        {sorted.map(n=>{
          const st=STATUS[n.status]||STATUS.planning;
          const dl=new Date(n.deadline);
          const daysFromStart=Math.max(0,(dl-minDate)/864e5);
          const pct=Math.min(100,(daysFromStart/range)*100);
          const isPast=dl<now;
          const daysLeft=Math.ceil((dl-now)/864e5);
          return(
            <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,minWidth:500}}>
              <div style={{width:130,fontSize:13.5,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0,fontWeight:600}} title={n.title}>{n.title}</div>
              <div style={{flex:1,height:20,background:"var(--surface)",borderRadius:4,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.max(2,n.progress||0)}%`,background:st.c+"55",borderRadius:4}}/>
                <div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:8,height:8,borderRadius:2,background:isPast?"#ef4444":st.c}}/>
              </div>
              <div style={{width:80,fontSize:13,color:isPast?"#ef4444":daysLeft<=7?"#f59e0b":"var(--text4)",textAlign:"right",flexShrink:0,fontWeight:isPast||daysLeft<=7?700:400}}>
                {isPast?t("days_overdue","просрочено {n}д.").replace("{n}",String(-daysLeft)):daysLeft===0?t("today","Сегодня"):daysLeft===1?t("tomorrow_label","завтра"):t("days_left","{n}д.").replace("{n}",String(daysLeft))}
              </div>
            </div>
          );
        })}
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
    <div style={{background:"linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.15))",borderBottom:"1px solid rgba(99,102,241,.25)",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:13}}>
      <span style={{color:"#818cf8",fontWeight:600}}>⚡ {t("trial_active","Пробный период активен")} — {daysLeft} {t("trial_days_left","дней осталось")}</span>
      <button onClick={onUpgrade} style={{padding:"4px 14px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t("upgrade","Улучшить →")}</button>
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
      <span style={{color:"#f59e0b",fontWeight:600}}>✉️ {t("verify_email_banner","Подтвердите ваш email для полного доступа.")}</span>
      {sent?(
        <span style={{color:"#10b981",fontWeight:600,fontSize:12}}>{t("verify_email_sent","Письмо отправлено! Проверьте почту.")}</span>
      ):(
        <button onClick={resend} disabled={loading} style={{padding:"4px 14px",borderRadius:7,border:"1px solid rgba(245,158,11,.4)",background:"rgba(245,158,11,.1)",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:loading?"wait":"pointer"}}>
          {loading?"…":t("verify_email_resend","Отправить письмо")}
        </button>
      )}
    </div>
  );
}

// ── DeadlineReminders ── (показывается если есть шаги с дедлайном в ближайшие 3 дня)
function DeadlineReminders({nodes,onGoToNode}:{nodes:any[],onGoToNode:(id:string)=>void}){
  const{t}=useLang();
  const[show,setShow]=useState(true);
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
  if(!show||all.length===0)return null;
  return(
    <div style={{position:"fixed",bottom:80,right:20,zIndex:350,width:280,background:"var(--surface)",border:"1px solid rgba(245,158,11,.35)",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.3)",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid var(--border)",background:"rgba(245,158,11,.08)"}}>
        <span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>⏰ {t("deadline_reminder","Напоминания")}</span>
        <button onClick={()=>setShow(false)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:16}}>✕</button>
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
            <div style={{fontSize:11,color:isOverdue?"#ef4444":"#f59e0b",fontWeight:600}}>
              {isOverdue?t("days_overdue","просрочено {n}д.").replace("{n}",String(Math.abs(diff))):t("days_left","{n}д.").replace("{n}",String(diff))+" · "+n.deadline}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── VersionHistoryModal ──
function VersionHistoryModal({mapId,projectId,onRestore,onClose,theme="dark"}:{mapId:string,projectId:string,onRestore:(v:any)=>void,onClose:()=>void,theme?:string}){
  const{t}=useLang();
  const[versions,setVersions]=useState<any[]>([]);const[loading,setLoading]=useState(false);const[restoring,setRestoring]=useState<string|null>(null);
  useEffect(()=>{
    if(!API_BASE)return;
    setLoading(true);
    apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions`).then(d=>setVersions(d.versions||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[mapId]);
  async function restore(v:any){
    if(!confirm(t("restore_confirm","Восстановить эту версию? Текущие данные будут заменены.")))return;
    setRestoring(v.id);
    if(API_BASE){
      try{await apiFetch(`/api/projects/${projectId}/maps/${mapId}/versions/${v.id}/restore`,{method:"POST"});}
      catch(e:any){alert(e.message);setRestoring(null);return;}
    }
    onRestore(v);setRestoring(null);onClose();
  }
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(8px)"}}>
      <div style={{background:"var(--surface)",borderRadius:18,width:"min(480px,94vw)",maxHeight:"80vh",display:"flex",flexDirection:"column",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>📜 {t("version_history","История версий")}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:20}}>✕</button>
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
              <button onClick={()=>restore(v)} disabled={restoring===v.id} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:restoring===v.id?.6:1}}>
                {restoring===v.id?"…":t("restore_version","Восстановить")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── XSS-safe text sanitizer ──
function sanitize(str:string|undefined|null):string{
  if(!str)return"";
  return String(str).replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ── WeeklyBriefingModal ──
function WeeklyBriefingModal({nodes,mapName,user,onClose,theme="dark"}:{nodes:any[],mapName:string,user:any,onClose:()=>void,theme?:string}){
  const{t,lang}=useLang();
  const[loading,setLoading]=useState(false);
  const[summary,setSummary]=useState("");
  const done=nodes.filter((n:any)=>n.status==="completed");
  const blocked=nodes.filter((n:any)=>n.status==="blocked");
  const critical=nodes.filter((n:any)=>n.priority==="critical"&&n.status!=="completed");
  const health=nodes.length>0?Math.round((done.length/nodes.length)*100):0;

  useEffect(()=>{
    setLoading(true);
    const ctx=`Карта: ${mapName}. Всего шагов: ${nodes.length}. Выполнено: ${done.length}. Заблокировано: ${blocked.length}. Критичных незавершённых: ${critical.length}. Health score: ${health}%. Шаги: ${nodes.slice(0,10).map((n:any)=>`${n.title}(${n.status})`).join(", ")}`;
    callAI([{role:"user",content:`Дай краткий еженедельный брифинг по стратегии (3-4 предложения). ${ctx}`}],
      `Ты AI-советник. Дай краткий профессиональный еженедельный брифинг: что сделано, что заблокировано, главная рекомендация на следующую неделю. Без списков, только текст.`,200)
      .then(r=>setSummary(r)).catch(()=>setSummary(t("weekly_briefing_err","Не удалось получить AI-анализ."))).finally(()=>setLoading(false));
  },[]);

  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:310,backdropFilter:"blur(8px)"}}>
      <div style={{background:"var(--surface)",borderRadius:20,width:"min(520px,94vw)",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,.5)",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))",padding:"22px 26px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>📋 {t("weekly_briefing","Еженедельный брифинг")}</div>
            <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>{mapName} · {new Date().toLocaleDateString(lang==="uz"?"uz-UZ":lang==="en"?"en-US":"ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          {/* Метрики */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:t("total_steps","Всего"),value:nodes.length,color:"#6366f1"},
              {label:t("done","Выполнено"),value:done.length,color:"#10b981"},
              {label:t("blocked","Заблокировано"),value:blocked.length,color:"#ef4444"},
              {label:"Health",value:`${health}%`,color:health>=70?"#10b981":health>=40?"#f59e0b":"#ef4444"},
            ].map(m=>(
              <div key={m.label} style={{textAlign:"center",padding:"12px 8px",borderRadius:12,background:"var(--bg2)",border:"1px solid var(--border)"}}>
                <div style={{fontSize:22,fontWeight:800,color:m.color}}>{m.value}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:3,fontWeight:600}}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* AI-саммари */}
          <div style={{padding:"16px 18px",borderRadius:12,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",minHeight:80}}>
            <div style={{fontSize:12,fontWeight:700,color:"#818cf8",marginBottom:8}}>✦ AI-анализ</div>
            {loading?(
              <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--text3)",fontSize:13}}>
                <div style={{width:16,height:16,border:"2px solid #6366f1",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                Анализирую карту…
              </div>
            ):(
              <p style={{fontSize:13,color:"var(--text)",lineHeight:1.65,margin:0}}>{summary}</p>
            )}
          </div>
          {/* Критичные шаги */}
          {critical.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#f87171",marginBottom:8}}>⚠️ Критичные незавершённые шаги</div>
              {critical.slice(0,3).map((n:any)=>(
                <div key={n.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:9,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",marginBottom:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{n.title}</span>
                  {n.deadline&&<span style={{marginLeft:"auto",fontSize:11,color:"#f87171"}}>{n.deadline}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:"0 26px 20px",display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onClose} style={{padding:"10px 22px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("close","Закрыть")}</button>
        </div>
      </div>
    </div>
  );
}

// ── MapEditor ──
function MapEditor({user,mapData,project,onBack,isNew,onProfile,onToggleTheme,theme,readOnly=false}){
  const{t,lang}=useLang();
  const STATUS=getSTATUS(t);
  const ETYPE=getETYPE(t);
  const[nodes,setNodes]=useState(mapData?.nodes||defaultNodes());
  const[edges,setEdges]=useState(mapData?.edges||[]);
  const[selNode,setSelNode]=useState(null);
  const[selEdge,setSelEdge]=useState(null);
  const[showAI,setShowAI]=useState(false);
  const[showStats,setShowStats]=useState(false);
  const[connecting,setConnecting]=useState(false);
  const[connectSrc,setConnectSrc]=useState(null);
  const[showMini,setShowMini]=useState(true);
  const[search,setSearch]=useState("");
  const[pendingAiMsgs,setPendingAiMsgs]=useState([]);
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
  const W=typeof window!=="undefined"?window.innerWidth:1400;
  const H=typeof window!=="undefined"?window.innerHeight:900;

  function addToast(msg:string,type="info"){
    const id=uid();
    setToasts((t:any[])=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts((t:any[])=>t.filter((x:any)=>x.id!==id)),2600);
  }
  function pushUndo(n:any,e:any){setUndoStack((s:any[])=>[...s.slice(-29),{nodes:n,edges:e}]);setRedoStack([]);}

  // Флаг: текущее изменение nodes/edges пришло от удалённого коллеги (не сохраняем локально)
  const remoteUpdateRef=useRef(false);

  // ── WebSocket: подключаемся если есть API и карта имеет ID ──
  useEffect(()=>{
    if(!API_BASE||!mapData?.id||!user||readOnly)return;
    let socket:any;
    try{
      const io=(window as any).io;
      if(!io){return;}
      const token=getJWT();
      socket=io(API_BASE,{transports:["websocket","polling"],auth:{token}});
      socketRef.current=socket;
      socket.emit("join-map",{mapId:mapData.id,userName:user.name||user.email});
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

  // Трансляция перемещения узла через WebSocket
  function emitNodeMove(nodeId:string,x:number,y:number){
    socketRef.current?.emit("node-move",{mapId:mapData?.id,nodeId,x,y});
  }
  function emitNodeUpdate(node:any){
    socketRef.current?.emit("node-update",{mapId:mapData?.id,node});
  }
  function emitEdgeUpdate(edges:any[]){
    socketRef.current?.emit("edge-update",{mapId:mapData?.id,edges});
  }
  function undo(){if(!undoStack.length)return;const prev=undoStack[undoStack.length-1];setRedoStack(r=>[...r,{nodes,edges}]);setNodes(prev.nodes);setEdges(prev.edges);setUndoStack(s=>s.slice(0,-1));}
  function redo(){if(!redoStack.length)return;const next=redoStack[redoStack.length-1];setUndoStack(s=>[...s,{nodes,edges}]);setNodes(next.nodes);setEdges(next.edges);setRedoStack(r=>r.slice(0,-1));}

  function updateNode(n){pushUndo(nodes,edges);setNodes(ns=>ns.map(x=>x.id===n.id?n:x));}
  function deleteNode(id){pushUndo(nodes,edges);setNodes(ns=>ns.filter(x=>x.id!==id));setEdges(es=>es.filter(e=>e.source!==id&&e.target!==id));setSelNode(null);}
  function duplicateNode(n){const copy={...n,id:uid(),x:n.x+60,y:n.y+60,title:n.title+" (копия)"};pushUndo(nodes,edges);setNodes(ns=>[...ns,copy]);}
  function importJSON(){importRef.current?.click();}
  function handleImportFile(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(d.nodes||d.edges){
          pushUndo(nodes,edges);
          setNodes((d.nodes||[]).map(n=>({...n,comments:n.comments||[],history:n.history||[]})));
          setEdges(d.edges||[]);
          setTimeout(fitView,100);
          addToast(t("imported_steps","✅ Импортировано: {n} шагов").replace("{n}",String((d.nodes||[]).length)),"success");
        }else addToast(t("json_invalid","Некорректный формат JSON"),"error");
      }catch{addToast(t("file_read_err","Ошибка чтения файла"),"error");}
      e.target.value="";
    };
    r.readAsText(f);
  }

  function addNode(){
    const x=snap((-viewRef.current.x/viewRef.current.zoom)+W/viewRef.current.zoom/2-120);
    const y=snap((-viewRef.current.y/viewRef.current.zoom)+H/viewRef.current.zoom/2-64);
    const n={id:uid(),x,y,title:t("new_step_title","Новый шаг"),reason:"",metric:"",status:"planning",priority:"medium",progress:0,tags:[],color:""};
    pushUndo(nodes,edges);setNodes(ns=>[...ns,n]);setSelNode(n);
  }

  async function exportPNG(){
    if(!svgRef.current||exporting)return;
    setExporting(true);
    try{
      const svg=svgRef.current;
      const svgClone=svg.cloneNode(true);
      const isDark=theme!=="light";
      const bg=isDark?"#070b14":"#f4f6fb";
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
<style>@page{margin:20mm 15mm}body{font-family:'Segoe UI',Arial,sans-serif;padding:0;color:#1e293b;font-size:13px}
h1{font-size:22px;font-weight:700;color:#1e293b;margin:0 0 6px}
.meta{color:#64748b;font-size:12px;margin-bottom:20px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #e2e8f0;padding:8px 11px;text-align:left}
th{background:#f1f5f9;font-weight:600;font-size:12px}
tr:nth-child(even){background:#f8fafc}
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

  function exportPPTX(){
    // Генерируем HTML-страницу с "слайдами" для печати в PPTX через браузер
    const title=sanitize(mapData?.name||project?.name||"Strategy Map");
    const date=new Date().toLocaleDateString("ru-RU");
    const statusColors:Record<string,string>={completed:"#10b981",active:"#6366f1",planning:"#64748b",paused:"#f59e0b",blocked:"#ef4444"};
    const prioColors:Record<string,string>={critical:"#ef4444",high:"#f59e0b",medium:"#6366f1",low:"#94a3b8"};

    const slides=nodes.map((n:any,i:number)=>`
      <div class="slide">
        <div class="slide-num">${i+1} / ${nodes.length}</div>
        <div class="slide-tag" style="background:${statusColors[n.status]||"#64748b"}20;color:${statusColors[n.status]||"#64748b"};border:1px solid ${statusColors[n.status]||"#64748b"}40">${n.status||"planning"}</div>
        <div class="prio-tag" style="background:${prioColors[n.priority]||"#64748b"}20;color:${prioColors[n.priority]||"#64748b"}">${n.priority||"medium"}</div>
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
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;margin:0;padding:0}
.title-slide{width:297mm;height:210mm;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e293b,#0f172a);page-break-after:always}
.title-slide h1{font-size:42px;font-weight:800;color:#fff;margin:0 0 12px;text-align:center}
.title-slide p{font-size:18px;color:#94a3b8;margin:0}
.slide{width:297mm;height:210mm;padding:28mm 20mm 20mm;position:relative;display:flex;flex-direction:column;justify-content:center;page-break-after:always;border-top:4px solid #6366f1}
.slide-num{position:absolute;top:12mm;right:14mm;font-size:11px;color:#94a3b8}
.slide-tag{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px;margin-right:6px}
.prio-tag{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px}
h2{font-size:32px;font-weight:800;color:#1e293b;margin:0 0 12px;line-height:1.2}
.reason{font-size:16px;color:#475569;margin:0 0 16px;line-height:1.6}
.metric{font-size:15px;color:#6366f1;font-weight:600;margin-bottom:16px;padding:10px 16px;background:#ede9fe;border-radius:10px;display:inline-block}
.progress-wrap{height:10px;background:#e2e8f0;border-radius:5px;margin-bottom:6px;max-width:400px}
.progress-bar{height:10px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:5px;transition:width .3s}
.prog-label{font-size:13px;color:#64748b}
@media print{.slide,.title-slide{display:flex!important}}
</style></head><body>
<div class="title-slide"><h1>${title}</h1><p>Стратегическая карта · ${date} · ${nodes.length} шагов</p></div>
${slides}
</body></html>`;
    const w=window.open("","_blank");
    if(!w){addToast("Разрешите всплывающие окна для экспорта","warn");return;}
    w.document.write(html);w.document.close();
    setTimeout(()=>{w.print();},500);
    addToast(t("export_pptx","⬇ PPTX") + " — откроется окно печати","success");
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
    const ctx=nodes.map(n=>`ID: ${n.id}\nНазвание: ${n.title}${n.reason?`\nОписание: ${n.reason}`:""}${n.metric?`\nМетрика: ${n.metric}`:""}${n.status?`\nСтатус: ${n.status}`:""}${n.tags?.length?`\nТеги: ${n.tags.join(", ")}`:""}`)
      .join("\n\n");
    const existingEdges=edges.map(e=>`${e.source} → ${e.target}`).join(", ")||"нет";
    try{
      const r=await callAI([{role:"user",content:
`Ты — стратегический аналитик. Проанализируй эти шаги стратегической карты и определи ТОЛЬКО логически обоснованные причинно-следственные связи.

ШАГИ:
${ctx}

УЖЕ СУЩЕСТВУЮЩИЕ СВЯЗИ: ${existingEdges}

ПРАВИЛА:
- Добавляй связь ТОЛЬКО если есть реальная логическая зависимость (A должен быть завершён до B, A влияет на B, A блокирует B)
- НЕ добавляй связи просто потому что шаги похожи по теме
- НЕ добавляй связи которые уже существуют
- Максимум 6 новых связей
- Тип: requires (A нужен для B), affects (A влияет на B), blocks (A блокирует B), follows (B следует после A)

Верни ТОЛЬКО валидный JSON:
{
  "connections": [{"source":"id1","target":"id2","type":"requires","reason":"кратко почему эта связь логична"}],
  "summary": "2-3 предложения: что ты обнаружил в логике карты и почему добавил именно эти связи"
}`
      }],"Верни ТОЛЬКО JSON без markdown. Думай как стратег.",900);
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
        setEdges(es=>[...es,...filtered.map(e=>({...e,id:uid(),label:e.reason||""}))]);
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
    }catch(err){addToast(t("ai_error","Ошибка AI-анализа"),"error");}
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
  },[nodes,edges]);

  // keyboard
  useEffect(()=>{
    function onKey(e){
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
      if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      else if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))){e.preventDefault();redo();}
      else if((e.ctrlKey||e.metaKey)&&e.key==="c"&&selNode){setClipboard(selNode);addToast(t("copied","📋 Скопировано"),"info");}
      else if((e.ctrlKey||e.metaKey)&&e.key==="v"&&clipboard){const copy={...clipboard,id:uid(),x:clipboard.x+60,y:clipboard.y+60};pushUndo(nodes,edges);setNodes(ns=>[...ns,copy]);addToast(t("pasted","📋 Вставлено"),"info");}
      else if(e.key==="Escape"){setConnecting(false);setConnectSrc(null);}
      else if((e.key==="Delete"||e.key==="Backspace")&&selNode&&!connecting){deleteNode(selNode.id);}
      else if((e.key==="Delete"||e.key==="Backspace")&&selEdge){pushUndo(nodes,edges);setEdges(es=>es.filter(x=>x.id!==selEdge.id));setSelEdge(null);}
      else if(e.key==="?"||e.key==="/"){ setShowShortcuts(s=>!s);}
      else if(selNode&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
        e.preventDefault();
        const d=e.shiftKey?40:10;
        const dx=e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0;
        const dy=e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0;
        setNodes(ns=>ns.map(n=>n.id===selNode.id?{...n,x:n.x+dx,y:n.y+dy}:n));
      }
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[selNode,selEdge,clipboard,connecting,undoStack,redoStack,nodes,edges]);

  function onSvgMouseDown(e){
    if(e.button===1||(e.button===0&&e.altKey)){
      panning.current={startX:e.clientX-viewRef.current.x,startY:e.clientY-viewRef.current.y};
      e.preventDefault();return;
    }
    if(e.target===svgRef.current||e.target.tagName==="svg"){
      setSelNode(null);setSelEdge(null);
      if(connecting){setConnecting(false);setConnectSrc(null);}
    }
  }
  function onSvgMouseMove(e){
    if(panning.current){
      const x=e.clientX-panning.current.startX,y=e.clientY-panning.current.startY;
      viewRef.current={...viewRef.current,x,y};setView(v=>({...v,x,y}));return;
    }
    if(dragging.current){
      const{node,startMX,startMY,startNX,startNY}=dragging.current;
      const dx=(e.clientX-startMX)/viewRef.current.zoom,dy=(e.clientY-startMY)/viewRef.current.zoom;
      setNodes(ns=>ns.map(n=>n.id===node.id?{...n,x:snap(startNX+dx),y:snap(startNY+dy)}:n));
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
    if(e.button!==0)return;
    if(connecting){
      if(connectSrc&&connectSrc.id!==node.id){
        if(!edges.find(ex=>ex.source===connectSrc.id&&ex.target===node.id)){
          const ne={id:uid(),source:connectSrc.id,target:node.id,type:"requires",label:""};
          pushUndo(nodes,edges);setEdges(es=>[...es,ne]);
        }
      }else{setConnectSrc(node);}
      return;
    }
    e.stopPropagation();
    dragging.current={node,startMX:e.clientX,startMY:e.clientY,startNX:node.x,startNY:node.y};
  }
  function onNodeClick(node){
    if(connecting){return;}
    setSelNode(node);setSelEdge(null);
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
  const[bgMode,setBgMode]=useState("grid"); // grid | stars | none
  const toolbarStyle={display:"flex",alignItems:"center",gap:5};
  const btnStyle=(active)=>({padding:"5px 10px",borderRadius:8,border:`1px solid ${active?"rgba(99,102,241,.5)":"var(--border)"}`,background:active?"rgba(99,102,241,.12)":"var(--surface)",color:active?"#818cf8":"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",transition:"all .15s"});
  const sep=<div style={{width:1,height:22,background:"var(--border)",margin:"0 2px",flexShrink:0}}/>;
  // icon-only button
  const ib=(active,title,onClick,children,extraStyle={})=>(
    <button onClick={onClick} title={title} style={{width:32,height:32,borderRadius:8,border:`1px solid ${active?"rgba(99,102,241,.5)":"var(--border)"}`,background:active?"rgba(99,102,241,.12)":"transparent",color:active?"#818cf8":"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s",...extraStyle}}
      onMouseOver={e=>{if(!active)e.currentTarget.style.background="var(--surface)";}} onMouseOut={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
      {children}
    </button>
  );
  // text button
  const tb=(active,onClick,children,extraStyle={})=>(
    <button onClick={onClick} style={{height:32,padding:"0 12px",borderRadius:8,border:`1px solid ${active?"rgba(99,102,241,.45)":"var(--border)"}`,background:active?"rgba(99,102,241,.14)":"transparent",color:active?"#818cf8":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,transition:"all .15s",display:"flex",alignItems:"center",gap:5,...extraStyle}}
      onMouseOver={e=>{if(!active)e.currentTarget.style.background="var(--surface)";}} onMouseOut={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
      {children}
    </button>
  );

  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",fontFamily:"'Plus Jakarta Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* ── TOOLBAR — 2 rows ── */}
      <div style={{flexShrink:0,zIndex:30,borderBottom:"1px solid var(--border)",background:"var(--bg2)"}}>

        {/* ROW 1 — primary actions + search */}
        <div style={{height:46,display:"flex",alignItems:"center",gap:4,padding:"0 12px",borderBottom:"1px solid var(--border)"}}>

          {/* LEFT: nav + edit */}
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
            {tb(false,onBack,<>{t("back_btn","← Назад")}</>)}
            {!readOnly&&<>{sep}
            <button onClick={addNode} style={{height:32,padding:"0 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,flexShrink:0,display:"flex",alignItems:"center",gap:5,boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>
              <span style={{fontSize:16,lineHeight:1}}>+</span> Шаг
            </button>
            <button onClick={()=>{setConnecting(c=>!c);setConnectSrc(null);}}
              style={{height:32,padding:"0 12px",borderRadius:8,border:`1px solid ${connecting?"rgba(99,102,241,.5)":"var(--border)"}`,background:connecting?"rgba(99,102,241,.15)":"transparent",color:connecting?"#818cf8":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              {connecting?<><span style={{color:"#ef4444"}}>✕</span> Отмена</>:<>{t("link_btn","⇒ Связать")}</>}
            </button>
            {sep}
            {ib(!undoStack.length,"Отменить (Ctrl+Z)",undo,<>↩</>,{opacity:undoStack.length?.9:.35})}
            {ib(!redoStack.length,"Повторить (Ctrl+Y)",redo,<>↪</>,{opacity:redoStack.length?.9:.35})}
            </>}
          </div>

          {sep}

          {/* CENTER: search + filter */}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:6,justifyContent:"center",minWidth:0}}>
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--text4)",pointerEvents:"none"}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по шагам…"
                style={{padding:"5px 10px 5px 28px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",width:180,fontFamily:"inherit"}}/>
            </div>
            <CustomSelect value={statusFilter} onChange={v=>setStatusFilter(v)}
              options={[{value:"all",label:"Все статусы"},...Object.entries(STATUS).map(([k,s])=>({value:k,label:s.label,dot:s.c}))]}/>
            <div style={{fontSize:13,color:"var(--text4)",fontWeight:600,padding:"4px 9px",borderRadius:7,background:"var(--surface)",border:"1px solid var(--border)",whiteSpace:"nowrap",flexShrink:0}}>
              {filteredNodes.length}{search||statusFilter!=="all"?`/${nodes.length}`:""} шагов
            </div>
          </div>

          {sep}

          {/* RIGHT: user + save */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {ib(false,"Переключить тему",onToggleTheme,theme==="dark"?<>☀️</>:<>🌙</>)}
            {readOnly?(
              <div style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",fontSize:13,fontWeight:600,color:"var(--text4)"}}>{t("read_only","Только просмотр")}</div>
            ):(
              <>
            <button onClick={onProfile} title={t("profile_title","Профиль")}
              style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${tier.color}55`,background:`linear-gradient(135deg,${tier.color}cc,${tier.color}44)`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {(user?.name||user?.email||"U")[0].toUpperCase()}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:13,fontWeight:600,color:saveState==="saving"?"#f59e0b":saveState==="error"?"#ef4444":"#10b981"}}>
              {saveState==="saving"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> {t("saving","Сохраняю")}</>:saveState==="error"?<><span>✗</span> {t("save_error","Ошибка сохранения")}</>:<><span>✓</span> {t("saved","Сохранено")}</>}
            </div>
              </>
            )}
          </div>
        </div>

        {/* ROW 2 — view tools + panels + export */}
        <div style={{height:38,display:"flex",alignItems:"center",gap:4,padding:"0 12px"}}>

          {/* View tools */}
          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
            <span style={{fontSize:12,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginRight:2}}>Вид</span>
            {tb(false,fitView,<>⊡ Вписать</>)}
            {!readOnly&&tb(false,autoLayout,<>{t("auto_layout","⌥ Расклад")}</>)}
            {!readOnly&&tb(false,autoConnect,<>{t("ai_links","🔗 AI-связи")}</>)}
          </div>

          {sep}

          {/* Canvas bg */}
          <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
            {[["grid","⊞","Сетка"],["stars","✦","Звёзды"],["none","○","Чисто"]].map(([m,icon,label])=>(
              <button key={m} onClick={()=>setBgMode(m)} title={`Фон: ${label}`}
                style={{height:26,padding:"0 9px",borderRadius:6,border:`1px solid ${bgMode===m?"rgba(99,102,241,.45)":"var(--border)"}`,background:bgMode===m?"rgba(99,102,241,.14)":"transparent",color:bgMode===m?"#818cf8":"var(--text4)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,transition:"all .15s"}}>
                {icon}
              </button>
            ))}
          </div>

          {sep}

          {/* Panels */}
          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
            {ib(showAI,"AI-консультант",()=>{setShowAI((a:boolean)=>!a);setSelNode(null);},<>✦ AI</>,{width:"auto",padding:"0 10px",fontSize:13,fontWeight:600,color:showAI?"#818cf8":"#a78bfa",borderColor:showAI?"rgba(99,102,241,.5)":"rgba(139,92,246,.25)",background:showAI?"rgba(99,102,241,.14)":"rgba(139,92,246,.06)"})}
            {ib(showMini,"Миникарта",()=>setShowMini((m:boolean)=>!m),<>🗺</>)}
            {ib(false,t("stats_title","Статистика"),()=>setShowStats(true),<>📊</>)}
            {ib(false,t("weekly_briefing","Еженедельный брифинг"),()=>setShowBriefing(true),<>📋</>)}
            {ib(false,t("shortcuts_title","Горячие клавиши"),()=>setShowShortcuts(true),<>⌨️</>)}
            {!readOnly&&ib(showDeadlines,t("deadline_reminder","Напоминания о дедлайнах"),()=>setShowDeadlines((d:boolean)=>!d),<>⏰</>,{borderColor:showDeadlines?"rgba(245,158,11,.5)":"",background:showDeadlines?"rgba(245,158,11,.08)":"",color:showDeadlines?"#f59e0b":""})}
          </div>

          {sep}

          {/* Panels: Simulation, Templates, Gantt */}
          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
            {!readOnly&&<button onClick={()=>setShowSim(true)}
              style={{height:26,padding:"0 10px",borderRadius:6,border:"1px solid rgba(14,165,233,.3)",background:"rgba(14,165,233,.07)",color:"#38bdf8",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              ⎇ Симуляция
            </button>}
            {!readOnly&&(TIERS[user?.tier||"free"]?.templates)&&(
              <button onClick={()=>setShowTemplates(true)}
                style={{height:26,padding:"0 10px",borderRadius:6,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                📋 Шаблоны
              </button>
            )}
            <button onClick={()=>setShowGantt(g=>!g)}
              style={{height:26,padding:"0 10px",borderRadius:6,border:`1px solid ${showGantt?"rgba(16,185,129,.5)":"rgba(16,185,129,.2)"}`,background:showGantt?"rgba(16,185,129,.14)":"rgba(16,185,129,.06)",color:"#34d399",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              📅 Gantt
            </button>
          </div>

          {sep}

          {/* Export/Import */}
          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
            <span style={{fontSize:12,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginRight:2}}>{t("export_label","Экспорт")}</span>
            <button onClick={exportPNG} disabled={exporting} title="Скачать PNG"
              style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
              {exporting?"…":"⬇ PNG"}
            </button>
            <button onClick={exportJSON} title="Скачать JSON"
              style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
              ⬇ JSON
            </button>
            <button onClick={exportPDF} title={t("export_pdf","Скачать PDF")}
              style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
              ⬇ PDF
            </button>
            <button onClick={exportPPTX} title={t("export_pptx","Скачать PPTX")}
              style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.06)",color:"#f87171",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
              ⬇ PPTX
            </button>
            {/* Версии */}
            {API_BASE&&mapData?.id&&(
              <button onClick={()=>setShowVersions(true)} title={t("version_history","История версий")}
                style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid rgba(99,102,241,.3)",background:"rgba(99,102,241,.08)",color:"#818cf8",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
                📜
              </button>
            )}
            {/* Онлайн-пользователи */}
            {onlineUsers.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"0 8px",height:26,borderRadius:6,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)"}}>
                {onlineUsers.slice(0,3).map(u=>(
                  <div key={u.email} title={u.name||u.email} style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#10b981,#34d399)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid var(--surface)"}}>
                    {(u.name||u.email||"?")[0].toUpperCase()}
                  </div>
                ))}
                <span style={{fontSize:11,color:"#34d399",fontWeight:600}}>{onlineUsers.length}</span>
              </div>
            )}
            {!readOnly&&<><button onClick={importJSON} title="Загрузить JSON"
              style={{height:26,padding:"0 9px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
              ⬆ JSON
            </button>
            <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={handleImportFile}/>
            <button onClick={shareMap} title={t("share_map","Поделиться картой")}
              style={{height:26,padding:"0 10px",borderRadius:6,border:"1px solid rgba(16,185,129,.35)",background:"rgba(16,185,129,.08)",color:"#34d399",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              🔗 {t("share_btn","Поделиться")}
            </button>
            </>}
          </div>

        </div>
      </div>
      {/* canvas */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        {/* stars bg */}
        {bgMode==="stars"&&(
          <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
            <SparklesCanvas density={160} speed={0.35} minSz={0.3} maxSz={1.0} color="#ffffff" style={{opacity:.22}}/>
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
          onMouseDown={onSvgMouseDown} onMouseMove={onSvgMouseMove} onMouseUp={onSvgMouseUp}
          onWheel={onWheel} style={{cursor:panning.current?"grabbing":"default",display:"block"}}
          onClick={e=>{if(e.target===svgRef.current||e.target.tagName==="svg"){setSelNode(null);setSelEdge(null);}}}>
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x%40},${view.y%40})`}>
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--grid)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={bgMode==="grid"?"url(#grid)":"var(--bg)"}/>
          <g transform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
            {edges.filter(e=>!hiddenIds.has(e.source)&&!hiddenIds.has(e.target)).map(e=>(
              <EdgeLine key={e.id} edge={e} nodes={nodes} selected={selEdge?.id===e.id} onClick={ed=>{setSelEdge(ed);setSelNode(null);}}/>
            ))}
            {filteredNodes.map(n=>(
              <NodeCard key={n.id} node={n} selected={selNode?.id===n.id} connecting={connecting} connectSource={connectSrc} onClick={onNodeClick} onMouseDown={onNodeMouseDown} theme={theme}/>
            ))}
          </g>
          {connecting&&(
            <text x={W/2} y={36} textAnchor="middle" fontSize={13} fill="#818cf8" fontWeight={700} style={{pointerEvents:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {connectSrc?`Выберите цель для "${connectSrc.title?.slice(0,20)}"…`:"Нажмите на исходный узел…"}
            </text>
          )}
        </svg>
        {/* edge label editor */}
        {selEdge&&!selNode&&!readOnly&&(
          <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--surface,#0d1829)",border:"1px solid rgba(99,102,241,.25)",borderRadius:12,boxShadow:"var(--shadow,0 16px 40px rgba(0,0,0,.7))",zIndex:40,animation:"slideUp .2s ease"}}>
            <span style={{fontSize:13,color:"#64748b",fontWeight:600}}>{t("edge_type","Тип связи:")}</span>
            <CustomSelect
              value={selEdge.type||"requires"}
              onChange={v=>{const ne={...selEdge,type:v};pushUndo(nodes,edges);setEdges(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}}
              options={Object.entries(ETYPE).map(([k,e])=>({value:k,label:e.label,dot:e.c}))}
            />
            <input value={selEdge.label||""} onChange={e=>{const ne={...selEdge,label:e.target.value};setEdges(es=>es.map(x=>x.id===selEdge.id?ne:x));setSelEdge(ne);}} placeholder="Подпись…" style={{fontSize:13,padding:"5px 10px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"#e2e8f0",outline:"none",fontFamily:"inherit",width:120}}/>
            <button onClick={()=>{pushUndo(nodes,edges);setEdges(es=>es.filter(x=>x.id!==selEdge.id));setSelEdge(null);}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑 Удалить</button>
          </div>
        )}
        {showMini&&<MiniMap nodes={nodes} edges={edges} viewX={view.x} viewY={view.y} zoom={view.zoom} canvasW={W} canvasH={H} onJump={(x,y)=>{viewRef.current={...viewRef.current,x,y};setView(v=>({...v,x,y}));}} theme={theme}/>}
        {toasts.map(toast=><Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToasts(ts=>ts.filter(x=>x.id!==toast.id))}/>)}
        {selNode&&!showAI&&(
          <RichEditorPanel
            node={selNode}
            ctx={mapData?.ctx||""}
            readOnly={readOnly}
            userName={user?.name||user?.email||"Пользователь"}
            allNodes={nodes}
            allEdges={edges}
            onUpdate={(patch)=>{
              const n={...selNode,...patch};
              const hEntry=(patch.title&&patch.title!==selNode.title)?{id:uid(),type:"edit",at:Date.now(),by:user?.name||user?.email||"user",before:{title:selNode.title},after:{title:patch.title}}:null;
              pushUndo(nodes,edges);
              updateNode({...n,history:hEntry?[...(selNode.history||[]),hEntry]:(selNode.history||[])});
              setSelNode({...n,history:hEntry?[...(selNode.history||[]),hEntry]:(selNode.history||[])});
            }}
            onDelete={(id)=>{deleteNode(id);}}
            onClose={()=>setSelNode(null)}
            onScrollTo={scrollToNode}
            onConnect={(cfg)=>{
              if(cfg.startNode){startConnect(cfg.startNode);}
              else if(cfg.source&&cfg.target){
                const ne={id:uid(),source:cfg.source,target:cfg.target,type:cfg.type||"requires",label:""};
                pushUndo(nodes,edges);setEdges(es=>[...es,ne]);
              }
            }}
          />
        )}
        {showAI&&<AiPanel nodes={nodes} edges={edges} ctx={mapData?.ctx||""} tier={user?.tier||"free"} onAddNode={(n)=>{const nn={...n,id:uid(),x:snap((-view.x/view.zoom)+W/view.zoom/2-120+Math.random()*80),y:snap((-view.y/view.zoom)+H/view.zoom/2-64+Math.random()*80),comments:[],history:[]};pushUndo(nodes,edges);setNodes(ns=>[...ns,nn]);}} onClose={()=>setShowAI(false)} externalMsgs={pendingAiMsgs} onClearExternal={()=>setPendingAiMsgs([])}/>}
        {showStats&&<StatsPopup nodes={nodes} edges={edges} onClose={()=>setShowStats(false)}/>}
        {showTemplates&&<TemplateModal tier={user?.tier} onSelect={(tmpl:any)=>{setShowTemplates(false);if(tmpl){pushUndo(nodes,edges);setNodes(tmpl.nodes.map((n:any)=>({...n,comments:[],history:[]})));setEdges(tmpl.edges);setTimeout(fitView,100);}}} onClose={()=>setShowTemplates(false)} theme={theme}/>}
        {showGantt&&<GanttView nodes={nodes} onClose={()=>setShowGantt(false)}/>}
        {showTour&&<MapTour onDone={()=>setShowTour(false)}/>}
        {showSim&&<SimulationModal mapData={{...mapData,nodes,edges}} allProjectMaps={allMaps} onClose={()=>setShowSim(false)} theme={theme}/>}
        {showOnboarding&&<InMapOnboarding project={project} tier={user?.tier} theme={theme} onDone={(mapObj:any)=>{setShowOnboarding(false);setNodes(mapObj.nodes||[]);setEdges(mapObj.edges||[]);setTimeout(fitView,200);}} onSkip={()=>{setShowOnboarding(false);setNodes(defaultNodes());}}/>}
        {showBriefing&&(
          <WeeklyBriefingModal nodes={nodes} mapName={mapData?.name||"Карта"} user={user} onClose={()=>setShowBriefing(false)} theme={theme}/>
        )}
        {showVersions&&mapData?.id&&(
          <VersionHistoryModal
            mapId={mapData.id} projectId={project?.id||""} theme={theme}
            onRestore={(v:any)=>{pushUndo(nodes,edges);setNodes(v.nodes||[]);setEdges(v.edges||[]);addToast(t("version_restored","Версия восстановлена"),"success");}}
            onClose={()=>setShowVersions(false)}
          />
        )}
        {/* Напоминания о дедлайнах */}
        {showDeadlines&&!readOnly&&(
          <DeadlineReminders nodes={nodes} onGoToNode={(id:string)=>{
            const n=nodes.find((x:any)=>x.id===id);
            if(n){setView({x:-n.x+W/2,y:-n.y+H/2,zoom:1});viewRef.current={x:-n.x+W/2,y:-n.y+H/2,zoom:1};setSelNode(n);}
          }}/>
        )}
        {/* Удалённые курсоры (WebSocket presence) */}
        {Object.values(remoteCursors).map((c:any)=>(
          <div key={c.email} style={{position:"fixed",left:c.x,top:c.y,pointerEvents:"none",zIndex:500,transform:"translate(-50%,-50%)"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#6366f1",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}/>
            <div style={{position:"absolute",top:12,left:12,background:"#6366f1",color:"#fff",padding:"2px 6px",borderRadius:5,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{c.name||c.email}</div>
          </div>
        ))}
        {showShortcuts&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(6px)"}} onClick={()=>setShowShortcuts(false)}>
            <div style={{background:"var(--bg2)",borderRadius:20,border:"1px solid var(--border)",padding:"24px 28px",maxWidth:400,width:"90%",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:16}}>⌨️ Горячие клавиши</div>
              {[["Ctrl+Z / Ctrl+Y","Отменить / Повторить"],["Ctrl+F","Поиск шагов"],["Ctrl+C","Копировать шаг"],["Ctrl+V","Вставить шаг"],["Delete / Backspace","Удалить выбранное"],["Escape","Выйти из режима связи"],["← → ↑ ↓","Двигать шаг (Shift=×4)"],["Alt+Drag","Панорамировать"],["Scroll","Масштаб"],["?","Эта подсказка"]].map(row=>(
                <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                  <code style={{fontSize:13,background:"var(--surface)",padding:"2px 7px",borderRadius:5,color:"#818cf8",fontFamily:"'JetBrains Mono',monospace"}}>{row[0]}</code>
                  <span style={{fontSize:13,color:"var(--text3)"}}>{row[1]}</span>
                </div>
              ))}
              <button onClick={()=>setShowShortcuts(false)} style={{marginTop:16,width:"100%",padding:"10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("close","Закрыть")}</button>
            </div>
          </div>
        )}
        <div style={{position:"absolute",bottom:16,left:16,display:"flex",gap:6,alignItems:"center",zIndex:30}}>
          <button onClick={()=>{const nz=Math.min(3,view.zoom*1.2);viewRef.current={...viewRef.current,zoom:nz};setView(v=>({...v,zoom:nz}));}} style={{...btnStyle(false),padding:"4px 9px",fontSize:16}}>+</button>
          <div style={{fontSize:13,color:"var(--text4)",fontWeight:600,minWidth:40,textAlign:"center"}}>{Math.round(view.zoom*100)}%</div>
          <button onClick={()=>{const nz=Math.max(.2,view.zoom*.83);viewRef.current={...viewRef.current,zoom:nz};setView(v=>({...v,zoom:nz}));}} style={{...btnStyle(false),padding:"4px 9px",fontSize:16}}>−</button>
        </div>
      </div>
    </div>
  );
}

// ── ProjectsPage ──
function ProjectsPage({user,onSelectProject,onLogout,onChangeTier,onProfile,theme,onToggleTheme}){
  const{t,lang}=useLang();
  const ROLES=getROLES(t);
  const[projects,setProjects]=useState([]);
  const[maps,setMaps]=useState({});
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[creating,setCreating]=useState(false);
  const[newName,setNewName]=useState("");
  const[delId,setDelId]=useState(null);
  const tier=TIERS[user?.tier||"free"]||TIERS.free;

  useEffect(()=>{(async()=>{
    const ps=await getProjects(user.email);setProjects(ps);
    const mm={};
    for(const p of ps){mm[p.id]=await getMaps(p.id);}
    setMaps(mm);setLoading(false);
  })();},[]);

  async function createProject(){
    if(!newName.trim())return;
    if(projects.filter(p=>p.owner===user.email).length>=tier.projects){return;}
    const p={id:uid(),name:newName.trim(),owner:user.email,members:[{email:user.email,role:"owner"}],createdAt:Date.now()};
    const saved=await saveProject(p);
    // Если сервер вернул проект с серверным ID — используем его, иначе локальный
    const finalP=saved||p;
    setProjects(ps=>[...ps,finalP]);
    setMaps(m=>({...m,[finalP.id]:[]}));
    setNewName("");setCreating(false);
  }
  async function deleteProj(id){
    await deleteProject(id);setProjects(ps=>ps.filter(p=>p.id!==id));
    const nm={...maps};delete nm[id];setMaps(nm);setDelId(null);
  }

  const filtered=projects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const myCount=projects.filter(p=>p.owner===user.email).length;
  const atLimit=myCount>=tier.projects;

  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse 70% 50% at 50% -10%,rgba(99,102,241,.08) 0%,transparent 60%)",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 24px",borderBottom:"1px solid var(--border)",background:"var(--bg2)",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
          <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✦</div>
          <span style={{fontSize:15,fontWeight:800,color:"var(--text)",letterSpacing:-.3}}>Strategy AI</span>
        </div>
        <button onClick={onToggleTheme} style={{padding:"5px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{theme==="dark"?"☀️":"🌙"}</button>
        <button onClick={onProfile} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${tier.color}cc,${tier.color}55)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{(user.name||user.email)[0].toUpperCase()}</div>
          <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{user.name||user.email.split("@")[0]}</span>
          <span style={{fontSize:13.5,color:tier.color,fontWeight:700}}>{tier.badge} {tier.label}</span>
        </button>
        <button onClick={onLogout} style={{padding:"6px 14px",borderRadius:9,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("logout","Выйти")}</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"24px",position:"relative",zIndex:5}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:900,color:"var(--text)",letterSpacing:-.5,marginBottom:2}}>{t("your_projects","Мои проекты")}</h1>
              <div style={{fontSize:13.5,color:"var(--text3)"}}>{myCount} из {tier.projects==="∞"?"∞":tier.projects} проектов</div>
            </div>
            <div style={{flex:1}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search","Поиск…")} style={{padding:"7px 13px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",outline:"none",width:200,fontFamily:"inherit"}}/>
            <button onClick={()=>{if(atLimit){return;}setCreating(true);}} style={{padding:"8px 18px",borderRadius:10,border:"none",background:atLimit?"var(--surface)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:atLimit?"var(--text4)":"#fff",cursor:atLimit?"not-allowed":"pointer",fontSize:13,fontWeight:700,transition:"all .2s"}} title={atLimit?`Лимит ${tier.projects} проектов для ${tier.label}`:t("new_project","+ Новый проект")}>+ Проект</button>
          </div>
          {atLimit&&<div style={{padding:"10px 16px",borderRadius:10,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",color:"#f59e0b",fontSize:13.5,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>⚠️ Лимит проектов для тарифа {tier.label}. <button onClick={onProfile} style={{border:"none",background:"none",color:"var(--accent-1)",cursor:"pointer",fontWeight:700,fontSize:13.5}}>{t("upgrade_tier_arrow","Улучшить тариф →")}</button></div>}
          {creating&&(
            <div style={{padding:"16px 18px",borderRadius:14,background:"var(--surface)",border:"1px solid var(--border2)",marginBottom:16,display:"flex",gap:10,alignItems:"center",animation:"slideUp .2s ease"}}>
              <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createProject();if(e.key==="Escape"){setCreating(false);setNewName("");}}} placeholder="Название проекта…" style={{flex:1,padding:"9px 13px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:10,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
              <button onClick={createProject} disabled={!newName.trim()} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:newName.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:700,opacity:newName.trim()?1:.5}}>{t("create_map_btn","Создать")}</button>
              <button onClick={()=>{setCreating(false);setNewName("");}} style={{padding:"9px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13}}>{t("cancel","Отмена")}</button>
            </div>
          )}
          {loading?(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
              {[1,2,3].map(i=><div key={i} style={{height:120,borderRadius:14,background:"var(--surface)",animation:"pulse 1.5s ease infinite"}}/>)}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
              {filtered.map(p=>{
                const pm=maps[p.id]||[];
                const myRole=p.owner===user.email?"owner":p.members?.find(m=>m.email===user.email)?.role;
                const roleLabel=ROLES[myRole]||"";
                const ICONS=["📋","🚀","💡","🗺","⚡","🎯","📊","🔬","🌱","💼"];
                const icon=ICONS[p.id.charCodeAt(0)%ICONS.length];
                return(
                  <div key={p.id} onClick={()=>onSelectProject(p)} className="icard"
                    style={{padding:"18px 18px 14px",borderRadius:16,background:"var(--card)",border:"1px solid var(--border)",cursor:"pointer",position:"relative",display:"flex",flexDirection:"column"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                      <div style={{width:40,height:40,borderRadius:11,background:`linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.08))`,border:"1px solid rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="icard-title" style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{p.name}</div>
                        <div className="icard-desc" style={{fontSize:13}}>{roleLabel} · {new Date(p.createdAt).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"numeric",month:"short"})}</div>
                      </div>
                      {p.owner===user.email&&(
                        <button onClick={e=>{e.stopPropagation();setDelId(p.id);}} style={{width:24,height:24,borderRadius:6,border:"none",background:"transparent",color:"var(--text4)",cursor:"pointer",fontSize:14,opacity:.4,display:"flex",alignItems:"center",justifyContent:"center"}} onMouseOver={e=>{e.stopPropagation();e.currentTarget.style.opacity="1";e.currentTarget.style.color="#ef4444";}} onMouseOut={e=>{e.currentTarget.style.opacity=".4";e.currentTarget.style.color="var(--text4)";}}>🗑</button>
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
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:13.5,color:"var(--text5)"}}>{t("progress","Прогресс")}</span>
                            <span style={{fontSize:13.5,fontWeight:700,color:"#10b981"}}>{pct}%</span>
                          </div>
                          <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
                            <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#10b981,#34d399)",borderRadius:2}}/>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:"auto"}}>
                      <div style={{padding:"3px 9px",borderRadius:6,background:"var(--surface)",border:"1px solid var(--border)",fontSize:13,color:"var(--text3)"}}>🗺 {pm.filter(m=>!m.isScenario).length} карт</div>
                      {pm.filter(m=>m.isScenario).length>0&&<div style={{padding:"3px 9px",borderRadius:6,background:"var(--surface)",border:"1px solid var(--border)",fontSize:13,color:"var(--text3)"}}>🔀 {pm.filter(m=>m.isScenario).length} сцен.</div>}
                      {(()=>{const n=pm.flatMap(m=>m.nodes||[]).length;return n>0?<div style={{padding:"3px 9px",borderRadius:6,background:"var(--surface)",border:"1px solid var(--border)",fontSize:13,color:"var(--text3)"}}>📌 {n} шагов</div>:null;})()}
                      {p.members?.length>1&&<div style={{padding:"3px 9px",borderRadius:6,background:"var(--surface)",border:"1px solid var(--border)",fontSize:13,color:"var(--text3)"}}>👥 {p.members.length}</div>}
                    </div>
                  </div>
                );
              })}
              {!filtered.length&&!loading&&(
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"48px 0",color:"var(--text4)"}}>
                  <div style={{fontSize:32,marginBottom:10}}>🗂</div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{t("no_projects","Нет проектов")}</div>
                  <div style={{fontSize:13}}>{t("click_new_project","Нажмите «+ Проект» чтобы начать")}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {delId&&<ConfirmDialog title={t("delete_project","Удалить проект?")} message="Все карты и данные проекта будут удалены без возможности восстановления." confirmLabel="Удалить" onConfirm={()=>deleteProj(delId)} onCancel={()=>setDelId(null)} danger={true}/>}
    </div>
  );
}

// ── ProjectDetail ──
function ProjectDetail({user,project,onBack,onOpenMap,onProfile,theme,onToggleTheme,onChangeTier}){
  const{t,lang}=useLang();
  const[maps,setMaps]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("maps");
  const[proj,setProj]=useState(project);
  const[newMember,setNewMember]=useState("");
  const[nmRole,setNmRole]=useState("editor");
  const[showTmpls,setShowTmpls]=useState(false);
  const[showScChoice,setShowScChoice]=useState(false);
  const[showScTmpls,setShowScTmpls]=useState(false);
  const[projCtx,setProjCtx]=useState("");
  const[toast,setToast]=useState(null);
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
      const map={id:uid(),name:tmpl?tmpl.name:`Карта ${reg.length+1}`,nodes:tmpl?.nodes||[],edges:tmpl?.edges||[],ctx:"",isScenario:false,createdAt:Date.now()};
      await saveMap(proj.id,map);
      if(tmpl){await load();setToast({msg:`Шаблон "${tmpl.name}" применён!`,type:"success"});}
      else onOpenMap(map,proj,true,myRole==="viewer");
    }finally{creatingRef.current=false;}
  }

  async function createBlankScenario(){
    setShowScChoice(false);
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    const map={id:uid(),name:`Сценарий ${sc.length+1}`,nodes:[],edges:[],ctx:"",isScenario:true,createdAt:Date.now()};
    await saveMap(proj.id,map);
    onOpenMap(map,proj,true,myRole==="viewer");
  }

  async function createScenarioFromTemplate(parsed){
    setShowScTmpls(false);setShowScChoice(false);
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    const name=parsed.scenarioName?`${parsed.scenarioIcon} ${parsed.scenarioName}`:`Сценарий ${sc.length+1}`;
    const map={id:uid(),name,nodes:parsed.nodes||[],edges:parsed.edges||[],ctx:"",isScenario:true,createdAt:Date.now()};
    await saveMap(proj.id,map);
    await load();
    setToast({msg:`Сценарий "${name}" создан!`,type:"success"});
    onOpenMap(map,proj,false,myRole==="viewer");
  }

  async function tryCreateScenario(){
    if(tier.scenarios===0){setToast({msg:t("scenarios_pro","Сценарии доступны с Pro"),type:"warn"});return;}
    const sc=(await getMaps(proj.id)).filter(m=>m.isScenario);
    if(sc.length>=tier.scenarios){setToast({msg:t("scenario_limit","Лимит сценариев для тарифа")+" "+tier.label+": "+fmt(tier.scenarios),type:"warn"});return;}
    setShowScChoice(true);
  }

  async function delMap(id){
    if(!confirm(t("confirm_delete_map","Удалить карту?")))return;
    await deleteMap(proj.id,id);
    await load();
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
  const totalNodes=allNodes.length;
  const doneNodes=allNodes.filter(n=>n.status==="completed").length;
  const avgProgress=totalNodes?Math.round(allNodes.reduce((s,n)=>s+(n.progress||0),0)/totalNodes):0;
  const overdueCount=allNodes.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;

  function MapCard({m,isSc}){
    const ns=m.nodes||[];
    const done=ns.filter(n=>n.status==="completed").length;
    const prog=ns.length?Math.round(ns.reduce((s,n)=>s+(n.progress||0),0)/ns.length):0;
    const overdue=ns.filter(n=>n.deadline&&new Date(n.deadline)<new Date()&&n.status!=="completed").length;
    return(
      <div style={{padding:"16px 18px",background:"var(--card)",border:`1px solid ${isSc?"rgba(139,92,246,.2)":"var(--border)"}`,borderRadius:14,cursor:"pointer",transition:"all .18s",position:"relative"}}
        onClick={()=>onOpenMap(m,proj,false,myRole==="viewer")}
        onMouseOver={e=>{e.currentTarget.style.borderColor=isSc?"rgba(139,92,246,.5)":"rgba(99,102,241,.35)";e.currentTarget.style.background="var(--card-hover,var(--surface))";}}
        onMouseOut={e=>{e.currentTarget.style.borderColor=isSc?"rgba(139,92,246,.2)":"var(--border)";e.currentTarget.style.background="var(--card)";}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:isSc?"rgba(139,92,246,.15)":"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:`1px solid ${isSc?"rgba(139,92,246,.25)":"rgba(99,102,241,.15)"}`}}>
            {isSc?"⎇":"🗺️"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name||"Без названия"}</div>
            <div style={{fontSize:13.5,color:"var(--text5)"}}>{ns.length} {t("steps_label","шагов")} • {t("updated_label","обновлено")} {m.updatedAt?new Date(m.updatedAt).toLocaleDateString(lang==="en"?"en-US":lang==="uz"?"uz-UZ":"ru",{day:"2-digit",month:"short"}):"—"}</div>
          </div>
          {canEdit&&<button onClick={e=>{e.stopPropagation();delMap(m.id);}} style={{width:22,height:22,borderRadius:5,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#ef4444",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .2s"}}
            onMouseOver={e=>{e.currentTarget.style.opacity="1";}} onMouseOut={e=>{e.currentTarget.style.opacity="0";}}>🗑</button>}
        </div>
        {ns.length>0&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:13,color:"var(--text5)"}}>{t("progress","Прогресс")}</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--text4)"}}>{prog}%</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"var(--surface2)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:isSc?"#8b5cf6":"#6366f1",width:`${prog}%`,transition:"width .3s"}}/>
            </div>
          </div>
        )}
        {overdue>0&&<div style={{marginTop:7,fontSize:13.5,color:"#ef4444",fontWeight:600}}>⚠ {overdue} просрочено</div>}
      </div>
    );
  }

  return(
    <div data-theme={theme} style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:900,color:"var(--text)"}}>{proj.name||"Проект"}</div>
          <div style={{fontSize:13,color:"var(--text5)"}}>{regularMaps.length} карт • {scenarios.length} сценариев • {(proj.members||[]).length} участников</div>
        </div>
        <button onClick={onToggleTheme} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{theme==="dark"?"☀️":"🌙"}</button>
        <button onClick={onProfile} style={{width:32,height:32,borderRadius:"50%",border:"1px solid var(--border)",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{(user.name||user.email||"U")[0].toUpperCase()}</button>
      </div>

      {/* Stats bar */}
      {totalNodes>0&&(
        <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"10px 20px",display:"flex",gap:24}}>
          {[
            {label:"Шагов всего",val:totalNodes,color:"#6366f1"},
            {label:"Завершено",val:`${doneNodes} (${totalNodes?Math.round(doneNodes/totalNodes*100):0}%)`,color:"#10b981"},
            {label:t("avg_prog","Средний прогресс"),val:`${avgProgress}%`,color:"#8b5cf6"},
            ...(overdueCount>0?[{label:t("overdue","Просрочено"),val:overdueCount,color:"#ef4444"}]:[]),
          ].map(s=>(
            <div key={s.label}>
              <div style={{fontSize:12.5,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--border)",padding:"0 20px",background:"var(--bg2)"}}>
        {[["maps",`🗺 Карты (${regularMaps.length})`],["scenarios",`⎇ Сценарии (${scenarios.length})`],["team",`👥 Команда (${(proj.members||[]).length})`],["settings","⚙ "+t("settings_title","Настройки")]].map(([k,lbl])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"10px 16px",border:"none",background:"transparent",color:tab===k?"var(--text)":"var(--text4)",fontSize:13.5,fontWeight:tab===k?800:500,cursor:"pointer",borderBottom:tab===k?"2px solid #6366f1":"2px solid transparent",marginBottom:-1,transition:"all .15s"}}>{lbl}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"20px"}}>
        {/* Maps Tab */}
        {tab==="maps"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{flex:1,fontSize:13,fontWeight:700,color:"var(--text)"}}>{t("strategy_maps","Стратегические карты")}</div>
              {canEdit&&tier.templates&&<button onClick={()=>setShowTmpls(true)} style={{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:13,fontWeight:700}}>📋 Из шаблона</button>}
              {canEdit&&<button onClick={()=>createMap()} style={{padding:"7px 16px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Новая карта</button>}
            </div>
            {loading?<div style={{textAlign:"center",padding:"40px",color:"var(--text4)"}}>{t("loading_short","Загрузка…")}</div>
            :regularMaps.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed var(--border2)",borderRadius:16}}>
                <div style={{fontSize:36,marginBottom:10}}>🗺️</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("no_maps","Нет карт")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16}}>{t("create_first_map","Создайте первую стратегическую карту")}</div>
                {canEdit&&<button onClick={()=>createMap()} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Создать карту</button>}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {regularMaps.map(m=><MapCard key={m.id} m={m} isSc={false}/>)}
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
                  <button onClick={()=>onChangeTier&&onChangeTier()} style={{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.07)",color:"#fbbf24",cursor:"pointer",fontSize:13,fontWeight:700}}>🔒 Pro+</button>
                ):(
                  <button onClick={tryCreateScenario} style={{padding:"7px 16px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#8b5cf6,#6366f1)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Новый сценарий</button>
                )
              )}
            </div>
            {tier.scenarios===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed rgba(139,92,246,.25)",borderRadius:16,background:"rgba(139,92,246,.03)"}}>
                <div style={{fontSize:36,marginBottom:10}}>⎇</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("scenarios_pro","Сценарии доступны с Pro")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16,maxWidth:300,margin:"0 auto 16px"}}>Создавайте альтернативные планы: «Что если потеряем ключевого клиента?» или «Что если вырастем ×3 за год?»</div>
                {onChangeTier&&<button onClick={onChangeTier} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#8b5cf6,#6366f1)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("upgrade_to_pro","Перейти на Pro")}</button>}
              </div>
            ):scenarios.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",border:"1px dashed var(--border2)",borderRadius:16}}>
                <div style={{fontSize:36,marginBottom:10}}>⎇</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}}>{t("no_scenarios","Нет сценариев")}</div>
                <div style={{fontSize:13,color:"var(--text5)",marginBottom:16}}>{t("create_first_scenario","Создайте первый сценарий вручную или с помощью AI шаблонов")}</div>
                {canEdit&&<button onClick={tryCreateScenario} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#8b5cf6,#6366f1)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Создать сценарий</button>}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {scenarios.map(m=><MapCard key={m.id} m={m} isSc={true}/>)}
              </div>
            )}
          </div>
        )}

        {/* Team Tab */}
        {tab==="team"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {(proj.members||[]).map(m=>(
              <div key={m.email} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:800,flexShrink:0}}>{(m.email||"?")[0].toUpperCase()}</div>
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
                    <button onClick={()=>removeMember(m.email)} style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#ef4444",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                )}
              </div>
            ))}
            {isOwner&&(proj.members||[]).length<tier.users&&(
              <div style={{display:"flex",gap:9,padding:"12px 16px",borderRadius:12,border:"1px dashed var(--border2)",background:"var(--surface)"}}>
                <input value={newMember} onChange={e=>setNewMember(e.target.value)} placeholder="Email участника" onKeyDown={e=>{if(e.key==="Enter")addMember();}} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input-bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
                <select value={nmRole} onChange={e=>setNmRole(e.target.value)} style={{padding:"8px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13}}>
                  <option value="editor">{t("role_editor","Редактор")}</option>
                  <option value="viewer">{t("observer","Наблюдатель")}</option>
                </select>
                <button onClick={addMember} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("add","Добавить")}</button>
              </div>
            )}
            {(proj.members||[]).length>=tier.users&&<div style={{fontSize:13.5,color:"var(--text5)",textAlign:"center",padding:"8px",borderRadius:8,border:"1px dashed var(--border2)"}}>{t("member_limit","Лимит участников для {plan}: {n}.").replace("{plan}",tier.label).replace("{n}",String(tier.users))} <span onClick={onChangeTier} style={{color:"var(--accent-2)",cursor:"pointer",fontWeight:700}}>{t("upgrade_tier_arrow","Улучшить тариф →")}</span></div>}
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
                {onChangeTier&&<button onClick={onChangeTier} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("upgrade_plan","Улучшить")}</button>}
              </div>
            </div>
            {isOwner&&(
              <button onClick={async()=>{if(!confirm(t("confirm_delete_proj","Все карты и данные проекта будут удалены безвозвратно.")))return;await deleteProject(proj.id);onBack();}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.05)",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:700,marginTop:10}}>🗑 {t("delete_project","Удалить проект")}</button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTmpls&&<TemplateModal tier={user.tier} onSelect={(t)=>{setShowTmpls(false);if(t)createMap(t);}} onClose={()=>setShowTmpls(false)} theme={theme}/>}
      {showScTmpls&&<ScenarioTemplatesModal onSelect={createScenarioFromTemplate} onClose={()=>{setShowScTmpls(false);setShowScChoice(false);}} mapCtx={projCtx} theme={theme}/>}

      {/* Scenario choice modal */}
      {showScChoice&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:160,backdropFilter:"blur(10px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget)setShowScChoice(false);}}>
          <div style={{width:"min(95vw,460px)",background:"var(--bg2)",borderRadius:22,border:"1px solid rgba(139,92,246,.25)",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,.8)",animation:"scaleIn .2s ease"}}>
            <div style={{padding:"18px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#8b5cf6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⎇</div>
              <div style={{fontSize:14,fontWeight:800,color:"var(--text)",flex:1}}>{t("new_scenario","Новый сценарий")}</div>
              <button onClick={()=>setShowScChoice(false)} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={createBlankScenario} style={{padding:"16px 18px",borderRadius:14,border:"1px solid rgba(99,102,241,.25)",background:"rgba(99,102,241,.06)",textAlign:"left",cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"all .2s"}}
                onMouseOver={e=>{e.currentTarget.style.background="rgba(99,102,241,.12)";e.currentTarget.style.borderColor="rgba(99,102,241,.5)";}}
                onMouseOut={e=>{e.currentTarget.style.background="rgba(99,102,241,.06)";e.currentTarget.style.borderColor="rgba(99,102,241,.25)";}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✏️</div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:3}}>{t("empty_scenario","Пустой сценарий")}</div>
                  <div style={{fontSize:13.5,color:"var(--text4)"}}>{t("start_ai_interview","Начать с чистой карты и AI-интервью")}</div>
                </div>
              </button>
              <button onClick={()=>{setShowScChoice(false);setShowScTmpls(true);}} style={{padding:"16px 18px",borderRadius:14,border:"1px solid rgba(139,92,246,.25)",background:"rgba(139,92,246,.06)",textAlign:"left",cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"all .2s"}}
                onMouseOver={e=>{e.currentTarget.style.background="rgba(139,92,246,.12)";e.currentTarget.style.borderColor="rgba(139,92,246,.5)";}}
                onMouseOut={e=>{e.currentTarget.style.background="rgba(139,92,246,.06)";e.currentTarget.style.borderColor="rgba(139,92,246,.25)";}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(139,92,246,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✦</div>
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
  );
}


// ── Scenario Templates Data ──
const SC_TEMPLATES=[
  {id:"saas_growth",icon:"📈",name:"SaaS рост",color:"#6366f1",
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
  {id:"fundraising",icon:"💰",name:"Привлечение инвестиций",color:"#10b981",
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
  {id:"team_scaling",icon:"👥",name:"Масштабирование команды",color:"#8b5cf6",
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
  {id:"pivot",icon:"🔄",name:"Продуктовый пивот",color:"#f59e0b",
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
  {id:"cost_optimization",icon:"💡",name:"Оптимизация расходов",color:"#10b981",
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

const SC_MAP_SYS=`Ты — эксперт по стратегическому планированию. Создай персональный сценарий на основе данных пользователя.
ТРЕБОВАНИЯ:
- Узлы — конкретные действия для ЭТОЙ ситуации, не абстракции
- Учитывай все введённые условия и ограничения пользователя
- metric — реалистичная цифра для этого контекста
- Расставь приоритеты: срочные узлы status:"active" priority:"critical"
- 6–8 узлов, X:150–900, Y:80–520
Верни ТОЛЬКО валидный JSON:
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"critical","progress":0}],"edges":[{"id":"e1","from":"n1","to":"n2","type":"requires"}]}`;

// ── ScenarioTemplatesModal ──
function ScenarioTemplatesModal({onSelect,onClose,mapCtx="",theme="dark"}){
  const{t}=useLang();
  const[selected,setSelected]=useState(null);
  const[fields,setFields]=useState({});
  const[generating,setGenerating]=useState(false);
  const[error,setError]=useState("");

  async function build(){
    if(!selected)return;
    const missing=selected.fields.filter(fld=>!fields[fld.key]?.trim());
    if(missing.length){setError(`Заполните: ${missing.map(f=>f.label).join(", ")}`);return;}
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

  const iS={width:"100%",padding:"8px 11px",fontSize:13.5,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:9,color:"var(--text)",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"};

  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",zIndex:200,backdropFilter:"blur(12px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <style>{CSS}</style>
      <div style={{width:"min(95vw,860px)",maxHeight:"90vh",margin:"auto",background:"var(--bg2)",borderRadius:22,border:"1px solid var(--border)",boxShadow:"0 40px 80px rgba(0,0,0,.7)",display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#8b5cf6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⎇</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14.5,fontWeight:900,color:"var(--text)"}}>{t("scenario_templates","Шаблоны сценариев")}</div>
            <div style={{fontSize:13.5,color:"var(--text4)"}}>AI сгенерирует стратегическую карту под ваш контекст</div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Template list */}
          <div style={{width:240,borderRight:"1px solid var(--border)",overflowY:"auto",padding:"10px 8px",display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
            {SC_TEMPLATES.map(tmpl=>(
              <div key={tmpl.id} onClick={()=>{setSelected(tmpl);setFields({});setError("");}}
                style={{padding:"10px 12px",borderRadius:10,cursor:"pointer",background:selected?.id===tmpl.id?"rgba(99,102,241,.1)":"transparent",border:`1px solid ${selected?.id===tmpl.id?"rgba(99,102,241,.35)":"transparent"}`,transition:"all .15s"}}
                onMouseOver={e=>{if(selected?.id!==tmpl.id){e.currentTarget.style.background="var(--surface)";e.currentTarget.style.borderColor="var(--border)";}}}
                onMouseOut={e=>{if(selected?.id!==tmpl.id){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}}>
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
                <div style={{fontSize:13,color:"var(--text5)",maxWidth:260}}>AI сгенерирует персональную стратегическую карту на основе ваших данных</div>
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
                {error&&<div style={{padding:"9px 12px",borderRadius:9,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:13}}>{error}</div>}
                <button onClick={build} disabled={generating} style={{padding:"11px",borderRadius:11,border:"none",background:generating?"var(--surface2)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:generating?"var(--text4)":"#fff",cursor:generating?"wait":"pointer",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {generating?(
                    <><div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>AI генерирует карту…</>
                  ):(
                    <>✦ Создать сценарий</>
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
  const tierData=TIERS[tier||"free"]||TIERS.free;
  const canUse=tierData.templates;
  const[selected,setSelected]=useState(null);
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:180,backdropFilter:"blur(12px)",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <style>{CSS}</style>
      <div style={{width:"min(95vw,760px)",maxHeight:"86vh",background:"var(--bg2)",borderRadius:22,border:"1px solid var(--border)",boxShadow:"0 40px 80px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",overflow:"hidden",animation:"scaleIn .2s ease"}}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text)"}}>📋 Шаблоны карт</div>
            <div style={{fontSize:13,color:"var(--text4)",marginTop:2}}>{t("choose_template","Выберите готовую стратегическую карту или начните с нуля")}</div>
          </div>
          {!canUse&&<div style={{padding:"4px 10px",borderRadius:8,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",color:"#f59e0b",fontSize:13,fontWeight:700}}>Team+ тариф</div>}
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,alignContent:"start"}}>
          {TEMPLATES.map(tmpl=>{
            const locked=!canUse;
            return(
              <div key={tmpl.id} onClick={()=>!locked&&setSelected(tmpl.id===selected?null:tmpl.id)}
                style={{padding:"16px",borderRadius:14,border:`2px solid ${selected===tmpl.id?"#6366f1":locked?"var(--border)":"var(--border)"}`,background:selected===tmpl.id?"rgba(99,102,241,.08)":locked?"var(--surface)":"var(--card)",cursor:locked?"not-allowed":"pointer",transition:"all .2s",opacity:locked?.5:1}}
                onMouseOver={e=>{if(!locked)e.currentTarget.style.borderColor="#6366f1cc";}}
                onMouseOut={e=>{if(selected!==tmpl.id)e.currentTarget.style.borderColor="var(--border)";}}>
                <div style={{fontSize:22,marginBottom:8}}>{tmpl.name.split(" ")[0]}</div>
                <div style={{fontSize:13.5,fontWeight:800,color:"var(--text)",marginBottom:4}}>{tmpl.name.split(" ").slice(1).join(" ")}</div>
                <div style={{fontSize:13,color:"var(--text4)",marginBottom:8}}>{tmpl.desc}</div>
                <div style={{display:"flex",gap:6}}>
                  <div style={{padding:"2px 7px",borderRadius:5,background:"var(--surface2)",border:"1px solid var(--border)",fontSize:13,color:"var(--text4)"}}>{tmpl.nodes.length} шагов</div>
                  <div style={{padding:"2px 7px",borderRadius:5,background:"var(--surface2)",border:"1px solid var(--border)",fontSize:13,color:"var(--text4)"}}>{tmpl.edges.length} связей</div>
                </div>
                {locked&&<div style={{marginTop:6,fontSize:13,color:"#f59e0b",fontWeight:600}}>🔒 Team+</div>}
              </div>
            );
          })}
        </div>
        <div style={{padding:"14px 22px",borderTop:"1px solid var(--border)",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("cancel","Отмена")}</button>
          <button onClick={()=>{if(selected){const tmpl=TEMPLATES.find(x=>x.id===selected);if(t)onSelect(t);}else{onSelect(null);}}} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
            {selected?"Использовать шаблон":"Начать с нуля"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── MapTour ──
const TOUR_STEPS=[
  {title:"Это ваша стратегическая карта",body:"Каждый узел — шаг к цели. Перетаскивайте их, соединяйте и отслеживайте прогресс. Двигайте фон мышью для навигации, колесо — для зума.",icon:"🗺️"},
  {title:"Добавляйте шаги",body:'Нажмите + Шаг чтобы добавить новый стратегический шаг. У каждого шага есть статус, приоритет и метрика успеха.',icon:"⊕"},
  {title:"Связывайте шаги",body:'Кнопка "Связать" переводит в режим соединения: кликните на один шаг, затем на другой — стрелка создастся автоматически.',icon:"→"},
  {title:"AI-советник",body:'Нажмите кнопку "✦ AI" в тулбаре. AI знает контекст вашего бизнеса и может отвечать на вопросы, давать советы и добавлять шаги прямо на карту.',icon:"✦"},
  {title:"Редактируйте детали",body:"Кликните на любой шаг — откроется панель с описанием, комментариями, дедлайном и историей изменений. Поддерживается @AI в комментариях.",icon:"✏️"},
];

function MapTour({onDone}){
  const{t}=useLang();
  const[step,setStep]=useState(0);
  const s=TOUR_STEPS[step];
  const isLast=step===TOUR_STEPS.length-1;
  useEffect(()=>{
    const h=e=>{
      if(e.key==="Escape")onDone();
      if(e.key==="ArrowRight"||e.key===" ")isLast?onDone():setStep(st=>st+1);
      if(e.key==="ArrowLeft"&&step>0)setStep(st=>st-1);
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[isLast,step]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,pointerEvents:"none"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(3px)",pointerEvents:"all"}} onClick={()=>isLast?onDone():setStep(st=>st+1)}/>
      <div style={{position:"absolute",bottom:"50%",left:"50%",transform:"translate(-50%,50%)",width:400,background:"linear-gradient(135deg,#0d1525,#111827)",borderRadius:22,border:"1px solid rgba(99,102,241,.4)",boxShadow:"0 32px 80px rgba(0,0,0,.8),0 0 0 1px rgba(99,102,241,.15)",padding:"26px 28px",pointerEvents:"all",animation:"scaleIn .3s cubic-bezier(.34,1.56,.64,1)",zIndex:10000}}>
        {/* Progress */}
        <div style={{display:"flex",gap:4,marginBottom:20}}>
          {TOUR_STEPS.map((_,i)=>(
            <div key={i} onClick={()=>setStep(i)} style={{flex:i===step?3:1,height:3,borderRadius:2,background:i===step?"#6366f1":i<step?"rgba(99,102,241,.5)":"rgba(255,255,255,.1)",cursor:"pointer",transition:"all .3s"}}/>
          ))}
        </div>
        <div style={{fontSize:32,marginBottom:14,textAlign:"center"}}>{s.icon}</div>
        <div style={{fontSize:15,fontWeight:900,color:"#e2e8f0",textAlign:"center",marginBottom:10}}>{s.title}</div>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.75,textAlign:"center",marginBottom:22}}>{s.body}</div>
        <div style={{display:"flex",gap:9,justifyContent:"center"}}>
          {step>0&&<button onClick={e=>{e.stopPropagation();setStep(st=>st-1);}} style={{padding:"9px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"#94a3b8",cursor:"pointer",fontSize:13}}>{t("back_btn","← Назад")}</button>}
          <button onClick={e=>{e.stopPropagation();isLast?onDone():setStep(st=>st+1);}} style={{padding:"9px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
            {isLast?"Начать работу ✓":"Далее →"}
          </button>
          <button onClick={e=>{e.stopPropagation();onDone();}} style={{padding:"9px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#475569",cursor:"pointer",fontSize:13}}>{t("skip","Пропустить")}</button>
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:13.5,color:"var(--text4)"}}>← → или пробел для навигации • Esc — закрыть</div>
      </div>
    </div>
  );
}


// ── SimulationModal ──
function SimulationModal({mapData,allProjectMaps,onClose,theme="dark"}){
  const{t}=useLang();
  const STATUS=getSTATUS(t);
  const[params,setParams]=useState({plannedResult:"",plannedMetric:"",revenue:500000,team:5,budget:50000,timeline:"6 месяцев"});
  const[secMapId,setSecMapId]=useState("");
  const[simState,setSimState]=useState("idle");
  const[results,setResults]=useState({});
  const[secResults,setSecResults]=useState({});
  const[activeId,setActiveId]=useState(null);
  const[log,setLog]=useState([{role:"sys",text:"Опишите желаемый результат, установите параметры и нажмите ▶ Запустить"}]);
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
    const acc={},sacc={};
    setSimState("running");setActiveId(null);setResults({});setSecResults({});setFinal(null);
    const p=pRef.current;
    const inEdges=buildInEdges(mapData.edges||[]);
    const inEdgesSec=secMap?buildInEdges(secMap.edges||[]):{};
    setLog([
      {role:"start",text:`▶ Запуск · ${ordered.length} шагов`},
      ...(p.plannedResult?[{role:"plan",text:`🎯 Цель: "${p.plannedResult}"${p.plannedMetric?" · "+p.plannedMetric:""}`}]:[]),
      {role:"sys",text:`💰 $${(+p.budget).toLocaleString()} · 👥 ${p.team} чел. · ⏱ ${p.timeline||"не указан"}`}
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
      const dep=r.autoFail?" (заблокирован)":r.depPenalty>15?` (−${r.depPenalty}%)`:"";
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
      const planAchievement=avg>=80?"перевыполнен":avg>=60?"выполнен":avg>=40?"частично выполнен":"не выполнен";
      const f={avg,revenueAchieved,budgetUsed,failNodes,planAchievement,secAvg};
      setFinal(f);
      addLog(`📊 Средний score: ${avg}% · Выручка: $${revenueAchieved.toLocaleString()} · ${planAchievement.toUpperCase()}`,"result");
      if(secAvg!==null)addLog(`📊 Сценарий Б: ${secAvg}% ${secAvg>avg?"(лучше на "+(secAvg-avg)+"%)":`(хуже на ${avg-secAvg}%)`}`,"result");
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
Дай краткий конкретный анализ: почему такой результат и что изменить.`}]);
        addLog(`✦ ${txt}`,"ai");
      }catch{
        addLog("✦ Проверьте узкие места и повысьте прогресс критических шагов.","ai");
      }
      setAiLoad(false);
    }
  }

  function pauseSim(){pauseRef.current=true;setSimState("paused");addLog("⏸ Пауза","sys");}
  function resumeSim(){pauseRef.current=false;setSimState("running");addLog("▶ Продолжаем…","sys");}
  function stopSim(){runRef.current=false;pauseRef.current=false;setSimState("idle");setActiveId(null);setResults({});setSecResults({});setFinal(null);setLog([{role:"sys",text:"Установите параметры и нажмите ▶ Запустить"}]);}
  async function askAI(){
    if(!aiInp.trim()||aiLoad)return;
    const q=aiInp;setAiInp("");addLog(`👤 ${q}`,"user");setAiLoad(true);
    const ctx=final?`Симуляция: итог ${final.avg}%, план ${final.planAchievement}.`:"";
    try{const r=await callAI([{role:"user",content:`${ctx} Вопрос: ${q}`}]);addLog(`✦ ${r}`,"ai");}
    catch{addLog(`✦ ${t("ai_sim_error","Ошибка AI-консультанта")}`,"ai");}
    setAiLoad(false);
  }

  const isRunning=simState==="running",isPaused=simState==="paused",isFinished=simState==="finished";
  const progress=ordered.length?Math.round(Object.keys(results).length/ordered.length*100):0;
  const OC={success:"#10b981",partial:"#f59e0b",fail:"#ef4444"};
  const fi={width:"100%",padding:"8px 10px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit"};

  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",flexDirection:"column",zIndex:300,backdropFilter:"blur(16px)",animation:"fadeIn .2s ease"}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{fontSize:15,fontWeight:900,color:"var(--text)",flex:1}}>⎇ Симуляция · {mapData.name||"Карта"}</div>
        {isRunning&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--text3)"}}><div style={{width:10,height:10,borderRadius:"50%",background:"#10b981",animation:"pulse 1s infinite"}}/>{progress}% завершено</div>}
        {isFinished&&final&&<div style={{fontSize:13,color:final.avg>=60?"#10b981":"#f59e0b",fontWeight:700}}>{final.planAchievement.toUpperCase()} · {final.avg}%</div>}
        <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Left: params */}
        <div style={{width:240,flexShrink:0,borderRight:"1px solid var(--border)",overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 Желаемый результат</div>
            <textarea value={params.plannedResult} onChange={e=>setParams(p=>({...p,plannedResult:e.target.value}))} rows={2} placeholder="Например: Выйти на $100k MRR" style={{...fi,resize:"none"}} disabled={isRunning||isPaused}/>
          </div>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>📊 Целевая метрика</div>
            <input value={params.plannedMetric} onChange={e=>setParams(p=>({...p,plannedMetric:e.target.value}))} placeholder="100k MRR / 1000 клиентов" style={fi} disabled={isRunning||isPaused}/>
          </div>
          {[["💰 Бюджет ($)","budget","number"],["👥 Команда (чел)","team","number"],["💵 Целевая выручка ($)","revenue","number"],["⏱ Срок","timeline","text"]].map(row=>{
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
              <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>⎇ Сравнить с картой</div>
              <select value={secMapId} onChange={e=>setSecMapId(e.target.value)} style={{...fi,cursor:"pointer"}} disabled={isRunning||isPaused}>
                <option value="">Без сравнения</option>
                {otherMaps.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
            {!isRunning&&!isPaused&&<button onClick={startSim} style={{padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>▶ Запустить</button>}
            {isRunning&&<button onClick={pauseSim} style={{padding:"9px",borderRadius:9,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.08)",color:"#f59e0b",fontSize:13,fontWeight:700,cursor:"pointer"}}>⏸ Пауза</button>}
            {isPaused&&<button onClick={resumeSim} style={{padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#10b981,#0ea5e9)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>▶ Продолжить</button>}
            {(isRunning||isPaused)&&<button onClick={stopSim} style={{padding:"9px",borderRadius:9,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#ef4444",fontSize:13,fontWeight:700,cursor:"pointer"}}>■ Стоп</button>}
            {isFinished&&<button onClick={stopSim} style={{padding:"9px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",fontSize:13,fontWeight:700,cursor:"pointer"}}>↺ Заново</button>}
          </div>
        </div>
        {/* Center: map + gantt tabs */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",gap:2,padding:"8px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
            {[["map","🗺 Карта"],["gantt","📅 Ганнт"]].map(item=>{
              const k=item[0],lbl=item[1];
              return <button key={k} onClick={()=>setCenterTab(k)} style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${centerTab===k?"rgba(99,102,241,.4)":"transparent"}`,background:centerTab===k?"rgba(99,102,241,.1)":"transparent",color:centerTab===k?"#818cf8":"var(--text4)",cursor:"pointer",fontSize:13,fontWeight:centerTab===k?700:500}}>{lbl}</button>;
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
                  {(mapData.nodes||[]).filter(n=>n.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).map(n=>{
                    const st=STATUS[n.status]||STATUS.planning;
                    const r=results[n.id];
                    const OC2={success:"#10b981",partial:"#f59e0b",fail:"#ef4444"};
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
                  const strokeC=r?OC[r.outcome]:isActive?"#0ea5e9":"var(--node-stroke)";
                  return(
                    <g key={n.id}>
                      <rect x={n.x} y={n.y} width={240} height={64} rx={10} fill={fillC} stroke={strokeC} strokeWidth={isActive||r?2:1} style={isActive&&!r?{animation:"nodeBlink 1s infinite"}:{}}/>
                      <text x={n.x+12} y={n.y+22} fontSize={12} fontWeight={700} fill="var(--text)" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{(n.title||"").slice(0,24)}</text>
                      {r&&<text x={n.x+12} y={n.y+44} fontSize={11} fill={OC[r.outcome]} style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{r.score}% · {r.outcome==="success"?"✅":r.outcome==="partial"?"⚠️":"❌"}</text>}
                      {isActive&&!r&&<text x={n.x+12} y={n.y+44} fontSize={10} fill="#0ea5e9" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{t("analyzing_short","анализ…")}</text>}
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
                  {(mapData.nodes||[]).filter(n=>n.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).map(n=>{
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
              const colors={sys:"var(--text4)",start:"#0ea5e9",plan:"#8b5cf6",step:"var(--text3)",result:"#f59e0b",ai:"#a5b4fc",user:"var(--text)"};
              return <div key={i} style={{fontSize:13.5,lineHeight:1.6,color:colors[entry.role]||"var(--text3)",fontFamily:entry.role==="result"||entry.role==="start"?"'JetBrains Mono',monospace":"inherit"}}>{entry.text}</div>;
            })}
            {aiLoad&&<div style={{display:"flex",gap:4,padding:"6px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div>}
            <div ref={logRef}/>
          </div>
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--border)",flexShrink:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--text4)",marginBottom:6}}>✦ Спросить AI</div>
            <div style={{display:"flex",gap:6}}>
              <input value={aiInp} onChange={e=>setAiInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askAI();}} placeholder="Вопрос о симуляции…" style={{flex:1,padding:"7px 10px",fontSize:13,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:8,color:"var(--text)",outline:"none",fontFamily:"inherit"}}/>
              <button onClick={askAI} disabled={!aiInp.trim()||aiLoad} style={{width:30,height:30,borderRadius:8,border:"none",background:aiInp.trim()&&!aiLoad?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface)",color:aiInp.trim()&&!aiLoad?"#fff":"var(--text4)",cursor:aiInp.trim()&&!aiLoad?"pointer":"not-allowed",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
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
  const endRef=useRef(null);
  const sysPrompt=`Ты — стратегический консультант. Проводишь краткое интервью для создания персональной стратегической карты проекта "${project?.name||""}".
Правила: по одному вопросу, конкретно и кратко. Выявляй: продукт/сервис, ЦА, узкое место роста, главный риск, следующий шаг.
После 6-го ответа ответь ТОЛЬКО: READY`;
  const mapSys=`Создай стратегическую карту. Верни ТОЛЬКО JSON без markdown:
{"nodes":[{"id":"n1","x":200,"y":270,"title":"...","reason":"...","metric":"...","status":"active","priority":"high","progress":35,"tags":[]}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"requires","label":""}]}
7–9 узлов, конкретные названия, X:150–900, Y:80–520.`;

  useEffect(()=>{askNext([]);},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  async function askNext(hist){
    setLoading(true);
    try{
      const reply=await callAI(hist.length===0?[{role:"user",content:"Начни интервью."}]:hist,sysPrompt,300);
      if(reply.trim()==="READY"||hist.length>=MAX_Q*2){await buildMap(hist);}
      else{setMsgs(m=>[...m,{role:"ai",text:reply.trim()}]);setQCount(q=>q+1);setLoading(false);}
    }catch{
      setMsgs(m=>[...m,{role:"ai",text:`Расскажите о проекте "${project?.name}" — что создаёте и для кого?`}]);
      setQCount(1);setLoading(false);
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
    setGenerating(true);
    setMsgs(m=>[...m,{role:"ai",text:"Строю персональную карту…"}]);
    const ctx=hist.filter(h=>h.content).map(h=>(h.role==="user"?"Пользователь: ":"AI: ")+h.content).join("\n");
    try{
      const raw=await callAI([{role:"user",content:"Интервью:\n"+ctx+"\n\nСоздай карту."}],mapSys,1500);
      const data=JSON.parse(raw.replace(/```json|```/g,"").trim());
      onDone({nodes:data.nodes||[],edges:data.edges||[],ctx});
    }catch{
      onDone({nodes:defaultNodes(),edges:[],ctx});
    }
  }
  const pct=Math.min(100,Math.round(qCount/MAX_Q*100));
  return(
    <div data-theme={theme} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",flexDirection:"column",zIndex:250,backdropFilter:"blur(20px)",animation:"fadeIn .2s ease"}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>AI создаёт карту · {project?.name}</div>
          <div style={{height:3,borderRadius:2,background:"var(--surface2)",marginTop:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:2,transition:"width .4s"}}/>
          </div>
        </div>
        <button onClick={()=>setShowSkipConfirm(true)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text4)",cursor:"pointer",fontSize:13}}>{t("skip","Пропустить")}</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:12,maxWidth:680,margin:"0 auto",width:"100%"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10}}>
            {m.role==="ai"&&<div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✦</div>}
            <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"3px 12px 12px 12px",background:m.role==="user"?"rgba(99,102,241,.18)":"var(--surface)",border:`1px solid ${m.role==="user"?"rgba(99,102,241,.3)":"var(--border)"}`,fontSize:13.5,lineHeight:1.65,color:"var(--text)",whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
        {(loading||generating)&&<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div><div style={{display:"flex",gap:4,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"3px 12px 12px 12px"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`thinkDot 1.4s ease ${i*.2}s infinite`}}/>)}</div></div>}
        <div ref={endRef}/>
      </div>
      {!generating&&(
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,maxWidth:680,margin:"0 auto",width:"100%"}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} placeholder="Ваш ответ…" style={{flex:1,padding:"11px 16px",fontSize:14,background:"var(--input-bg)",border:"1px solid var(--input-border)",borderRadius:12,color:"var(--text)",outline:"none",fontFamily:"inherit"}} disabled={loading}/>
          <button onClick={submit} disabled={!inp.trim()||loading} style={{padding:"11px 22px",borderRadius:12,border:"none",background:inp.trim()&&!loading?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--surface)",color:inp.trim()&&!loading?"#fff":"var(--text4)",fontSize:14,fontWeight:700,cursor:inp.trim()&&!loading?"pointer":"not-allowed"}}>
            {qCount>=MAX_Q?"Создать ✦":"Ответить →"}
          </button>
        </div>
      )}
      {showSkipConfirm&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
          <div style={{background:"var(--bg2)",borderRadius:16,padding:"24px 28px",maxWidth:360,border:"1px solid var(--border)",animation:"scaleIn .2s ease",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8}}>Пропустить интервью?</div>
            <div style={{fontSize:13.5,color:"var(--text3)",marginBottom:20}}>Карта будет создана с примерными шагами. AI-интервью помогает сделать её персонализированной.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowSkipConfirm(false)} style={{padding:"9px 20px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:600}}>{t("continue_btn","Продолжить")}</button>
              <button onClick={onSkip} style={{padding:"9px 20px",borderRadius:9,border:"none",background:"rgba(239,68,68,.1)",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:700}}>{t("skip","Пропустить")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ImportJSON (helper) ──
function useImportJSON(onImport){
  const fileRef=useRef(null);
  function trigger(){fileRef.current?.click();}
  function renderInput(){
    return(
      <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>{
        const f=e.target.files[0];if(!f)return;
        const r=new FileReader();
        r.onload=ev=>{
          try{
            const d=JSON.parse(ev.target.result);
            if(d.nodes||d.edges){onImport({nodes:d.nodes||[],edges:d.edges||[],name:d.name||f.name.replace(".json","")});}
          }catch{alert(t("json_invalid","Некорректный JSON файл"));}
          e.target.value="";
        };
        r.readAsText(f);
      }}/>
    );
  }
  return{trigger,renderInput};
}


// ── SplashScreen ──
function SplashScreen({onDone,theme}){
  const{t}=useLang();
  const[pct,setPct]=useState(0);
  useEffect(()=>{
    const tid=setTimeout(()=>{
      let p=0;
      const iv=setInterval(()=>{
        p+=Math.random()*18+8;
        setPct(Math.min(100,Math.round(p)));
        if(p>=100){clearInterval(iv);setTimeout(onDone,200);}
      },100);
      return()=>clearInterval(iv);
    },300);
    return()=>clearTimeout(tid);
  },[]);
  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg,#070b14)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse 80% 60% at 50% 50%,rgba(99,102,241,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{animation:"float 3s ease infinite",marginBottom:32}}>
        <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 16px 60px rgba(99,102,241,.6)"}}>✦</div>
      </div>
      <div style={{fontSize:36,fontWeight:900,color:"var(--text,#e2e8f0)",letterSpacing:-1.5,marginBottom:6,animation:"slideUp .5s ease"}}>Strategy AI</div>
      
      <div style={{width:240,height:3,borderRadius:2,background:"rgba(99,102,241,.15)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:2,transition:"width .1s linear"}}/>
      </div>
      <div style={{marginTop:10,fontSize:13,color:"var(--text4)",fontWeight:600}}>{pct < 100 ? t("loading",t("loading_short","Загрузка…")) : "Готово ✓"}</div>
    </div>
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

// ── LandingPage — full interactive landing with Three.js + sparkles ──
function LandingPage({onGetStarted,theme,lang="ru",onChangeLang}){
  const{t}=useLang();
  const[navSolid,setNavSolid]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const isMobile=useIsMobile();
  const pageRef=useRef(null);

  // ── NAV solid on scroll + unlock body scroll ──
  useEffect(()=>{
    document.body.style.overflow='auto';
    const onS=()=>setNavSolid(window.scrollY>55);
    window.addEventListener('scroll',onS,{passive:true});
    return()=>{document.body.style.overflow='hidden';window.removeEventListener('scroll',onS);};
  },[]);

  // ── IntersectionObserver — kept for optional progressive enhancement ──
  // (removed — all sections now visible via CSS animation)

  // ── Count-up for metrics ──
  useEffect(()=>{
    const obs=new IntersectionObserver(es=>{
      es.forEach(e=>{
        if(!e.isIntersecting)return;
        const el=e.target,end=+el.dataset.to,dur=1900,s=performance.now();
        (function tick(now){const p=Math.min((now-s)/dur,1),ease=1-Math.pow(1-p,4);el.textContent=Math.round(ease*end);if(p<1)requestAnimationFrame(tick);})(s);
        obs.unobserve(el);
      });
    },{threshold:.55});
    document.querySelectorAll('.lcnt').forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[]);

  // ── Hero parallax ──
  useEffect(()=>{
    const h1=document.querySelector('.lhero-h1');
    const hp=document.querySelector('.lhero-p');
    const hb=document.querySelector('.lhero-btns');
    const hs=document.querySelector('.lshimmer');
    const onS=()=>{
      const y=window.scrollY;
      if(y<window.innerHeight*1.2){
        if(h1)h1.style.transform=`translateY(${y*.12}px)`;
        if(hp)hp.style.transform=`translateY(${y*.07}px)`;
        if(hb)hb.style.transform=`translateY(${y*.05}px)`;
        if(hs)hs.style.transform=`translateY(${y*.09}px)`;
      }
    };
    window.addEventListener('scroll',onS,{passive:true});
    return()=>window.removeEventListener('scroll',onS);
  },[]);

  // ── 3D tilt on cards ──
  useEffect(()=>{
    const cards=document.querySelectorAll('.lgc,.ltc,.lprc,.lpc');
    const handlers=[];
    cards.forEach(card=>{
      const mm=e=>{const b=card.getBoundingClientRect();const x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;card.style.transform=`perspective(900px) rotateY(${x*7}deg) rotateX(${-y*5}deg)`;card.style.zIndex='8';};
      const ml=()=>{card.style.transform='';card.style.zIndex='';};
      card.addEventListener('mousemove',mm);card.addEventListener('mouseleave',ml);
      handlers.push({card,mm,ml});
    });
    return()=>handlers.forEach(({card,mm,ml})=>{card.removeEventListener('mousemove',mm);card.removeEventListener('mouseleave',ml);});
  },[]);

  const FEATS=[
    {n:"01",title:t("lf1_title","Стратегические карты"),desc:t("lf1_desc","Причинно-следственные связи между решениями и результатами. Drag-and-drop узлы, зависимости, метрики, дедлайны на одном интерактивном canvas.")},
    {n:"02",title:t("lf2_title","AI-консультант"),desc:t("lf2_desc","SWOT, OKR, First Principles, BCG-матрица, Porter's Five Forces. AI задаёт правильные вопросы и вскрывает системные ограничения вашего бизнеса.")},
    {n:"03",title:t("lf3_title","Симуляция сценариев"),desc:t("lf3_desc","Три версии будущего до принятия решения. Каскадный анализ последствий. Видьте узкие места прежде, чем они станут кризисом.")},
    {n:"04",title:t("lf4_title","Gantt-таймлайн"),desc:t("lf4_desc","Временная шкала, критический путь, роли и зоны ответственности. Стратегия не как идея, а как план с конкретными дедлайнами.")},
    {n:"05",title:t("lf5_title","Командная работа"),desc:t("lf5_desc","Роли, комментарии, история изменений, автосохранение. Стратегия как живой командный документ, а не PDF в чьей-то папке.")},
    {n:"06",title:t("lf6_title","Health Score аналитика"),desc:t("lf6_desc","Сводная оценка здоровья стратегии в одном числе. Приоритеты, риски, прогресс по узлам. Управляйте через данные.")},
  ];
  const STEPS=[
    {n:"I",  tag:t("lstep1_tag","Шаг первый"), title:t("lstep1_title","AI-интервью"),     desc:t("lstep1_desc","Шесть точных вопросов. AI выявляет цели, скрытые риски и системные ограничения — то, что консалтинг находит за неделю и $50 000.")},
    {n:"II", tag:t("lstep2_tag","Шаг второй"), title:t("lstep2_title","Построение карты"), desc:t("lstep2_desc","Персональная стратегическая карта с причинно-следственными узлами, метриками, приоритетами и временными горизонтами. За 30 секунд.")},
    {n:"III",tag:t("lstep3_tag","Шаг третий"), title:t("lstep3_title","Консультация"),    desc:t("lstep3_desc","Конкретные следующие шаги, расчёт рисков, альтернативные сценарии. Без воды — только применимые к вашей ситуации решения.")},
  ];
  const TESTI=[
    {q:t("lt1_q","Strategy AI структурировал хаос из идей в чёткий план за двадцать минут. Раньше это стоило консалтинга на десятки тысяч долларов и занимало месяц."),name:"Алексей К.",role:t("lt1_role","CEO, Series A стартап")},
    {q:t("lt2_q","Инструмент, который мыслит как McKinsey. Карты, сценарии и Gantt в одном месте изменили наш product-процесс фундаментально."),name:"Мария Д.",role:t("lt2_role","CPO, B2B SaaS")},
    {q:t("lt3_q","Симуляция сценариев — это отдельный класс. Мы теперь входим в любые переговоры с тремя готовыми исходами вместо одного."),name:"Тимур Р.",role:t("lt3_role","Управляющий партнёр")},
  ];
  const PRICING=[
    {tier:"Free",   price:"0",  mo:t("per_month","/мес"),desc:t("lpr1_desc","Для знакомства с инструментом"),hot:false,
     feats:[t("lpr1_f1","1 проект и 1 стратегическая карта"),t("lpr1_f2","AI-интервью и генерация карты"),t("lpr1_f3","Gantt-таймлайн"),t("lpr1_f4","PNG / JSON экспорт")],
     cta:t("start_free_cta","Начать бесплатно"),btnCls:"lp-ghost"},
    {tier:"Starter",price:"9",  mo:t("per_month","/мес"),desc:t("lpr_starter_desc","Мягкий вход в стратегическое планирование"),hot:false,
     feats:[t("lpr_starter_f1","3 проекта, 3 карты каждый"),t("lpr_starter_f2","2 сценария + AI анализ рисков"),t("lpr_starter_f3","Полный Gantt + приоритеты"),t("lpr_starter_f4","1 500 AI-сообщений / мес")],
     cta:t("lpr_starter_cta","Начать за $9 →"),btnCls:"lp-ghost"},
    {tier:"Pro",    price:"29", mo:t("per_month","/мес"),desc:t("lpr2_desc","Для профессионалов и команд"),hot:true,
     feats:[t("lpr2_f1","10 проектов, 5 карт каждая"),t("lpr2_f2","SWOT, OKR, BCG, Porter AI-анализ"),t("lpr2_f3","5 сценариев + симуляция последствий"),t("lpr2_f4","Клонирование и версионирование карт"),t("lpr2_f5","Командная работа до 3 человек")],
     cta:t("lpr2_cta","Перейти на Pro →"),btnCls:"lp-fill"},
    {tier:"Enterprise",price:"149+",mo:t("per_month","/мес"),desc:t("lpr3_desc","Для организаций с системным подходом"),hot:false,
     feats:[t("lpr3_f1","Без ограничений: проекты, карты, сценарии"),t("lpr3_f2","C-level AI коллегиум (5 экспертных ролей)"),t("lpr3_f3","PPTX-отчёты для совета директоров"),t("lpr3_f4","White-label и API-интеграции"),t("lpr3_f5","Выделенный менеджер поддержки")],
     cta:t("lpr3_cta","Связаться"),btnCls:"lp-ghost"},
  ];

  const NAV_LINKS=[[t("nav_features","Возможности"),"#lfeatures"],[t("nav_process","Процесс"),"#lprocess"],[t("nav_pricing","Тарифы"),"#lpricing"]];
  const MARQUEE_ITEMS=[t("lf1_title","Стратегические карты"),t("lf2_title","AI-консультант"),t("lf3_title","Симуляция сценариев"),t("lf4_title","Gantt-таймлайн"),t("health_score","Health Score"),t("lf5_title","Командная работа"),"McKinsey-level AI"];

  const tag=(label)=>(
    <div style={{display:"flex",alignItems:"center",gap:12,fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#6366f1",letterSpacing:3,textTransform:"uppercase",marginBottom:22}}>
      <div style={{width:18,height:1,background:"#6366f1"}}/>{label}
    </div>
  );

  const sH2=(html)=><h2 style={{fontSize:"clamp(40px,5.5vw,68px)",fontWeight:900,letterSpacing:-2.5,lineHeight:1.0,color:"#f0eeff",marginBottom:18}} dangerouslySetInnerHTML={{__html:html}}/>;

  const LANDING_CSS=`
    body{overflow:auto!important;}
    .lpage{font-family:'Plus Jakarta Sans',sans-serif;background:#03030a;color:#f0eeff;overflow-x:hidden;width:100%;min-height:100vh;}
    /* scroll reveal — elements are VISIBLE by default, animation is additive */
    .lrv{animation:lrvUp 1s cubic-bezier(.16,1,.3,1) both;}
    .lrv-l{animation:lrvLeft 1s cubic-bezier(.16,1,.3,1) both;}
    .lrv-r{animation:lrvRight 1s cubic-bezier(.16,1,.3,1) both;}
    .lrv-sc{animation:lrvScale 1s cubic-bezier(.16,1,.3,1) both;}
    @keyframes lrvUp{from{opacity:0;transform:translateY(44px)}to{opacity:1;transform:none}}
    @keyframes lrvLeft{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}
    @keyframes lrvRight{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}
    @keyframes lrvScale{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
    /* grid cells — animate in with delay based on data-i */
    .lgc,.ltc,.lprc,.lmc,.lpc{animation:lrvUp .9s cubic-bezier(.16,1,.3,1) both;}
    .lgc:nth-child(1),.ltc:nth-child(1),.lprc:nth-child(1),.lmc:nth-child(1),.lpc:nth-child(1){animation-delay:.05s}
    .lgc:nth-child(2),.ltc:nth-child(2),.lprc:nth-child(2),.lmc:nth-child(2),.lpc:nth-child(2){animation-delay:.13s}
    .lgc:nth-child(3),.ltc:nth-child(3),.lprc:nth-child(3),.lmc:nth-child(3),.lpc:nth-child(3){animation-delay:.21s}
    .lgc:nth-child(4),.ltc:nth-child(4),.lmc:nth-child(4){animation-delay:.29s}
    .lgc:nth-child(5),.ltc:nth-child(5){animation-delay:.37s}
    .lgc:nth-child(6),.ltc:nth-child(6){animation-delay:.45s}
    /* grid cell hover bottom line */
    .lgc,.ltc,.lprc,.lpc{position:relative;overflow:hidden;}
    .lgc::after,.ltc::before,.lprc::after,.lpc::after{content:'';position:absolute;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,#6366f1,transparent);transform:scaleX(0);transform-origin:center;transition:transform .5s;}
    .lgc::after{bottom:0;}.ltc::before{top:0;}.lprc::after{bottom:0;}.lpc::after{bottom:0;}
    .lgc:hover::after,.ltc:hover::before,.lprc:hover::after,.lpc:hover::after{transform:scaleX(1);}
    /* hover bg */
    .lgc:hover,.ltc:hover,.lpc:hover{background:#07060f!important;}
    .lprc:hover:not(.lhot){background:#07060f!important;}
    /* ── Gradient title + bright desc on hover ── */
    @keyframes lGradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    /* metrics cards */
    .lmc .lmc-val{transition:color .25s;}
    .lmc:hover .lmc-val{
      background:linear-gradient(90deg,#818cf8,#c4b5fd,#38bdf8,#818cf8);
      background-size:300% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:lGradShift 4s ease infinite;
    }
    .lmc .lmc-desc{color:rgba(240,238,255,.35);transition:color .25s;}
    .lmc:hover .lmc-desc{color:rgba(240,238,255,.82);}
    /* feature grid cards */
    .lgc .lgc-title{transition:color .2s;}
    .lgc:hover .lgc-title{
      background:linear-gradient(90deg,#818cf8,#a78bfa,#38bdf8,#818cf8);
      background-size:300% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:lGradShift 4.5s ease infinite;
    }
    .lgc .lgc-desc{color:rgba(240,238,255,.38);transition:color .25s;line-height:1.7;}
    .lgc:hover .lgc-desc{color:rgba(240,238,255,.85);}
    /* process cards */
    .lpc .lpc-title{transition:color .2s;}
    .lpc:hover .lpc-title{
      background:linear-gradient(90deg,#818cf8,#c4b5fd,#7dd3fc,#818cf8);
      background-size:300% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:lGradShift 4s ease infinite;
    }
    .lpc .lpc-desc{color:rgba(240,238,255,.38);transition:color .25s;line-height:1.7;}
    .lpc:hover .lpc-desc{color:rgba(240,238,255,.82);}
    /* testimonials */
    .ltc .ltc-quote{color:rgba(240,238,255,.5);transition:color .3s;line-height:1.72;}
    .ltc:hover .ltc-quote{color:rgba(240,238,255,.9);}
    .ltc .ltc-name{transition:color .2s;}
    .ltc:hover .ltc-name{
      background:linear-gradient(90deg,#a78bfa,#818cf8,#38bdf8,#a78bfa);
      background-size:300% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:lGradShift 5s ease infinite;
    }
    .ltc .ltc-role{color:rgba(240,238,255,.2);transition:color .25s;}
    .ltc:hover .ltc-role{color:rgba(240,238,255,.52);}
    /* pricing */
    .lprc .lprc-title{color:rgba(240,238,255,.28);transition:color .2s;}
    .lprc:hover .lprc-title,.lprc.lhot .lprc-title{color:rgba(240,238,255,.75);}
    .lprc:hover .lprc-title{
      background:linear-gradient(90deg,#818cf8,#a78bfa,#38bdf8,#818cf8);
      background-size:300% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:lGradShift 4s ease infinite;
    }
    .lprc .lprc-desc{color:rgba(240,238,255,.38);transition:color .25s;}
    .lprc:hover .lprc-desc{color:rgba(240,238,255,.75);}
    .lprc .lprc-feat{color:rgba(240,238,255,.45);transition:color .2s;}
    .lprc:hover .lprc-feat{color:rgba(240,238,255,.78);}
    /* marquee */
    @keyframes lmarquee{to{transform:translateX(-50%);}}
    .lmarquee-track{display:flex;gap:0;animation:lmarquee 30s linear infinite;width:max-content;}
    .lmarquee-track:hover{animation-play-state:paused;}
    /* hero word rise */
    @keyframes lrise{from{transform:translateY(100%)}to{transform:translateY(0)}}
    .lword{display:inline-block;}
    .linner{display:inline-block;animation:lrise .9s cubic-bezier(.16,1,.3,1) both;}
    /* buttons */
    .lbtn-prim{padding:17px 46px;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 16px 50px rgba(99,102,241,.56);transition:all .28s;letter-spacing:-.2px;}
    .lbtn-prim:hover{transform:translateY(-3px);box-shadow:0 26px 66px rgba(99,102,241,.74);}
    .lbtn-sec{padding:16px 38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#f0eeff;font-size:16px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .28s;}
    .lbtn-sec:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.22);transform:translateY(-2px);}
    .lp-ghost{width:100%;padding:14px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.1);color:#f0eeff;transition:all .25s;}
    .lp-ghost:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.22);}
    .lp-fill{width:100%;padding:14px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;box-shadow:0 8px 28px rgba(99,102,241,.44);transition:all .25s;}
    .lp-fill:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(99,102,241,.68);}
    /* grad text */
    @keyframes lGradFlow{0%{background-position:0% 50%}33%{background-position:100% 50%}66%{background-position:50% 100%}100%{background-position:0% 50%}}
    .lgrad{background:linear-gradient(135deg,#6366f1,#a78bfa,#67e8f9,#a78bfa,#6366f1);background-size:300% 300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lGradFlow 3.5s linear infinite;}
    @keyframes lscrollPulse{0%,100%{opacity:.4}50%{opacity:1}}
    @keyframes lblink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}
    .lscrollbar{animation:lscrollPulse 2.2s ease infinite;}
    .lbadgedot{animation:lblink 2s ease infinite;}
    /* section delay classes */
    .ld1{animation-delay:.1s!important}.ld2{animation-delay:.2s!important}.ld3{animation-delay:.3s!important}
  `;

  return(
    <div className="lpage" data-theme={theme}>
      <style>{CSS}</style>
      <style>{LANDING_CSS}</style>

      {/* Stars background — full page fixed */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}>
        <SparklesCanvas density={180} speed={0.4} minSz={0.3} maxSz={1.1} color="#ffffff" style={{opacity:.35}}/>
      </div>

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,inset:"0 0 auto 0",zIndex:300,height:66,display:"flex",alignItems:"center",padding:isMobile?"0 16px":"0 60px",gap:isMobile?12:36,
        background:navSolid?"rgba(3,3,10,.93)":"transparent",
        backdropFilter:navSolid?"blur(32px)":"none",
        borderBottom:navSolid?"1px solid rgba(255,255,255,.06)":"none",
        transition:"background .5s,border-color .5s"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 6px 22px rgba(99,102,241,.5)",transition:"transform .4s",cursor:"pointer"}} onMouseOver={e=>e.currentTarget.style.transform="rotate(90deg) scale(1.1)"} onMouseOut={e=>e.currentTarget.style.transform=""}>✦</div>
          <span style={{fontSize:17,fontWeight:900,letterSpacing:-.5,color:"#f0eeff"}}>Strategy AI</span>
        </div>
        {!isMobile&&(
          <>
        {NAV_LINKS.map(([label,href])=>(
          <button key={href} onClick={()=>{const el=document.querySelector(href);if(el)el.scrollIntoView({behavior:'smooth'});setMenuOpen(false);}} style={{fontSize:13,color:"rgba(240,238,255,.45)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",transition:"color .2s"}} onMouseOver={e=>e.currentTarget.style.color="#f0eeff"} onMouseOut={e=>e.currentTarget.style.color="rgba(240,238,255,.45)"}>{label}</button>
        ))}
        {/* Lang switcher */}
        <div style={{display:"flex",alignItems:"center",gap:3,padding:"4px 5px",borderRadius:9,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)"}}>
          {[["RU","ru"],["EN","en"],["UZ","uz"]].map(([label,code])=>(
            <button key={code} onClick={()=>onChangeLang&&onChangeLang(code)}
              style={{padding:"4px 9px",borderRadius:6,border:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,letterSpacing:.8,cursor:"pointer",transition:"all .18s",
                background:lang===code?"rgba(99,102,241,.3)":"transparent",
                color:lang===code?"#a5b4fc":"rgba(240,238,255,.35)"}}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={()=>{onGetStarted();setMenuOpen(false);}} style={{padding:"8px 22px",borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#f0eeff",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .25s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,.07)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{t("sign_in","Войти")}</button>
        <button onClick={()=>{onGetStarted();setMenuOpen(false);}} style={{padding:"9px 26px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 22px rgba(99,102,241,.42)",transition:"all .25s"}} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 34px rgba(99,102,241,.65)";}} onMouseOut={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 22px rgba(99,102,241,.42)";}}>{t("start_free","Начать бесплатно")}</button>
          </>
        )}
        {isMobile&&(
          <>
            <button onClick={()=>setMenuOpen(m=>!m)} style={{width:40,height:40,borderRadius:10,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#f0eeff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}} aria-label="Меню">
              {menuOpen?"×":"☰"}
            </button>
            {menuOpen&&(
              <div style={{position:"fixed",top:66,left:0,right:0,bottom:0,zIndex:299,background:"rgba(3,3,10,.95)",backdropFilter:"blur(20px)",padding:"24px 20px",display:"flex",flexDirection:"column",gap:8,animation:"slideDown .2s ease"}}>
                {NAV_LINKS.map(([label,href])=>(
                  <button key={href} onClick={()=>{const el=document.querySelector(href);if(el)el.scrollIntoView({behavior:'smooth'});setMenuOpen(false);}} style={{padding:"14px 0",fontSize:16,color:"#f0eeff",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,.08)"}}>{label}</button>
                ))}
                <div style={{display:"flex",gap:8,padding:"16px 0"}}>
                  {[["RU","ru"],["EN","en"],["UZ","uz"]].map(([label,code])=>(
                    <button key={code} onClick={()=>onChangeLang&&onChangeLang(code)} style={{padding:"8px 14px",borderRadius:8,border:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,cursor:"pointer",background:lang===code?"rgba(99,102,241,.3)":"rgba(255,255,255,.08)",color:lang===code?"#a5b4fc":"#f0eeff"}}>{label}</button>
                  ))}
                </div>
                <button onClick={()=>{onGetStarted();setMenuOpen(false);}} style={{padding:"14px",borderRadius:10,border:"1px solid rgba(255,255,255,.2)",background:"transparent",color:"#f0eeff",fontSize:15,cursor:"pointer",fontFamily:"inherit",marginTop:"auto"}}>{t("sign_in","Войти")}</button>
                <button onClick={()=>{onGetStarted();setMenuOpen(false);}} style={{padding:"14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("start_free","Начать бесплатно")}</button>
              </div>
            )}
          </>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{position:"relative",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"100px 60px 90px",overflow:"hidden",zIndex:1}}>
        {/* glow */}
        <div style={{position:"absolute",top:"-10%",left:"50%",transform:"translateX(-50%)",width:1000,height:650,background:"radial-gradient(ellipse 65% 60% at 50% 40%,rgba(99,102,241,.1) 0%,transparent 68%)",filter:"blur(56px)",zIndex:2,pointerEvents:"none"}}/>
        {/* mask */}
        <div style={{position:"absolute",inset:0,zIndex:3,background:"radial-gradient(ellipse 72% 65% at 50% 50%,rgba(3,3,10,.8) 0%,rgba(3,3,10,.18) 70%,transparent 100%)",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:4,display:"flex",flexDirection:"column",alignItems:"center",maxWidth:880}}>
          {/* badge */}
          {/* headline */}
          <h1 className="lhero-h1" style={{fontSize:"clamp(60px,10vw,122px)",fontWeight:900,letterSpacing:-4,lineHeight:.92,marginBottom:36,color:"#f0eeff"}}>
            <span style={{display:"block",animation:"slideUp .9s .2s both"}}>{t("strategy_hero","Стратегия,")}</span>
            <span className="lgrad" style={{display:"block",animation:"slideUp .9s .35s both, lGradFlow 3.5s ease infinite"}}>{t("which_word","которая")}</span>
            <span className="lgrad" style={{display:"block",animation:"slideUp .9s .5s both, lGradFlow 3.5s ease infinite"}}>{t("wins_word","побеждает")}</span>
          </h1>
          {/* shimmer lines */}
          <div className="lshimmer" style={{position:"relative",width:600,maxWidth:"92vw",height:8,margin:"2px 0 38px",animation:"slideUp .8s .72s both"}}>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,width:"76%",height:2,filter:"blur(2.5px)",background:"linear-gradient(90deg,transparent,#6366f1,transparent)"}}/>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:2,width:"76%",height:1,background:"linear-gradient(90deg,transparent,#6366f1,transparent)"}}/>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,width:"32%",height:5,filter:"blur(3px)",background:"linear-gradient(90deg,transparent,#67e8f9,transparent)"}}/>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:2,width:"32%",height:1,background:"linear-gradient(90deg,transparent,#67e8f9,transparent)"}}/>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:-6,width:"100%",height:20,background:"radial-gradient(ellipse 50% 100% at 50% 50%,transparent 20%,#03030a 85%)"}}/>
          </div>
          {/* subtext */}
          <p className="lhero-p" style={{fontSize:18,fontWeight:300,color:"rgba(240,238,255,.55)",lineHeight:1.8,maxWidth:540,marginBottom:54,animation:"slideUp .8s .72s both"}}>
            {t("hero_sub","AI анализирует ваш бизнес, строит стратегическую карту и даёт консультацию уровня McKinsey. Для тех, кто принимает решения с последствиями.")}
          </p>
          {/* buttons */}
          <div className="lhero-btns" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",animation:"slideUp .8s .88s both"}}>
            <button className="lbtn-prim" onClick={onGetStarted}>{t("create_map_free","Создать карту бесплатно ✦")}</button>
            <button className="lbtn-sec" onClick={()=>{const el=document.getElementById("lprocess");if(el)el.scrollIntoView({behavior:"smooth"});}}>{t("watch_demo","Смотреть демо →")}</button>
          </div>
        </div>

      </section>

      {/* ── MARQUEE ── */}
      <div style={{overflow:"hidden",borderTop:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"22px 0",position:"relative",zIndex:2}}>
        <div className="lmarquee-track">
          {[...MARQUEE_ITEMS,...MARQUEE_ITEMS].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"0 40px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(240,238,255,.22)",letterSpacing:2,textTransform:"uppercase",whiteSpace:"nowrap"}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:"#6366f1",display:"inline-block",flexShrink:0}}/>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── METRICS ── */}
      <div style={{position:"relative",zIndex:2,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",maxWidth:1280,margin:"0 auto"}}>
          {[{to:2,sfx:t("lm1_sfx","мин"),lbl:t("lm1_lbl","от вопроса до первой стратегической карты")},{to:94,sfx:"%",lbl:t("lm2_lbl","точность AI-анализа на тестовых кейсах McKinsey")},{to:5,sfx:"",lbl:t("lm3_lbl","уровней экспертной глубины — от Free до Enterprise")},{to:null,sfx:"∞",lbl:t("lm4_lbl","сценариев для анализа альтернативных исходов")}].map((m,i)=>(
            <div key={i} className="lmc" style={{padding:"58px 44px",borderRight:i<3?"1px solid rgba(255,255,255,.06)":undefined,transition:"background .38s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(99,102,241,.05)"} onMouseOut={e=>e.currentTarget.style.background=""}>
              <div className="lmc-val" style={{fontSize:70,fontWeight:900,letterSpacing:-3.5,lineHeight:.88,color:"#f0eeff",marginBottom:14,display:"flex",alignItems:"flex-end",gap:3}}>
                {m.to?<span className="lcnt" data-to={m.to}>0</span>:<span style={{fontSize:64,letterSpacing:-2}}>{m.sfx}</span>}
                {m.to&&<sup style={{fontSize:28,fontWeight:300,color:"rgba(240,238,255,.25)",marginBottom:8}}>{m.sfx}</sup>}
              </div>
              <div className="lmc-desc" style={{fontSize:13.5,lineHeight:1.65,maxWidth:175}}>{m.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="lfeatures" style={{padding:"130px 0",position:"relative",zIndex:2}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 60px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,marginBottom:72,alignItems:"end"}}>
            <div className="lrv-l">
              {tag(t("tag_features","Возможности"))}
              <h2 style={{fontSize:"clamp(40px,5.5vw,68px)",fontWeight:900,letterSpacing:-2.5,lineHeight:1.0,color:"#f0eeff",marginBottom:18}}>{t("tools_label","Инструментарий")}<br/>{t("strategic_word","стратегического")}<br/><span className="lgrad">{t("feat_leader_word","лидера")}</span></h2>
            </div>
            <p className="lrv-r" style={{fontSize:15,fontWeight:300,color:"rgba(240,238,255,.55)",lineHeight:1.85,maxWidth:440,alignSelf:"end"}}>{t("feat_sub","Каждый инструмент создан для людей, которые принимают решения с последствиями. Не для экспериментов — для результата.")}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,.06)"}}>
            {FEATS.map((f,i)=>(
              <div key={i} className="lgc" style={{background:"#03030a",padding:"46px 42px",cursor:"default",transition:"background .35s"}} onMouseOver={e=>e.currentTarget.style.background="#07060f"} onMouseOut={e=>e.currentTarget.style.background="#03030a"}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(240,238,255,.2)",letterSpacing:2,display:"block",marginBottom:28}}>{f.n}</span>
                <div className="lgc-title" style={{fontSize:20,fontWeight:700,color:"#f0eeff",marginBottom:12,letterSpacing:-.3,lineHeight:1.2}}>{f.title}</div>
                <div className="lgc-desc" style={{fontSize:13.5,lineHeight:1.8}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section id="lprocess" style={{padding:"0 0 130px",position:"relative",zIndex:2}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 60px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,marginBottom:72,alignItems:"end"}}>
            <div className="lrv-l">
              {tag(t("tag_process","Процесс"))}
              <h2 style={{fontSize:"clamp(40px,5.5vw,68px)",fontWeight:900,letterSpacing:-2.5,lineHeight:1.0,color:"#f0eeff",marginBottom:18}}>{t("three_steps","Три шага")}<br/>{t("to_working","до рабочей")}<br/><span className="lgrad">{t("proc_heading_end","стратегии")}</span></h2>
            </div>
            <p className="lrv-r" style={{fontSize:15,fontWeight:300,color:"rgba(240,238,255,.55)",lineHeight:1.85,maxWidth:440,alignSelf:"end"}}>{t("proc_sub","Никаких шаблонов. AI строит карту с нуля, опираясь исключительно на контекст вашего бизнеса.")}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,.06)"}}>
            {STEPS.map((s,i)=>(
              <div key={i} className="lpc" style={{background:"#03030a",padding:"58px 46px",cursor:"default",transition:"background .35s"}} onMouseOver={e=>e.currentTarget.style.background="#07060f"} onMouseOut={e=>e.currentTarget.style.background="#03030a"}>
                <div style={{position:"absolute",top:16,right:26,fontSize:116,fontWeight:900,color:"rgba(99,102,241,.055)",lineHeight:1,letterSpacing:-5,pointerEvents:"none",userSelect:"none"}}>{s.n}</div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(240,238,255,.25)",letterSpacing:3,textTransform:"uppercase",display:"block",marginBottom:24}}>{s.tag}</span>
                <div className="lpc-title" style={{fontSize:28,fontWeight:800,color:"#f0eeff",marginBottom:14,letterSpacing:-.5,lineHeight:1.1}}>{s.title}</div>
                <div className="lpc-desc" style={{fontSize:13.5,lineHeight:1.82}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{padding:"0 0 130px",position:"relative",zIndex:2}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 60px"}}>
          <div className="lrv" style={{marginBottom:72}}>
            {tag(t("tag_testimonials","Отзывы"))}
            <h2 style={{fontSize:"clamp(40px,5.5vw,68px)",fontWeight:900,letterSpacing:-2.5,lineHeight:1.0,color:"#f0eeff",marginBottom:18}}>{t("speaks_word","Говорят те,")}<br/>{t("who_word","кто")} <span className="lgrad">{t("testi_checked","проверил")}</span></h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,.06)"}}>
            {TESTI.map((tc,i)=>(
              <div key={i} className="ltc" style={{background:"#03030a",padding:"54px 44px",cursor:"default",transition:"background .35s"}} onMouseOver={e=>e.currentTarget.style.background="#07060f"} onMouseOut={e=>e.currentTarget.style.background="#03030a"}>
                <div className="ltc-quote" style={{fontSize:21,fontWeight:300,fontStyle:"italic",lineHeight:1.6,marginBottom:36,letterSpacing:-.12}}>{`«${tc.q}»`}</div>
                <div style={{width:22,height:1,background:"rgba(240,238,255,.15)",marginBottom:22}}/>
                <div className="ltc-name" style={{fontSize:14,fontWeight:600,color:"#f0eeff"}}>{tc.name}</div>
                <div className="ltc-role" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,letterSpacing:2,textTransform:"uppercase",marginTop:5}}>{tc.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="lpricing" style={{padding:"0 0 130px",position:"relative",zIndex:2}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 60px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,marginBottom:72,alignItems:"end"}}>
            <div className="lrv-l">
              {tag(t("tag_pricing_label","Тарифы"))}
              <h2 style={{fontSize:"clamp(40px,5.5vw,68px)",fontWeight:900,letterSpacing:-2.5,lineHeight:1.0,color:"#f0eeff",marginBottom:18}}>{t("pricing_start_word","Начните")}<br/>{t("for_free","бесплатно.")}<br/><span className="lgrad">{t("no_limits","Без лимитов.")}</span></h2>
            </div>
            <p className="lrv-r" style={{fontSize:15,fontWeight:300,color:"rgba(240,238,255,.55)",lineHeight:1.85,maxWidth:440,alignSelf:"end"}}>{t("pricing_sub","Первая карта и первый AI-анализ бесплатны. Платите только когда убедились в ценности инструмента.")}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"rgba(255,255,255,.06)",alignItems:"start"}}>
            {PRICING.map((p,i)=>(
              <div key={i} className={`lprc${p.hot?" lhot":""}`} style={{background:p.hot?"#070520":"#03030a",padding:"44px 36px",position:"relative",cursor:"default",transition:"background .35s"}} onMouseOver={e=>{if(!p.hot)e.currentTarget.style.background="#07060f";}} onMouseOut={e=>e.currentTarget.style.background=p.hot?"#070520":"#03030a"}>
                {p.hot&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>}
                {p.hot&&<div style={{position:"absolute",top:18,right:18,padding:"3px 12px",borderRadius:100,background:"rgba(99,102,241,.18)",border:"1px solid rgba(99,102,241,.3)",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#818cf8",letterSpacing:2,textTransform:"uppercase"}}>{t("pricing_hot_badge","★ ТОП")}</div>}
                <span className="lprc-title" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:p.hot?"#818cf8":"rgba(240,238,255,.3)",letterSpacing:3,textTransform:"uppercase",display:"block",marginBottom:26}}>{p.tier}</span>
                <div style={{display:"flex",alignItems:"flex-end",gap:4,marginBottom:6}}>
                  <span style={{fontSize:p.tier==="Enterprise"?48:64,fontWeight:900,letterSpacing:p.tier==="Enterprise"?-1:-3,lineHeight:.88,color:"#f0eeff",...(p.hot?{background:"linear-gradient(135deg,#818cf8,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{})}}>{p.price}</span>
                  <span style={{fontSize:17,fontWeight:300,color:"rgba(240,238,255,.25)",marginBottom:10}}>{p.mo}</span>
                </div>
                <div className="lprc-desc" style={{fontSize:13,marginBottom:32,paddingBottom:32,borderBottom:"1px solid rgba(255,255,255,.06)",lineHeight:1.6}}>{p.desc}</div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:12,marginBottom:36,padding:0}}>
                  {p.feats.map((f,j)=>(
                    <li key={j} className="lprc-feat" style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:13.5,transition:"color .2s"}}>
                      <span style={{color:"rgba(240,238,255,.22)",flexShrink:0,marginTop:1}}>—</span>{f}
                    </li>
                  ))}
                </ul>
                <button className={p.btnCls} onClick={onGetStarted}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{padding:"0 0 130px",position:"relative",zIndex:2}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 60px"}}>
          <div className="lrv-sc" style={{border:"1px solid rgba(255,255,255,.07)",padding:"120px 80px",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1.5,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.6),transparent)"}}/>
            {/* sparkles inside CTA */}
            <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
              <SparklesCanvas density={90} speed={.7} minSz={.3} maxSz={1.1} color="#818cf8" style={{opacity:.45}}/>
            </div>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 88% 88% at 50% 50%,rgba(3,3,10,.88) 28%,rgba(3,3,10,.6) 100%)",zIndex:1,pointerEvents:"none"}}/>
            <div style={{position:"relative",zIndex:2}}>
              <h2 style={{fontSize:"clamp(48px,6.8vw,88px)",fontWeight:900,letterSpacing:-3.5,lineHeight:.88,color:"#f0eeff",marginBottom:22}}>
                {t("cta_h1","Первый шаг")}<br/>{t("cta_h2","занимает")}<br/><span className="lgrad">{t("cta_h3","две минуты")}</span>
              </h2>
              <p style={{fontSize:17,fontWeight:300,color:"rgba(240,238,255,.45)",lineHeight:1.78,maxWidth:500,margin:"0 auto 52px"}}>
                {t("cta_sub","Создайте первую стратегическую карту прямо сейчас. Без кредитной карты. Без шаблонов — только ваш бизнес и AI.")}
              </p>
              <button className="lbtn-prim" onClick={onGetStarted} style={{fontSize:17,padding:"18px 54px"}}>{t("start_work","Начать работу →")}</button>
              <div style={{display:"flex",gap:32,justifyContent:"center",marginTop:30,flexWrap:"wrap"}}>
                {[t("cta_trust1","Бесплатно навсегда"),t("cta_trust2","Без кредитной карты"),t("cta_trust3","Данные только ваши")].map(lbl=>(
                  <div key={lbl} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(240,238,255,.25)",letterSpacing:1,display:"flex",alignItems:"center",gap:9}}>
                    <span style={{color:"#10b981",fontWeight:700}}>—</span>{lbl}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"38px 60px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>✦</div>
          <span style={{fontSize:15,fontWeight:800,color:"#f0eeff",letterSpacing:-.3}}>Strategy AI</span>
        </div>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"rgba(240,238,255,.2)",letterSpacing:2.5,textTransform:"uppercase"}}>© 2026 STRATEGY AI</span>
      </footer>
    </div>
  );
}
// ── WelcomeScreen (Auth) ──
function WelcomeScreen({onLogin,onRegister,onBack,theme}){
  const{t}=useLang();
  return(
    <div data-theme={theme} style={{width:"100vw",height:"100vh",background:"var(--bg,#070b14)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      {/* Backgrounds */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"50px 50px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 65%)",top:"50%",left:"50%",transform:"translate(-50%,-50%)",filter:"blur(80px)",pointerEvents:"none"}}/>
      {/* Back button */}
      <button onClick={onBack} style={{position:"absolute",top:24,left:24,display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s"}} onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="#e2e8f0";}} onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="#94a3b8";}}>{t("back_btn","← Назад")}</button>
      {/* Auth card */}
      <div style={{width:"min(96vw,440px)",animation:"scaleIn .3s cubic-bezier(.34,1.56,.64,1)"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",boxShadow:"0 16px 48px rgba(99,102,241,.6)",animation:"float 3s ease infinite"}}>✦</div>
          <div style={{fontSize:28,fontWeight:900,color:"#e2e8f0",letterSpacing:-1,marginBottom:6}}>Strategy AI</div>
          <div style={{fontSize:14,color:"#64748b"}}>{t("login_or_register","Войдите или создайте аккаунт бесплатно")}</div>
        </div>
        {/* Card */}
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:24,border:"1px solid rgba(255,255,255,.1)",padding:"36px",backdropFilter:"blur(20px)"}}>
          {/* Buttons */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
            <button onClick={onRegister}
              style={{padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 10px 32px rgba(99,102,241,.5)",transition:"all .2s",letterSpacing:-.2}}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 16px 44px rgba(99,102,241,.6)";}}
              onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,.5)";}}>
              {t("ws_start_btn","Начать бесплатно ✦")}
            </button>
            <button onClick={onLogin}
              style={{padding:"15px",borderRadius:14,border:"1.5px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.04)",color:"#e2e8f0",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all .2s",letterSpacing:-.2}}
              onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,.09)";e.currentTarget.style.borderColor="rgba(255,255,255,.28)";}}
              onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.borderColor="rgba(255,255,255,.15)";}}>
              {t("ws_login_btn","Уже есть аккаунт — Войти →")}
            </button>
          </div>
          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/>
            <span style={{fontSize:13,color:"var(--text4)",fontWeight:600,letterSpacing:.5}}>{t("included_free","ВКЛЮЧЕНО БЕСПЛАТНО")}</span>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/>
          </div>
          {/* Features grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["🗺",t("ws_feat1","Карты целей")],["✦",t("ws_feat2","AI советник")],["📅",t("ws_feat3","Gantt-план")],["⬇",t("ws_feat4","PNG/JSON экспорт")],["⎇",t("ws_feat5","1 сценарий")],["📌",t("ws_feat6","До 5 шагов")]].map(([ic,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:11,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ic}</span>
                <span style={{fontSize:13.5,color:"#94a3b8",fontWeight:600}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:13,color:"var(--text4)"}}>
          {t("ws_terms","Нажимая «Начать», вы соглашаетесь с условиями использования")}
        </div>
      </div>
    </div>
  );
}

// ── App ──
export default function App(){
  const[screen,setScreen]=useState("splash");
  const[user,setUser]=useState<any>(null);
  const[theme,setTheme]=useState(()=>{try{return localStorage.getItem("sa_theme")||"dark";}catch{return"dark";}});
  const[palette,setPalette]=useState(()=>{try{return localStorage.getItem("sa_palette")||"indigo";}catch{return"indigo";}});
  const[project,setProject]=useState(null);
  const[mapData,setMapData]=useState(null);
  const[mapIsNew,setMapIsNew]=useState(false);
  const[mapReadOnly,setMapReadOnly]=useState(false);
  const[sharedMapData,setSharedMapData]=useState(null);
  const[showAuth,setShowAuth]=useState(false);
  const[authTab,setAuthTab]=useState("login");
  const[showProfile,setShowProfile]=useState(false);
  const[showTiers,setShowTiers]=useState(false);
  const[verifiedToast,setVerifiedToast]=useState(false);
  const[paymentToast,setPaymentToast]=useState(false);
  const[lang,setLang]=useState(()=>{try{return localStorage.getItem("sa_lang")||"ru";}catch{return"ru";}});
  function changeLang(l:string){setLang(l);localStorage.setItem("sa_lang",l);}
  // Синхронизация темы и палитры из профиля пользователя (при загрузке с API)
  useEffect(()=>{
    if(!user?.theme&&!user?.palette)return;
    if(user.theme){setTheme(user.theme);try{localStorage.setItem("sa_theme",user.theme);}catch{}}
    if(user.palette){setPalette(user.palette);try{localStorage.setItem("sa_palette",user.palette);}catch{}}
  },[user?.email]);
  // t функция для LangCtx.Provider (App является корневым провайдером)
  const t=(k:string,fb?:string)=>{
    try{const L=(LANGS as any);return(L[lang]||L.ru)?.[k]||fb||k;}catch{return fb||k;}
  };

  useEffect(()=>{
    (async()=>{
      // Проверяем share-ссылку в URL (поддерживаем и hash и query param)
      const searchParams=new URLSearchParams(window.location.search);
      const shareFromQuery=searchParams.get("share");
      const hash=typeof window!=="undefined"?window.location.hash:"";
      const shareFromHash=hash.startsWith("#share=")?hash.slice(7).replace(/\?.*/,"").trim():"";
      const shareId=shareFromQuery||shareFromHash;

      // Обработка успешной оплаты через Stripe
      // tier из URL не используем — берём актуальный tier с сервера после /me
      const paymentStatus=searchParams.get("payment");
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
          if(data&&data.map){setSharedMapData(data);setScreen("sharedMap");return;}
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
              setUser(normalizeUser(d.user));
              if(paymentStatus==="success"){
                setPaymentToast(true);
                setTimeout(()=>setPaymentToast(false),4000);
              }
              setScreen("projects");return;
            }
          }catch(e:any){
            if(e.message==="session_expired"){clearJWT();clearRefreshToken();}
          }
        }
      } else {
        const sess=await getSession();
        if(sess?.email){
          const accs=await store.get("sa_acc")||[];
          const u=(accs as any[]).find((a:any)=>a.email===sess.email);
          if(u){setUser(u);setScreen("projects");return;}
        }
      }
      setScreen("landing");
    })();
  },[]);

  // Глобальный обработчик истёкшей сессии
  useEffect(()=>{
    const orig=window.fetch.bind(window);
    (window as any).__sa_onSessionExpired=()=>{
      setUser(null);setScreen("landing");setShowAuth(true);setAuthTab("login");
    };
    return()=>{};
  },[]);

  async function handleAuth(u:any,isNew:boolean){
    setUser(u);setShowAuth(false);
    if(isNew){setShowTiers(true);}
    else{setScreen("projects");}
  }

  async function onChangeTier(t){
    if(!user)return;
    const updated=await patchUser(user.email,{tier:t});
    if(updated)setUser(updated);
    setShowTiers(false);
    if(screen!=="projects"&&screen!=="project"&&screen!=="map")setScreen("projects");
  }

  async function onLogout(){
    await clearSession();
    setUser(null);setProject(null);setMapData(null);
    setScreen("landing");
  }

  function onSelectProject(p){
    setProject(p);setScreen("project");
  }

  async function onOpenMap(map,proj,isNew,readOnlyMap=false){
    setProject(proj);
    const fresh=await getMaps(proj.id);
    const m=fresh.find(x=>x.id===map.id)||map;
    setMapData(m);setMapIsNew(isNew||false);setMapReadOnly(readOnlyMap);setScreen("map");
  }

  function toggleTheme(){const next=t=>t==="dark"?"light":"dark";setTheme(t=>{const n=next(t);try{localStorage.setItem("sa_theme",n);}catch{};if(API_BASE&&user?.email)patchUser(user.email,{theme:n}).catch(()=>{});return n;});}
  function changePalette(p:string){setPalette(p);try{localStorage.setItem("sa_palette",p);}catch{};if(API_BASE&&user?.email)patchUser(user.email,{palette:p}).catch(()=>{});}

  if(showTiers){
    return(
      <LangCtx.Provider value={{lang,setLang:changeLang,t}}>
        <div data-theme={theme} data-palette={palette} style={{minHeight:"100vh",background:"var(--bg)"}}>
          <TierSelectionScreen isNew={true} currentUser={user} theme={theme} palette={palette}
            onSelect={onChangeTier}
            onBack={()=>{setShowTiers(false);setScreen("projects");}}
          />
        </div>
      </LangCtx.Provider>
    );
  }

  const appPalette=screen==="landing"?undefined:palette;
  return(
    <LangCtx.Provider value={{lang,setLang:changeLang,t}}>
      <div data-theme={theme} data-palette={appPalette} style={{minHeight:"100vh",background:"var(--bg)",transition:"background .25s ease, color .25s ease"}}>
      <style>{CSS}</style>
      <>
        {screen==="splash"&&<SplashScreen onDone={()=>setScreen("landing")} theme={theme}/>}
        {screen==="landing"&&<LandingPage theme={theme} lang={lang} onChangeLang={changeLang} onGetStarted={()=>setScreen("welcome")}/>}
        {screen==="sharedMap"&&sharedMapData&&(
          <MapEditor
            user={null} mapData={sharedMapData.map} project={{name:sharedMapData.projectName||""}}
            isNew={false} theme={theme} readOnly={true}
            onBack={()=>{setSharedMapData(null);setScreen("landing");if(typeof window!=="undefined")window.history.replaceState("","",window.location.pathname);}}
            onProfile={()=>{}}
            onToggleTheme={toggleTheme}
          />
        )}
        {screen==="welcome"&&(
          <>
            <WelcomeScreen theme={theme} onBack={()=>setScreen("landing")} onLogin={()=>{setAuthTab("login");setShowAuth(true);}} onRegister={()=>{setAuthTab("register");setShowAuth(true);}}/>
            {showAuth&&<AuthModal initialTab={authTab} theme={theme} onClose={()=>setShowAuth(false)} onAuth={handleAuth}/>}
          </>
        )}
        {screen==="projects"&&user&&(
          <>
            <TrialBanner user={user} onUpgrade={()=>setShowProfile(true)}/>
            <EmailVerifyBanner user={user}/>
            <ProjectsPage
              user={user} theme={theme}
              onSelectProject={onSelectProject}
              onLogout={onLogout}
              onChangeTier={(t:string)=>onChangeTier(t)}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={(u:any)=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </>
        )}
        {screen==="project"&&user&&project&&(
          <>
            <ProjectDetail
              user={user} project={project} theme={theme}
              onBack={()=>setScreen("projects")}
              onOpenMap={onOpenMap}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
              onChangeTier={onChangeTier}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={u=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </>
        )}
        {screen==="map"&&user&&mapData&&project&&(
          <>
            <MapEditor
              user={user} mapData={mapData} project={project}
              isNew={mapIsNew} theme={theme} readOnly={mapReadOnly}
              onBack={()=>setScreen("project")}
              onProfile={()=>setShowProfile(true)}
              onToggleTheme={toggleTheme}
            />
            {showProfile&&<ProfileModal user={user} theme={theme} palette={palette} onPaletteChange={changePalette} onClose={()=>setShowProfile(false)} onUpdate={u=>setUser(u)} onChangeTier={onChangeTier} onLogout={onLogout} onToggleTheme={toggleTheme}/>}
          </>
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