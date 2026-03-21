# Strategy AI — Design System & Developer Prompt

> **Назначение:** Этот документ — полная спецификация дизайн-системы Strategy AI. Любой AI-помощник, читая его, должен понимать как добавлять новые функции, экраны и компоненты в едином стиле — с теми же цветами, анимациями, CSS-паттернами и структурой кода.

---

## 1. Технический стек

- **Один HTML-файл** — весь CSS + JS + HTML inline, без сборщиков и npm
- **Язык:** Vanilla JS (ES2022), никаких фреймворков
- **Шрифт:** `Inter` (Google Fonts) — веса 300, 400, 500, 600, 700, 800
- **AI:** Anthropic API `claude-sonnet-4-20250514`, max_tokens 500–1000
- **Размер файла:** ~3800 строк, можно расширять
- **Структура:** `<style>` → HTML-тело → `<script>` — всё в одном `index.html`

---

## 2. Дизайн-токены (CSS-переменные)

### Базовые цвета (`:root`)
```css
:root {
  --acc:    #6836f5;   /* Основной акцент — фиолетовый */
  --acc2:   #a050ff;   /* Акцент светлее */
  --green:  #12c482;
  --amber:  #f09428;
  --red:    #f04458;
  --cyan:   #06b6d4;
  --tr:     .26s cubic-bezier(.4,0,.2,1);  /* Transition по умолчанию */
}
```

### Тёмная тема (`.dk`)
```css
.dk {
  --bg:       #050410;
  --sb:       rgba(9,7,22,.84);       /* Sidebar */
  --top:      rgba(7,5,18,.7);        /* Topbar */
  --card:     rgba(255,255,255,.058); /* Карточка */
  --card2:    rgba(255,255,255,.09);  /* Карточка hover */
  --b0:       rgba(255,255,255,.06);  /* Граница dim */
  --b1:       rgba(255,255,255,.1);   /* Граница normal */
  --b2:       rgba(255,255,255,.16);  /* Граница accent */
  --bh:       rgba(104,54,245,.5);    /* Граница hover */
  --t1:       #eaeaf8;                /* Текст primary */
  --t2:       rgba(188,186,224,.56);  /* Текст secondary */
  --t3:       rgba(148,144,196,.28);  /* Текст muted */
  --inp:      rgba(255,255,255,.06);  /* Input background */
  --tag:      rgba(255,255,255,.07);  /* Tag background */
  --rowh:     rgba(255,255,255,.024); /* Table row hover */
  --shc:      none;                   /* Card shadow */
  --shh:      0 14px 44px rgba(0,0,0,.4); /* Hover shadow */
  --canvas-bg:#06041a;
}
```

### Светлая тема (`.lt`)
```css
.lt {
  --bg:    #ece9ff;
  --sb:    rgba(255,255,255,.88);
  --top:   rgba(255,255,255,.82);
  --card:  rgba(255,255,255,.82);
  --card2: rgba(255,255,255,.98);
  --b1:    rgba(104,80,220,.16);
  --t1:    #08061a;
  --t2:    rgba(35,28,80,.78);
  --t3:    rgba(70,58,130,.48);
  --shc:   0 2px 12px rgba(78,55,180,.1), 0 0 0 .5px rgba(104,80,220,.14);
  --shh:   0 12px 36px rgba(78,55,180,.2), 0 2px 8px rgba(78,55,180,.1);
}
```

---

## 3. Компоненты — CSS-шаблоны

### Карточка (стандартная)
```css
.my-card {
  background: var(--card);
  backdrop-filter: blur(20px);
  border: .5px solid var(--b1);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shc);
  transition: all .25s;
  position: relative;
  overflow: hidden;
}
/* Световой блик сверху */
.my-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255,255,255,.07), transparent 55%);
  pointer-events: none;
}
.lt .my-card::after {
  background: linear-gradient(145deg, rgba(255,255,255,.8), rgba(255,255,255,.05) 42%, transparent 68%);
}
.lt .my-card {
  background: rgba(255,255,255,.76);
  border-color: rgba(104,80,220,.18);
}
.my-card:hover {
  border-color: var(--bh);
  transform: translateY(-3px);
  box-shadow: var(--shh);
}
```

