import React, { useEffect, useMemo, useState } from "react";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getDaysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isTodayDate(d: Date): boolean {
  return isSameDay(d, new Date());
}
function shiftMonthStart(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
/** Понедельник как начало недели */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

const Ic = {
  chevL: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  chevR: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  settings: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  ),
  edit: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  plus: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
};

export interface GlassCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  lang?: string;
  theme?: "dark" | "light";
  className?: string;
  onNewNote?: () => void;
  onNewEvent?: () => void;
  onOpenSettings?: () => void;
  labels: {
    weekly: string;
    monthly: string;
    addNote: string;
    newEvent: string;
  };
}

export function GlassCalendar({
  selectedDate: propSelected,
  onDateSelect,
  lang = "ru",
  theme = "dark",
  className = "",
  onNewNote,
  onNewEvent,
  onOpenSettings,
  labels,
}: GlassCalendarProps) {
  const initial = propSelected ? new Date(propSelected) : new Date();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(initial));
  const [selectedDate, setSelectedDate] = useState(() => new Date(initial));
  const [tab, setTab] = useState<"weekly" | "monthly">("monthly");

  const locale = lang === "en" ? "en-US" : lang === "uz" ? "uz-UZ" : "ru-RU";

  useEffect(() => {
    if (!propSelected) return;
    const p = new Date(propSelected);
    if (isNaN(p.getTime())) return;
    setSelectedDate(p);
    setCurrentMonth(startOfMonth(p));
  }, [propSelected ? propSelected.getTime() : undefined]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const total = getDaysInMonth(currentMonth);
    const out: { date: Date; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
      out.push({
        date,
        isToday: isTodayDate(date),
        isSelected: isSameDay(date, selectedDate),
      });
    }
    return out;
  }, [currentMonth, selectedDate]);

  const weekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => {
    const out: { date: Date; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      out.push({
        date,
        isToday: isTodayDate(date),
        isSelected: isSameDay(date, selectedDate),
      });
    }
    return out;
  }, [weekStart, selectedDate]);

  const monthTitle = currentMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const weekTitle = `${weekStart.toLocaleDateString(locale, { day: "numeric", month: "short" })} — ${weekEnd.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;

  function handleDateClick(date: Date) {
    setSelectedDate(date);
    onDateSelect?.(date);
  }

  function weekdayLetter(d: Date): string {
    const s = d.toLocaleDateString(locale, { weekday: "short" });
    return s.charAt(0).toUpperCase();
  }

  function navPrev() {
    if (tab === "monthly") {
      setCurrentMonth((m) => shiftMonthStart(m, -1));
    } else {
      const n = new Date(selectedDate);
      n.setDate(n.getDate() - 7);
      setSelectedDate(n);
      onDateSelect?.(n);
    }
  }
  function navNext() {
    if (tab === "monthly") {
      setCurrentMonth((m) => shiftMonthStart(m, 1));
    } else {
      const n = new Date(selectedDate);
      n.setDate(n.getDate() + 7);
      setSelectedDate(n);
      onDateSelect?.(n);
    }
  }

  const dk = theme === "dark" ? "dk" : "lt";
  const daysRow = tab === "monthly" ? monthDays : weekDays;

  return (
    <div className={`sa-glass-cal ${dk} ${className}`.trim()}>
      <div className="sa-glass-cal-head">
        <div className="sa-glass-cal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "weekly"}
            className={"sa-glass-cal-tab" + (tab === "weekly" ? " is-on" : "")}
            onClick={() => {
              setTab("weekly");
              setCurrentMonth(startOfMonth(selectedDate));
            }}
          >
            {labels.weekly}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "monthly"}
            className={"sa-glass-cal-tab" + (tab === "monthly" ? " is-on" : "")}
            onClick={() => {
              setTab("monthly");
              setCurrentMonth(startOfMonth(selectedDate));
            }}
          >
            {labels.monthly}
          </button>
        </div>
        <button type="button" className="sa-glass-cal-iconbtn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
          {Ic.settings}
        </button>
      </div>

      <div className="sa-glass-cal-nav">
        <h2 className="sa-glass-cal-month">{tab === "monthly" ? monthTitle : weekTitle}</h2>
        <div className="sa-glass-cal-arrows">
          <button type="button" className="sa-glass-cal-iconbtn" onClick={navPrev} aria-label="Previous">
            {Ic.chevL}
          </button>
          <button type="button" className="sa-glass-cal-iconbtn" onClick={navNext} aria-label="Next">
            {Ic.chevR}
          </button>
        </div>
      </div>

      <div className="sa-glass-cal-scrollwrap">
        <div className="sa-glass-cal-row">
          {daysRow.map((day) => (
            <div key={day.date.toISOString()} className="sa-glass-cal-col">
              <span className="sa-glass-cal-wd">{weekdayLetter(day.date)}</span>
              <button
                type="button"
                className={
                  "sa-glass-cal-day" +
                  (day.isSelected ? " is-selected" : "") +
                  (day.isToday && !day.isSelected ? " is-today" : "")
                }
                onClick={() => handleDateClick(day.date)}
              >
                {day.isToday && !day.isSelected && <span className="sa-glass-cal-dot" aria-hidden />}
                {day.date.getDate()}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sa-glass-cal-divider" />

      <div className="sa-glass-cal-foot">
        <button type="button" className="sa-glass-cal-link" onClick={onNewNote}>
          {Ic.edit}
          <span>{labels.addNote}</span>
        </button>
        <button type="button" className="sa-glass-cal-cta" onClick={onNewEvent}>
          {Ic.plus}
          <span>{labels.newEvent}</span>
        </button>
      </div>
    </div>
  );
}

export function dateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
