import type { TestimonialCardItem } from "./testimonials-columns-1";

export const DEMO_TESTIMONIALS_MOTION: TestimonialCardItem[] = [
  {
    text: "Карта и таймлайн в одном месте.",
    name: "Алексей К.",
    role: "CEO",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Сценарии помогли перед совещанием.",
    name: "Мария Д.",
    role: "CPO",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "AI по шагам карты даёт конкретику.",
    name: "Тимур Р.",
    role: "Партнёр",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Команда смотрит на одну картину целей.",
    name: "Елена В.",
    role: "COO",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Экспорт в PNG для совета директоров.",
    name: "Дмитрий Н.",
    role: "Стратегия",
    image:
      "https://images.unsplash.com/photo-1519085367523-7373598650c7?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Онбординг занял минуты.",
    name: "Ирина С.",
    role: "PMO",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Один экран вместо трёх инструментов.",
    name: "Константин П.",
    role: "Партнёр",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Зависимости между узлами нагляднее таблицы.",
    name: "Ольга М.",
    role: "Product",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    text: "Таймлайн и карта в синхроне.",
    name: "Сергей Т.",
    role: "Руководитель проекта",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
];

export function splitMotionTestimonialColumns(
  all: TestimonialCardItem[]
): [TestimonialCardItem[], TestimonialCardItem[], TestimonialCardItem[]] {
  return [all.slice(0, 3), all.slice(3, 6), all.slice(6, 9)];
}