### Кнопки
```css
/* Основная фиолетовая */
.btn-p {
  height: 36px;
  padding: 0 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, #6836f5, #a050ff);
  color: #fff;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(104,54,245,.4);
  transition: all .2s;
}
.btn-p:hover {
  box-shadow: 0 6px 24px rgba(104,54,245,.58);
  transform: translateY(-1px);
}
/* Large */
.btn-p.lg { height: 48px; font-size: 14px; padding: 0 28px; border-radius: 28px; }

/* Ghost кнопка */
.btn-g {
  height: 36px;
  padding: 0 16px;
  border-radius: 22px;
  background: var(--bg-btn);
  color: var(--col-btn);
  border: .5px solid var(--brd-btn);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all .18s;
}
.btn-g:hover {
  background: var(--bg-btn-h);
  color: var(--t1);
}
```

### Input / Textarea
```css
.my-input {
  width: 100%;
  background: var(--inp);
  border: .5px solid var(--b1);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--t1);
  font-family: inherit;
  outline: none;
  transition: border-color .18s, box-shadow .18s;
}
.my-input:focus {
  border-color: rgba(104,54,245,.5);
  box-shadow: 0 0 0 3px rgba(104,54,245,.12);
}
.lt .my-input { background: rgba(255,255,255,.6); }
```

### Badge / тег
```css
.tag-item {
  display: inline-flex;
  align-items: center;
  background: var(--tag);
  border: .5px solid var(--b1);
  border-radius: 20px;
  padding: 2px 9px;
  font-size: 10.5px;
  color: var(--t2);
  font-weight: 500;
}
/* Цветной badge */
.badge-green { background: rgba(18,196,130,.12); color: var(--green); }
.badge-amber { background: rgba(240,148,40,.12);  color: var(--amber); }
.badge-red   { background: rgba(240,68,88,.1);    color: var(--red); }
.badge-acc   { background: rgba(104,54,245,.12);  color: var(--acc); }
```

### Toggle переключатель
```css
.s-toggle {
  width: 36px; height: 20px;
  border-radius: 20px;
  background: var(--tag);
  cursor: pointer;
  position: relative;
  transition: background .2s;
  flex-shrink: 0;
}
.s-toggle.on { background: var(--green); }
.s-toggle::after {
  content: '';
  position: absolute;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  top: 3px; left: 3px;
  transition: transform .2s;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.s-toggle.on::after { transform: translateX(16px); }
```

### Экранный контейнер (`.scr`)
```css
/* Используется внутри каждого screen для scrollable контента */
.scr {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.scr::-webkit-scrollbar { width: 4px; }
.scr::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 4px; }

/* Section label */
.slbl {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: .1em;
  font-weight: 600;
  margin: 16px 0 8px;
  padding: 0 2px;
}

/* Inline card */
.card {
  background: var(--card);
  border: .5px solid var(--b1);
  border-radius: 14px;
  backdrop-filter: blur(16px);
  box-shadow: var(--shc);
  margin-bottom: 4px;
}
.lt .card { background: rgba(255,255,255,.72); border-color: rgba(104,80,220,.14); }
```

---

## 4. Анимации

### CSS-анимации (уже определены в файле)
```css
/* Fade + translateY вход */
@keyframes scr-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}
/* Использование: animation: scr-in .2s ease both */

/* Орбы фона */
@keyframes f1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(18px,-18px) scale(1.09)} }
@keyframes f2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,14px) scale(1.07)} }

/* Появление сообщения чата */
@keyframes msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Индикатор typing */
@keyframes ty {
  0%,80%,100% { transform: scale(.6); opacity: .4; }
  40%         { transform: scale(1);  opacity: 1; }
}

/* Gantt bar */
@keyframes bar-in {
  from { transform: scaleX(0); transform-origin: left; }
  to   { transform: scaleX(1); transform-origin: left; }
}
```

