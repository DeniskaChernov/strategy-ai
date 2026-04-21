// Готовые шаблоны стратегических карт.
// Используются в TemplateModal при создании новой карты.
// Плюсы выноса: основной файл приложения не «разбухает» 160
// строками чистых данных, а правка шаблонов изолирована.

export type TemplateNode = {
  id: string;
  x: number;
  y: number;
  title: string;
  reason: string;
  metric: string;
  status: "planning" | "active" | "completed" | "paused" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
  tags: string[];
  color: string;
};

export type TemplateEdge = {
  id: string;
  source: string;
  target: string;
  type: "requires" | "affects" | "blocks" | "follows";
  label: string;
};

export type MapTemplate = {
  id: string;
  name: string;
  desc: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
};

export const TEMPLATES: MapTemplate[] = [
  {
    id: "launch",
    name: "🚀 Запуск продукта",
    desc: "Вывод MVP на рынок",
    nodes: [
      { id: "t1", x: 160, y: 260, title: "Исследование рынка", reason: "Понять ЦА и боли", metric: "100 интервью", status: "planning", priority: "high", progress: 0, tags: ["research"], color: "" },
      { id: "t2", x: 420, y: 150, title: "MVP разработка", reason: "Проверить гипотезу", metric: "50 первых пользователей", status: "planning", priority: "critical", progress: 0, tags: ["product"], color: "" },
      { id: "t3", x: 420, y: 370, title: "GTM стратегия", reason: "Выход на рынок", metric: "Первые 10 продаж", status: "planning", priority: "high", progress: 0, tags: ["marketing"], color: "" },
      { id: "t4", x: 680, y: 260, title: "Привлечение клиентов", reason: "Рост базы", metric: "CAC < $50", status: "planning", priority: "critical", progress: 0, tags: ["growth"], color: "" },
      { id: "t5", x: 940, y: 260, title: "Product-Market Fit", reason: "Доказать PMF", metric: "NPS > 40", status: "planning", priority: "critical", progress: 0, tags: ["pmf"], color: "" },
    ],
    edges: [
      { id: "te1", source: "t1", target: "t2", type: "requires", label: "" },
      { id: "te2", source: "t1", target: "t3", type: "affects", label: "" },
      { id: "te3", source: "t2", target: "t4", type: "requires", label: "" },
      { id: "te4", source: "t3", target: "t4", type: "affects", label: "" },
      { id: "te5", source: "t4", target: "t5", type: "follows", label: "" },
    ],
  },
  {
    id: "growth",
    name: "📈 Стратегия роста",
    desc: "Масштабирование существующего бизнеса",
    nodes: [
      { id: "g1", x: 160, y: 260, title: "Аудит текущих каналов", reason: "Найти эффективные каналы", metric: "ROI по каналам", status: "planning", priority: "high", progress: 0, tags: ["audit"], color: "" },
      { id: "g2", x: 420, y: 150, title: "Удвоить лучший канал", reason: "Масштабировать работающее", metric: "×2 к объёму", status: "planning", priority: "critical", progress: 0, tags: ["scale"], color: "" },
      { id: "g3", x: 420, y: 370, title: "Реферальная программа", reason: "Органический рост", metric: "20% пользователей из рефералов", status: "planning", priority: "high", progress: 0, tags: ["referral"], color: "" },
      { id: "g4", x: 680, y: 260, title: "Улучшить retention", reason: "Снизить отток", metric: "Churn < 5%/мес", status: "planning", priority: "critical", progress: 0, tags: ["retention"], color: "" },
      { id: "g5", x: 940, y: 260, title: "Новый рынок / сегмент", reason: "Диверсификация", metric: "$100k из нового сегмента", status: "planning", priority: "medium", progress: 0, tags: ["expansion"], color: "" },
    ],
    edges: [
      { id: "ge1", source: "g1", target: "g2", type: "requires", label: "" },
      { id: "ge2", source: "g1", target: "g3", type: "affects", label: "" },
      { id: "ge3", source: "g2", target: "g4", type: "affects", label: "" },
      { id: "ge4", source: "g4", target: "g5", type: "follows", label: "" },
    ],
  },
  {
    id: "pivot",
    name: "🔄 Pivot стратегия",
    desc: "Смена направления с минимальными потерями",
    nodes: [
      { id: "p1", x: 160, y: 260, title: "Диагностика провала", reason: "Понять почему текущее не работает", metric: "5 корневых причин", status: "planning", priority: "critical", progress: 0, tags: ["analysis"], color: "" },
      { id: "p2", x: 420, y: 150, title: "Анализ альтернатив", reason: "Найти новое направление", metric: "3 validated идеи", status: "planning", priority: "high", progress: 0, tags: ["ideation"], color: "" },
      { id: "p3", x: 420, y: 370, title: "Сохранить ресурсы", reason: "Runway для pivot", metric: "6+ месяцев runway", status: "planning", priority: "critical", progress: 0, tags: ["finance"], color: "" },
      { id: "p4", x: 680, y: 260, title: "Быстрый прототип", reason: "Проверить новое направление", metric: "10 первых пользователей", status: "planning", priority: "critical", progress: 0, tags: ["prototype"], color: "" },
      { id: "p5", x: 940, y: 260, title: "Валидация нового PMF", reason: "Убедиться в правильности направления", metric: "NPS > 30, retention > 40%", status: "planning", priority: "critical", progress: 0, tags: ["validation"], color: "" },
    ],
    edges: [
      { id: "pe1", source: "p1", target: "p2", type: "requires", label: "" },
      { id: "pe2", source: "p1", target: "p3", type: "affects", label: "" },
      { id: "pe3", source: "p2", target: "p4", type: "requires", label: "" },
      { id: "pe4", source: "p3", target: "p4", type: "affects", label: "" },
      { id: "pe5", source: "p4", target: "p5", type: "follows", label: "" },
    ],
  },
  {
    id: "fundraising",
    name: "💰 Привлечение инвестиций",
    desc: "Путь от идеи до закрытого раунда",
    nodes: [
      { id: "f1", x: 160, y: 260, title: "Подготовка материалов", reason: "Профессиональное первое впечатление", metric: "Pitch deck + финмодель", status: "planning", priority: "high", progress: 0, tags: ["prep"], color: "" },
      { id: "f2", x: 420, y: 150, title: "Warm intros к инвесторам", reason: "Обход холодного outreach", metric: "50 warm intros", status: "planning", priority: "critical", progress: 0, tags: ["network"], color: "" },
      { id: "f3", x: 420, y: 370, title: "Улучшить ключевые метрики", reason: "Сильная позиция на переговорах", metric: "MoM рост > 15%", status: "planning", priority: "critical", progress: 0, tags: ["metrics"], color: "" },
      { id: "f4", x: 680, y: 260, title: "Переговоры и term sheet", reason: "Закрыть лучший term sheet", metric: "3+ term sheets", status: "planning", priority: "critical", progress: 0, tags: ["deals"], color: "" },
      { id: "f5", x: 940, y: 260, title: "Due diligence и закрытие", reason: "Получить деньги", metric: "Раунд закрыт", status: "planning", priority: "critical", progress: 0, tags: ["close"], color: "" },
    ],
    edges: [
      { id: "fe1", source: "f1", target: "f2", type: "requires", label: "" },
      { id: "fe2", source: "f1", target: "f3", type: "affects", label: "" },
      { id: "fe3", source: "f2", target: "f4", type: "requires", label: "" },
      { id: "fe4", source: "f3", target: "f4", type: "affects", label: "" },
      { id: "fe5", source: "f4", target: "f5", type: "follows", label: "" },
    ],
  },
  {
    id: "enterprise_sales",
    name: "🤝 Enterprise продажи",
    desc: "Цикл B2B продаж крупным клиентам",
    nodes: [
      { id: "es1", x: 160, y: 260, title: "ICP и таргетинг", reason: "Работать с правильными клиентами", metric: "Список 100 ICP компаний", status: "planning", priority: "high", progress: 0, tags: ["targeting"], color: "" },
      { id: "es2", x: 420, y: 150, title: "Discovery call", reason: "Понять боль и budget", metric: "20 qualified leads", status: "planning", priority: "critical", progress: 0, tags: ["sales"], color: "" },
      { id: "es3", x: 420, y: 370, title: "Proof of concept", reason: "Снизить риск для клиента", metric: "5 POC запущено", status: "planning", priority: "high", progress: 0, tags: ["poc"], color: "" },
      { id: "es4", x: 680, y: 260, title: "Коммерческое предложение", reason: "Закрыть сделку", metric: "ACV > $50k", status: "planning", priority: "critical", progress: 0, tags: ["proposal"], color: "" },
      { id: "es5", x: 940, y: 260, title: "Expansion и upsell", reason: "Рост LTV", metric: "NRR > 120%", status: "planning", priority: "high", progress: 0, tags: ["expansion"], color: "" },
    ],
    edges: [
      { id: "ese1", source: "es1", target: "es2", type: "requires", label: "" },
      { id: "ese2", source: "es2", target: "es3", type: "requires", label: "" },
      { id: "ese3", source: "es2", target: "es4", type: "affects", label: "" },
      { id: "ese4", source: "es3", target: "es4", type: "requires", label: "" },
      { id: "ese5", source: "es4", target: "es5", type: "follows", label: "" },
    ],
  },
  {
    id: "content",
    name: "✍️ Контент-маркетинг",
    desc: "Система контента и лидогенерации",
    nodes: [
      { id: "c1", x: 160, y: 260, title: "Аудит контента и каналов", reason: "Понять что работает", metric: "Топ-5 каналов по конверсии", status: "planning", priority: "high", progress: 0, tags: ["audit"], color: "" },
      { id: "c2", x: 420, y: 150, title: "Контент-план и редактура", reason: "Регулярные публикации", metric: "12 постов/мес", status: "planning", priority: "high", progress: 0, tags: ["content"], color: "" },
      { id: "c3", x: 420, y: 370, title: "SEO и ключевые слова", reason: "Органический трафик", metric: "Топ-10 по ключам", status: "planning", priority: "high", progress: 0, tags: ["seo"], color: "" },
      { id: "c4", x: 680, y: 260, title: "Лендинги и лид-магниты", reason: "Сбор контактов", metric: "Конверсия > 3%", status: "planning", priority: "critical", progress: 0, tags: ["leads"], color: "" },
      { id: "c5", x: 940, y: 260, title: "Автоматизация рассылок", reason: "Прогрев лидов", metric: "Open rate > 25%", status: "planning", priority: "medium", progress: 0, tags: ["email"], color: "" },
    ],
    edges: [
      { id: "ce1", source: "c1", target: "c2", type: "requires", label: "" },
      { id: "ce2", source: "c1", target: "c3", type: "affects", label: "" },
      { id: "ce3", source: "c2", target: "c4", type: "affects", label: "" },
      { id: "ce4", source: "c3", target: "c4", type: "requires", label: "" },
      { id: "ce5", source: "c4", target: "c5", type: "follows", label: "" },
    ],
  },
  {
    id: "product_dev",
    name: "🛠 Разработка продукта",
    desc: "От идеи до релиза",
    nodes: [
      { id: "pd1", x: 160, y: 260, title: "Discovery и приоритизация", reason: "Выбрать что строить", metric: "Backlog с приоритетами", status: "planning", priority: "high", progress: 0, tags: ["discovery"], color: "" },
      { id: "pd2", x: 420, y: 150, title: "Дизайн и прототипы", reason: "Визуализация решения", metric: "Figma-прототип", status: "planning", priority: "high", progress: 0, tags: ["design"], color: "" },
      { id: "pd3", x: 420, y: 370, title: "Техническая спецификация", reason: "Единое понимание", metric: "Спека для команды", status: "planning", priority: "high", progress: 0, tags: ["spec"], color: "" },
      { id: "pd4", x: 680, y: 260, title: "Разработка и тесты", reason: "Качественный релиз", metric: "Покрытие тестами > 70%", status: "planning", priority: "critical", progress: 0, tags: ["dev"], color: "" },
      { id: "pd5", x: 940, y: 260, title: "Релиз и мониторинг", reason: "Стабильная работа", metric: "Uptime > 99.5%", status: "planning", priority: "critical", progress: 0, tags: ["release"], color: "" },
    ],
    edges: [
      { id: "pde1", source: "pd1", target: "pd2", type: "requires", label: "" },
      { id: "pde2", source: "pd1", target: "pd3", type: "requires", label: "" },
      { id: "pde3", source: "pd2", target: "pd4", type: "affects", label: "" },
      { id: "pde4", source: "pd3", target: "pd4", type: "requires", label: "" },
      { id: "pde5", source: "pd4", target: "pd5", type: "follows", label: "" },
    ],
  },
  {
    id: "customer_success",
    name: "💚 Customer Success",
    desc: "Удержание и рост LTV",
    nodes: [
      { id: "cs1", x: 160, y: 260, title: "Онбординг клиентов", reason: "Быстрый time-to-value", metric: "Активация за 7 дней", status: "planning", priority: "critical", progress: 0, tags: ["onboard"], color: "" },
      { id: "cs2", x: 420, y: 150, title: "Регулярные проверки здоровья", reason: "Снизить отток", metric: "NPS и health score", status: "planning", priority: "high", progress: 0, tags: ["health"], color: "" },
      { id: "cs3", x: 420, y: 370, title: "Обучение и база знаний", reason: "Самообслуживание", metric: "50% запросов без тикета", status: "planning", priority: "high", progress: 0, tags: ["education"], color: "" },
      { id: "cs4", x: 680, y: 260, title: "Upsell и кросс-селл", reason: "Рост LTV", metric: "+20% к ARPU", status: "planning", priority: "high", progress: 0, tags: ["upsell"], color: "" },
      { id: "cs5", x: 940, y: 260, title: "Рефералы и кейсы", reason: "Сарафан и доверие", metric: "5 кейсов в год", status: "planning", priority: "medium", progress: 0, tags: ["referral"], color: "" },
    ],
    edges: [
      { id: "cse1", source: "cs1", target: "cs2", type: "requires", label: "" },
      { id: "cse2", source: "cs1", target: "cs3", type: "affects", label: "" },
      { id: "cse3", source: "cs2", target: "cs4", type: "affects", label: "" },
      { id: "cse4", source: "cs3", target: "cs4", type: "affects", label: "" },
      { id: "cse5", source: "cs4", target: "cs5", type: "follows", label: "" },
    ],
  },
  {
    id: "hiring",
    name: "👥 Найм и команда",
    desc: "Масштабирование команды",
    nodes: [
      { id: "h1", x: 160, y: 260, title: "Описание ролей и компетенций", reason: "Чёткие критерии найма", metric: "JD по каждой роли", status: "planning", priority: "high", progress: 0, tags: ["jd"], color: "" },
      { id: "h2", x: 420, y: 150, title: "Каналы привлечения", reason: "Качественный входящий поток", metric: "10+ откликов на вакансию", status: "planning", priority: "high", progress: 0, tags: ["sourcing"], color: "" },
      { id: "h3", x: 420, y: 370, title: "Интервью и оценка", reason: "Отбор лучших", metric: "Структурированное интервью", status: "planning", priority: "critical", progress: 0, tags: ["interview"], color: "" },
      { id: "h4", x: 680, y: 260, title: "Оффер и онбординг", reason: "Закрыть кандидата", metric: "Accept rate > 80%", status: "planning", priority: "critical", progress: 0, tags: ["offer"], color: "" },
      { id: "h5", x: 940, y: 260, title: "Адаптация и развитие", reason: "Быстрая продуктивность", metric: "90 дней до полной нагрузки", status: "planning", priority: "high", progress: 0, tags: ["onboard"], color: "" },
    ],
    edges: [
      { id: "he1", source: "h1", target: "h2", type: "requires", label: "" },
      { id: "he2", source: "h1", target: "h3", type: "requires", label: "" },
      { id: "he3", source: "h2", target: "h4", type: "affects", label: "" },
      { id: "he4", source: "h3", target: "h4", type: "requires", label: "" },
      { id: "he5", source: "h4", target: "h5", type: "follows", label: "" },
    ],
  },
  {
    id: "rebrand",
    name: "🎨 Ребрендинг",
    desc: "Смена позиционирования и упаковки",
    nodes: [
      { id: "rb1", x: 160, y: 260, title: "Исследование и позиционирование", reason: "Новая ниша и ЦА", metric: "Документ позиционирования", status: "planning", priority: "critical", progress: 0, tags: ["research"], color: "" },
      { id: "rb2", x: 420, y: 150, title: "Нейминг и визуал", reason: "Узнаваемый бренд", metric: "Логотип, палитра, шрифты", status: "planning", priority: "high", progress: 0, tags: ["brand"], color: "" },
      { id: "rb3", x: 420, y: 370, title: "Контент и тоналность", reason: "Единый голос", metric: "Tone of voice гайд", status: "planning", priority: "high", progress: 0, tags: ["content"], color: "" },
      { id: "rb4", x: 680, y: 260, title: "Обновление носителей", reason: "Сайт, соцсети, материалы", metric: "Все точки касания", status: "planning", priority: "critical", progress: 0, tags: ["touchpoints"], color: "" },
      { id: "rb5", x: 940, y: 260, title: "Запуск и коммуникация", reason: "Донести изменения", metric: "Презентация клиентам/команде", status: "planning", priority: "high", progress: 0, tags: ["launch"], color: "" },
    ],
    edges: [
      { id: "rbe1", source: "rb1", target: "rb2", type: "requires", label: "" },
      { id: "rbe2", source: "rb1", target: "rb3", type: "requires", label: "" },
      { id: "rbe3", source: "rb2", target: "rb4", type: "affects", label: "" },
      { id: "rbe4", source: "rb3", target: "rb4", type: "affects", label: "" },
      { id: "rbe5", source: "rb4", target: "rb5", type: "follows", label: "" },
    ],
  },
];
