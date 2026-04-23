# Inner Strategist — UI Patterns

Короткий справочник по паттернам, которые сложились после полировки внутрянки
(шаги 0–14). Используйте как чек-лист при добавлении новых экранов/модалок.
Живёт рядом с [`STRATEGY_AI_DESIGN_SYSTEM.md`](./STRATEGY_AI_DESIGN_SYSTEM.md).

---

## Shared primitives (строим «из готовых деталей»)

| Что | Где | Когда использовать |
|-----|-----|---------------------|
| `useNotifications()` | `strategy-ai-full.tsx` | любой экран со шторкой уведомлений / бейджем |
| `IconButton` | `strategy-ai-full.tsx` | круглые 32×32 иконки в топбаре / тулбаре |
| `PillGroup` | `strategy-ai-full.tsx` | выбор из ≤6 вариантов (тип / канал / статус) |
| `contentLabel(arr,id,t,fb)` | `strategy-ai-full.tsx` | перевод ID → локализованной подписи с fallback |
| `useLang() / t(key, fallback)` | `client/i18n/*` | **любой** литерал в UI |
| `useIsMobile()` | `strategy-ai-full.tsx` | ветвления responsive-лэйаута |

Правило: если видишь 2-й инлайн-клон — заводи примитив.

---

## CSS-классы вместо инлайн-стилей

Перед тем как писать `style={{...}}` — проверь `client/global.css` и
`client/strategy-shell.css`. Основные опоры:

- `.modal-box`, `.modal-inp`, `.modal-btn`, `.modal-close`, `.modal-gem`
- `.tabs` + `.tab` (gradient-pill индикатор активности)
- `.glass-panel`, `.glass-panel-xl`, `.glass-card`
- `.btn-p` (primary), `.btn-g` (ghost), `.btn-interactive`
- `.tier-card` — карточки тарифов/сценариев
- `.sa-topbar`, `.sa-map-toolbar-rows`
- `.sa-pill`, `.sa-cp-card`, `.sa-node-card`, `.sa-gantt-row`
- `.sa-tbar-btn`, `.sa-mini-map-wrap`, `.sa-mini-map-vp`
- `.sa-palette-btn`, `.sa-mc-row`, `.sa-trial-banner`, `.sa-trial-flash`
- `.sa-dr-row`, `.sa-dr-close`, `.sa-deadline-rem`

Hover/focus — **только** через `:hover` / `:focus-visible` в CSS, никаких
`e.currentTarget.style = ...`.

---

## Дизайн-токены (никакого hex в компонентах)

```
--bg / --card / --surface / --surface2
--b0 / --b1 / --bh                  // бордер / hover-бордер
--t1..--t5 / --text / --text3..5    // тексты
--acc / --acc2                      // акцент и градиент
--accent-1 / --accent-2 / --accent-soft / --accent-glow / --accent-on-bg
--gradient-accent                   // `var(--acc)` → `var(--acc2)`
--rowh                              // фон hover у строки списка
--shh                               // тень на hover
```

Если цвет нужен «чуть другой» — расширяй палитру в `:root` и
`body[data-theme="light"]`, а не пиши hex в TSX.

---

## Анимации и reduce-motion

Стандартный easing: `cubic-bezier(.34,1.56,.64,1)` для «живых» взаимодействий,
`ease` / `ease-in-out` — для плавных fade/slide. Длительности 160–320ms.

Новые keyframes держим рядом (в `global.css`) и обязательно добавляем
`@media (prefers-reduced-motion: reduce)` блок. Для всей темы это уже сделано
через CSS-переменные `--dur-*` и `--tr-*` (см. начало `global.css`).

Готовые утилиты: `sa-node-in`, `sa-dr-in`, `sa-gantt-pulse`,
`sa-sim-progress`, `sa-trial-pulse`, `sa-trial-flash`, `sa-bell-swing`,
`sa-badge-pop`, `sa-ic-press`, `scaleIn`, `slideUp`, `fadeIn`.

---

## A11y-минимум на новый компонент

- Модалки: `role="dialog"`, `aria-modal="true"`, `aria-label`, focus-trap.
- Иконочные кнопки: `aria-label`.
- Переключатели/выборы: `aria-pressed`, `role="group"` у контейнера.
- Тосты/баннеры/лоадеры: `role="status"` + `aria-live="polite"`.
- Кликабельные `div` → `role="button"`, `tabIndex={0}`, обработка Enter/Space.
- `focus-visible` outline: `2px solid rgba(104,54,245,.55)`.

---

## Интернационализация

- Всегда `t("key", "fallback")`, даже если ключа ещё нет.
- В массивах опций добавляем поле `fb` — подстраховка, если ключ не найден.
- Динамические строки — через `.replace("{n}", String(n))`, не шаблонные литералы.

---

## Чек-лист перед пушем

1. `npx tsc --noEmit` — чисто.
2. Нет `e.currentTarget.style = ...` в новых местах.
3. Нет «голых» hex в TSX.
4. Все литералы через `t()`.
5. Для новой анимации есть reduce-motion fallback.
6. Мобильный прогон на 375 / 414 / 768.
7. Отдельный коммит + push.