### Scroll-reveal (JavaScript IntersectionObserver)
```html
<!-- Добавь класс .sr к элементу -->
<div class="sr sr-up">Контент появится при скролле</div>

<!-- JS автоматически добавит .sr-init (opacity:0) и .in (opacity:1) -->
<!-- Для stagger-эффекта: родитель получает .stagger -->
<div class="stagger">
  <div class="sr sr-up">Item 1 — delay 0ms</div>
  <div class="sr sr-up">Item 2 — delay 70ms</div>
  <div class="sr sr-up">Item 3 — delay 140ms</div>
</div>
```

### Toast уведомления
```javascript
// Цвета: 'purple', 'green', 'red', 'amber', 'cyan'
showToast('Сообщение здесь', 'green');
showToast('Ошибка', 'red');
showToast('Обновлено', 'purple');
```

---

## 5. App Shell — структура HTML

```
#v-landing  — Лендинг (background:transparent, видны орбы)
#v-tier     — Выбор тарифа
#v-app      — Основное приложение
  #app-shell
    #sb       — Sidebar (214px)
    #main
      #banner-* — Баннеры (demo/trial/email)
      #topbar   — Топбар
      #screens  — Контейнер экранов
        .screen  — Каждый экран (display:none → .on → display:flex)
```

### Добавление нового экрана
```html
<!-- 1. Добавь screen в #screens -->
<div class="screen" id="s-myscreen">
  <div class="scr">
    <div class="slbl">Section title</div>
    <!-- контент -->
  </div>
</div>

<!-- 2. Добавь nav item в sidebar -->
<div class="ni" id="ni-myscreen" onclick="goApp('myscreen',this)">
  <svg><!-- иконка 15x15 --></svg>
  My Screen
</div>
```

```javascript
// 3. Добавь в screenTitles и screenSubs
const screenTitles = { ..., myscreen: 'My Screen' };
const screenSubs   = { ..., myscreen: 'Description here' };

// 4. Добавь render в goApp()
else if(id === 'myscreen') { renderMyScreen(); }

// 5. Напиши render функцию
function renderMyScreen() {
  const cont = document.getElementById('s-myscreen');
  if(!cont) return;
  cont.innerHTML = `...`;
}
```

---

## 6. Правила glassmorphism

Все карточки, модалки, сайдбар, топбар используют:
- `background: var(--sb)` или `var(--card)` — полупрозрачные
- `backdrop-filter: blur(20px–50px)` — эффект стекла
- `border: .5px solid var(--b1)` — тонкая граница
- `border-radius: 12–20px` — скруглённые углы
- `::after` псевдоэлемент с `linear-gradient(145deg, rgba(255,255,255,.07), transparent 55%)` — световой блик

**Никогда не используй** непрозрачные solid цвета для карточек кроме случаев когда явно нужен solid контейнер (`.view{background:var(--bg)}`).

---

## 7. Иконки

Все иконки — inline SVG `15x15px` или `14x14px`, нарисованные вручную, `stroke="currentColor"`, `fill="none"`, `stroke-width="1.2"–"1.4"`. Никаких иконочных шрифтов.

```html
<!-- Пример иконки -->
<svg width="15" height="15" viewBox="0 0 15 15" fill="none">
  <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/>
</svg>
```

---

## 8. Модальные окна

```javascript
// Открыть/закрыть встроенные модалки
openModal('login');     // #modal-login
openModal('register');  // #modal-register
closeOverlay('modal-login');

// Создать кастомную модалку динамически
function openMyModal() {
  const ov = document.createElement('div');
  ov.id = 'my-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(8px)';
  ov.innerHTML = `
    <div style="width:480px;background:var(--sb);backdrop-filter:blur(50px);border:.5px solid var(--b2);border-radius:18px;padding:26px;box-shadow:0 28px 70px rgba(0,0,0,.4)">
      <!-- content -->
      <div onclick="document.getElementById('my-modal').remove()" style="...">×</div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
}
```

**Параметры модалки:**
- Ширина: 440–600px
- `border-radius: 18–20px`
- `padding: 26px`
- `backdrop-filter: blur(50px)`
- Закрытие по клику на overlay

---

## 9. Цвета для данных

| Тип данных     | Цвет         | CSS                      |
|---------------|--------------|--------------------------|
| Goal (Цель)   | Фиолетовый   | `#8864ff` / `var(--acc)` |
| Initiative    | Зелёный      | `var(--green)` = #12c482 |
| KPI           | Янтарный     | `var(--amber)` = #f09428 |
| Risk          | Красный      | `var(--red)` = #f04458   |
| Task          | Голубой      | `var(--cyan)` = #06b6d4  |
| Success       | Зелёный      | `var(--green)`           |
| Warning       | Янтарный     | `var(--amber)`           |
| Error         | Красный      | `var(--red)`             |

