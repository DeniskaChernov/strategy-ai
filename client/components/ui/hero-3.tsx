import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import React from "react";

type TFn = (key: string, fallback?: string) => string;

export type HeroSectionProps = {
  t: TFn;
  theme: string;
  onGetStarted: () => void;
  onSecondaryCta: () => void;
  badgeHref?: string;
};

const IMG_LIGHT =
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&h=1080&fit=crop&auto=format&q=80";
const IMG_DARK =
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&auto=format&q=80";

/**
 * Hero в духе shadcn (градиенты, бейдж, превью), токены лендинга `.sa-strategy-ui`.
 */
export function HeroSection({
  t,
  theme,
  onGetStarted,
  onSecondaryCta,
  badgeHref = "#land-pricing",
}: HeroSectionProps) {
  const isDark = theme === "dark";

  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 -z-10 isolate",
            "bg-[radial-gradient(20%_80%_at_20%_0%,hsl(var(--foreground)/0.08),transparent_65%)]"
          )}
        />
      </div>

      <div className="relative z-10 flex max-w-2xl flex-col gap-5 px-4">
        <a
          className={cn(
            "group flex w-fit items-center gap-3 rounded-md border border-[color:var(--b1)] bg-[color:var(--card)] p-1 shadow-sm",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
          )}
          href={badgeHref}
        >
          <div className="rounded border border-[color:var(--b1)] bg-[color:var(--card2)] px-1.5 py-0.5 shadow-sm">
            <p className="font-mono text-[11px] text-[color:var(--t1)]">
              {t("ref_hero_badge_tag", "NEW")}
            </p>
          </div>
          <span className="text-xs text-[color:var(--t2)]">
            {t("ref_hero_badge_line", "Карты, сценарии и AI — в одном продукте")}
          </span>
          <span className="block h-5 border-l border-[color:var(--b1)]" />
          <div className="pr-1">
            <ArrowRight className="size-3 -translate-x-0.5 text-[color:var(--t2)] duration-150 ease-out group-hover:translate-x-0.5" />
          </div>
        </a>

        <h1
          className={cn(
            "hero-h1 text-balance",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
          )}
        >
          <span
            dangerouslySetInnerHTML={{
              __html: t(
                "ref_hero_h1_html",
                'Стратегия,<br/><span class="grad-text">которая думает с вами</span>'
              ),
            }}
          />
        </h1>

        <p
          className={cn(
            "text-pretty text-sm tracking-wide text-[color:var(--t2)] sm:text-base md:text-lg",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out"
          )}
        >
          {t(
            "ref_hero_sub",
            "Визуальные карты целей и инициатив, сценарии «что если», таймлайн и AI-советник — в одном рабочем пространстве."
          )}
        </p>

        <div className="fade-in slide-in-from-bottom-10 flex w-full flex-col items-stretch gap-3 pt-2 animate-in fill-mode-backwards delay-300 duration-500 ease-out sm:w-auto sm:flex-row sm:items-center sm:justify-start">
          <Button
            type="button"
            variant="outline"
            className="border-[color:var(--b1)] bg-transparent text-[color:var(--t1)] hover:bg-[color:var(--card)]"
            onClick={onSecondaryCta}
          >
            <LayoutDashboard className="mr-2 size-4 shrink-0" aria-hidden />
            {t("ref_hero_secondary", "Смотреть интерфейс")}
          </Button>
          <Button
            type="button"
            className="bg-[color:var(--accent-1)] text-white hover:bg-[color:var(--accent-2)]"
            onClick={onGetStarted}
          >
            {t("hero_cta", "Начать бесплатно — без карты")}
            <ArrowRight className="ml-2 size-4 shrink-0" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          className={cn(
            "absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-110 rounded-full blur-[50px]",
            "bg-[radial-gradient(ellipse_at_center,hsl(var(--foreground)/0.12),transparent_72%)]"
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "relative mt-8 overflow-hidden px-2 sm:mt-12 md:mt-16",
            "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
            "fade-in slide-in-from-bottom-5 animate-in fill-mode-backwards delay-100 duration-1000 ease-out"
          )}
        >
          <div
            className={cn(
              "relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-[color:var(--b1)] bg-[color:var(--card)] p-2 shadow-xl ring-1 ring-[color:var(--b0)]",
              "shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.06)]"
            )}
          >
            <img
              alt={t("ref_hero_preview_alt", "Пример аналитики и дашборда")}
              className={cn(
                "z-[2] aspect-video rounded-lg border border-[color:var(--b1)]",
                !isDark ? "block" : "hidden"
              )}
              height={1080}
              src={IMG_LIGHT}
              width={1920}
              loading="lazy"
              decoding="async"
            />
            <img
              alt={t("ref_hero_preview_alt", "Пример аналитики и дашборда")}
              className={cn(
                "aspect-video rounded-lg border border-[color:var(--b1)] bg-background",
                isDark ? "block" : "hidden"
              )}
              height={1080}
              src={IMG_DARK}
              width={1920}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