---

## 10. Интернационализация (i18n)

Приложение поддерживает EN / RU / UZ.

```javascript
// Добавить переводы для нового экрана
const LAND_LANG = {
  en: { my_key: 'English text' },
  ru: { my_key: 'Русский текст' },
  uz: { my_key: 'O\'zbek matni' }
};

// В HTML используй data-i атрибут
<span data-i="my_key">English text</span>

// Переключение языка происходит автоматически через setLandLang()
```

---

## 11. Правила анимаций hover

**Карточки:**
- `transform: translateY(-3px)` при hover
- `box-shadow: var(--shh)` при hover
- `border-color: var(--bh)` при hover
- Transition: `all .25s`

**Кнопки:**
- Primary: `transform: translateY(-1px)` + усиленный box-shadow
- Ghost: смена background

**Никогда не используй** `rotateX/rotateY` — вызывает чёрный фон в Safari/Chrome при определённых условиях.

---

## 12. Паттерны JavaScript

### Проверка на null (обязательно)
```javascript
// Всегда используй optional chaining
const el = document.getElementById('some-id');
if(el) el.textContent = 'value';
// или
document.getElementById('some-id')?.classList.add('active');
```

### Работа с данными
```javascript
// Данные хранятся в глобальных константах
const PROJECTS = [...];  // Массив проектов
const MAP_NODES = [...]; // Узлы карты
const SCENARIOS = [...]; // Сценарии
const TEAM = [...];      // Команда
const TIERS = [...];     // Тарифные планы

// Текущее состояние
let currentUser = null;
let currentProject = null;
let dark = true;         // Тема
let currentLang = 'en';  // Язык
```

### Anthropic API
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: 'Контекст для AI...',
    messages: [{ role: 'user', content: userText }]
  })
});
const data = await response.json();
const reply = data.content?.[0]?.text || 'Fallback текст';
```

---

## 13. Структура нового feature (чеклист)

При добавлении новой функции:

- [ ] CSS-классы используют `var(--*)` токены, не hardcoded цвета
- [ ] Карточки имеют `::after` блик и `backdrop-filter`
- [ ] Hover: `translateY(-3px)` + `var(--shh)` + `var(--bh)`
- [ ] Кнопки: `.btn-p` или `.btn-g` — не кастомные стили
- [ ] Модалки: динамически созданные через `document.createElement`
- [ ] Все `getElementById` обёрнуты в null-check
- [ ] Тёмная тема: `.lt .my-class { ... }` override добавлен
- [ ] Иконки: inline SVG 15x15, stroke="currentColor"
- [ ] Анимация входа: `animation: scr-in .2s ease both`
- [ ] Текст через `showToast()` при важных действиях
- [ ] Данные добавлены в соответствующий глобальный массив
- [ ] `render*()` функция вызывается из `goApp()`

---

## 14. Что уже реализовано (не дублировать)

- Лендинг (hero, features, how-it-works, testimonials, FAQ, CTA)
- Auth (login/register модалки, seed-аккаунт, localStorage сессии)
- Tier select (5 тарифов: Free, Starter, Pro, Team, Enterprise)
- App shell (sidebar, topbar с поиском, notifications)
- Projects (список, создание через модалку с emoji/цветом)
- Project Card (7 табов: Overview, Maps, Scenarios, Content Plan, AI Hub, Team, Settings)
- Strategy Map (12 узлов, drag, zoom/pan, connect, auto-layout, minimap)
- Node panel (edit title/desc/status/priority/progress/deadline/tags/comments)
- Export (PNG, SVG, JSON, PDF, PPTX preview, Markdown)
- Map Versions (сохранение снепшотов, restore)
- Map Filter bar (поиск, фильтр по статусу, шаблоны, симуляция)
- Scenarios (Aggressive/Balanced/Defensive, activate)
- Timeline (Gantt 8 инициатив)
- AI Advisor (real Anthropic API + fallback, quick questions, tier-aware)
- Insights (KPI cards + 4 AI insight cards)
- Team (список, invite по email)
- Content Plan (Kanban 5 колонок, 9 карточек)
- Settings (7 секций: Account, Billing, Workspace, Integrations, AI, Notifications, Appearance)
- Global Search (Cmd+K, по проектам/узлам/сценариям)
- Notifications panel (6 уведомлений, unread state)
- Weekly Briefing модалка
- Keyboard shortcuts (18 shortcuts + G+X navigation)
- Scenario Simulation (step-by-step)
- Map Templates (8 шаблонов)
- Dark/Light тема
- i18n EN/RU/UZ (лендинг + app)
- Starfield + particle canvas (лендинг фон)
- Scroll-reveal анимации на лендинге
- Shimmer gradient для hero текста
- Seed-аккаунт: `denisblackman2@gmail.com` / `Denis123`

---

## 15. Код для копирования — типовой экран

```javascript
/* ─────────────── MY NEW SCREEN ─────────────── */
function renderMyScreen() {
  const cont = document.getElementById('s-myscreen');
  if(!cont) return;
  
  const data = [
    { id: 1, title: 'Item 1', status: 'active', value: '$10K' },
    { id: 2, title: 'Item 2', status: 'done', value: '$25K' },
  ];
  
  cont.innerHTML = `
    <div class="scr">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="slbl" style="margin:0">Items</div>
        <button class="btn-p" style="height:30px;font-size:11.5px" 
                onclick="showToast('Creating…','green')">+ Add item</button>
      </div>
      
      ${data.map(item => `
        <div class="card" style="margin-bottom:8px;padding:14px 16px;
             display:flex;align-items:center;gap:12px;cursor:pointer;
             transition:all .2s" 
             onclick="showToast('${item.title} opened','purple')"
             onmouseenter="this.style.borderColor='var(--bh)';this.style.transform='translateY(-2px)'"
             onmouseleave="this.style.borderColor='';this.style.transform=''">
          <div style="width:36px;height:36px;border-radius:10px;
               background:rgba(104,54,245,.12);display:flex;
               align-items:center;justify-content:center;font-size:16px">
            📊
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--t1)">${item.title}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">${item.value}</div>
          </div>
          <span class="badge-${item.status === 'done' ? 'green' : 'acc'}" 
                style="background:${item.status==='done'?'rgba(18,196,130,.12)':'rgba(104,54,245,.12)'};
                       color:${item.status==='done'?'var(--green)':'var(--acc)'};
                       border-radius:20px;padding:2px 9px;font-size:10.5px;font-weight:600">
            ${item.status}
          </span>
        </div>
      `).join('')}
      
      <div class="slbl" style="margin-top:20px">Summary</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${[
          { label: 'Total', val: '$35K', color: 'var(--acc)' },
          { label: 'Active', val: '1', color: 'var(--green)' },
          { label: 'Done', val: '1', color: 'var(--amber)' },
        ].map(stat => `
          <div class="card" style="padding:14px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:${stat.color};letter-spacing:-.02em">
              ${stat.val}
            </div>
            <div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;
                        letter-spacing:.09em;margin-top:4px">
              ${stat.label}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}
```

---

## 16. Главное правило

> **Дизайн Strategy AI — это "тёмный космос с фиолетовыми акцентами". Всё должно быть полупрозрачным, размытым, с тонкими границами и плавными анимациями. Ничего резкого, ничего непрозрачного (кроме фона самих view-контейнеров). Hover всегда поднимает элемент на 2–3px вверх. Кнопки всегда pill-shape (border-radius: 22px). Текст всегда через CSS-переменные — никаких hardcoded цветов.**

---

*Документ актуален на 21 марта 2025. Seed-аккаунт: `denisblackman2@gmail.com` / `Denis123`*
