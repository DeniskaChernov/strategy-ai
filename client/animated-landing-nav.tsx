import * as React from "react";
import { motion } from "framer-motion";
import { Compass, Menu } from "lucide-react";

type TFn = (key: string, fallback?: string) => string;

function cn(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const EXPAND_SCROLL_THRESHOLD = 80;

/** Без `when: "afterChildren"` — иначе ширина ждёт детей и пилюля долго остаётся «пустой полосой». */
const containerVariants = {
  expanded: {
    y: 0,
    opacity: 1,
    transition: {
      y: { type: "spring" as const, damping: 18, stiffness: 250 },
      opacity: { duration: 0.25 },
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const logoVariants = {
  expanded: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring" as const, damping: 15 } },
  collapsed: { opacity: 0, x: -25, rotate: -180, transition: { duration: 0.3 } },
};

const itemVariants = {
  expanded: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, damping: 15 } },
  collapsed: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

const collapsedIconVariants = {
  expanded: { opacity: 0, scale: 0.92, transition: { duration: 0.15 } },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 380, delay: 0.04 },
  },
};

export function AnimatedLandingNav({
  scrollRootRef,
  t,
  lang,
  onChangeLang,
  theme,
  onToggleTheme,
  onSignIn,
  onGetStarted,
  scrollToId,
}: {
  scrollRootRef: React.RefObject<HTMLElement | null>;
  t: TFn;
  lang: string;
  onChangeLang: (code: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
  scrollToId: (id: string) => void;
}) {
  const [isExpanded, setExpanded] = React.useState(true);
  const expandedRef = React.useRef(true);
  const lastScrollY = React.useRef(0);
  const scrollPositionOnCollapse = React.useRef(0);

  React.useEffect(() => {
    expandedRef.current = isExpanded;
  }, [isExpanded]);

  React.useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    const onScroll = () => {
      const latest = root.scrollTop;
      const previous = lastScrollY.current;
      const exp = expandedRef.current;

      if (exp && latest > previous && latest > 150) {
        expandedRef.current = false;
        setExpanded(false);
        scrollPositionOnCollapse.current = latest;
      } else if (
        !exp &&
        latest < previous &&
        scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD
      ) {
        expandedRef.current = true;
        setExpanded(true);
      }

      lastScrollY.current = latest;
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollRootRef]);

  const handleNavClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      expandedRef.current = true;
      setExpanded(true);
    }
  };

  const navItems = [
    { id: "land-features", label: t("nav_features", "Возможности") },
    { id: "land-how", label: t("nav_process", "Как это работает") },
    { id: "land-pricing", label: t("nav_pricing", "Тарифы") },
    { id: "land-faq", label: t("nav_faq", "FAQ") },
  ];

  const wrapPos = isExpanded
    ? {
        left: "50%" as const,
        right: "auto" as const,
        transform: "translateX(-50%)",
        maxWidth: "min(96vw, 1100px)",
      }
    : {
        left: "auto" as const,
        right: "max(16px, env(safe-area-inset-right))",
        transform: "none",
        maxWidth: "none",
      };

  return (
    <div
      className="sa-animated-nav-wrap"
      style={{
        position: "fixed",
        top: "max(24px, env(safe-area-inset-top))",
        zIndex: 600,
        width: "auto",
        ...wrapPos,
      }}
    >
      <motion.nav
        aria-label={t("nav_main", "Основная навигация")}
        initial={{ y: -80, opacity: 0 }}
        animate={isExpanded ? "expanded" : "collapsed"}
        variants={containerVariants}
        whileHover={!isExpanded ? { scale: 1.04 } : {}}
        whileTap={!isExpanded ? { scale: 0.97 } : {}}
        onClick={handleNavClick}
        className="sa-animated-nav-pill"
        style={{
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          borderRadius: 9999,
          border: "0.5px solid var(--b1)",
          background: "var(--sb)",
          backdropFilter: "blur(22px) saturate(1.15)",
          WebkitBackdropFilter: "blur(22px) saturate(1.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,.35)",
          minHeight: 48,
          cursor: !isExpanded ? "pointer" : undefined,
          justifyContent: !isExpanded ? "center" : undefined,
          width: isExpanded ? "auto" : "3rem",
          maxWidth: isExpanded ? "min(96vw, 1100px)" : "3rem",
          transition: "width 0.32s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <motion.div
          variants={logoVariants}
          className="sa-animated-nav-logo"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: isExpanded ? 16 : 0,
            paddingRight: isExpanded ? 8 : 0,
            color: "var(--acc)",
            pointerEvents: isExpanded ? "auto" : "none",
            minWidth: isExpanded ? undefined : 0,
            maxWidth: isExpanded ? undefined : 0,
            overflow: "hidden",
            flex: isExpanded ? undefined : "0 0 0",
          }}
        >
          <Compass aria-hidden size={22} strokeWidth={2} />
        </motion.div>

        <motion.div
          className={cn("sa-animated-nav-links", !isExpanded && "sa-animated-nav-links--disabled")}
          variants={itemVariants}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(6px, 1.5vw, 16px)",
            paddingRight: isExpanded ? 12 : 0,
            flexWrap: "wrap",
            pointerEvents: isExpanded ? "auto" : "none",
            minWidth: isExpanded ? undefined : 0,
            maxWidth: isExpanded ? undefined : 0,
            overflow: "hidden",
            flex: isExpanded ? undefined : "0 0 0",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToId(item.id);
              }}
              className="sa-animated-nav-link"
            >
              {item.label}
            </button>
          ))}
        </motion.div>

        <motion.div
          className="sa-animated-nav-tools"
          variants={itemVariants}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingRight: isExpanded ? 14 : 0,
            borderLeft: isExpanded ? "0.5px solid var(--b0)" : "none",
            paddingLeft: isExpanded ? 12 : 0,
            flexShrink: 0,
            pointerEvents: isExpanded ? "auto" : "none",
            minWidth: isExpanded ? undefined : 0,
            maxWidth: isExpanded ? undefined : 0,
            overflow: "hidden",
            flex: isExpanded ? undefined : "0 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "var(--inp)",
              border: ".5px solid var(--b1)",
              borderRadius: 22,
              padding: 3,
              gap: 1,
            }}
          >
            {(["en", "ru", "uz"] as const).map((code) => (
              <button
                key={code}
                type="button"
                className={"land-lang-btn" + (lang === code ? " on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeLang(code);
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <div
            className="tpill"
            onClick={(e) => {
              e.stopPropagation();
              onToggleTheme();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onToggleTheme();
            }}
            aria-label={t("toggle_theme", "Тема")}
          >
            <div className={"tpi" + (theme === "dark" ? " on" : "")}>☽</div>
            <div className={"tpi" + (theme === "light" ? " on" : "")}>☀</div>
          </div>
          <button type="button" className="btn-g" onClick={(e) => { e.stopPropagation(); onSignIn(); }}>
            {t("sign_in", "Войти")}
          </button>
          <button type="button" className="btn-p" onClick={(e) => { e.stopPropagation(); onGetStarted(); }}>
            {t("nav_getstarted", "Начать бесплатно")}
          </button>
        </motion.div>

        {/* В свёрнутом виде перехватываем клики (иначе они проходят к tpill/кнопкам под opacity:0) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isExpanded ? "none" : "auto",
            zIndex: 3,
          }}
          onClick={(e) => {
            if (!isExpanded) {
              e.stopPropagation();
              expandedRef.current = true;
              setExpanded(true);
            }
          }}
          aria-hidden={isExpanded}
        >
          <motion.div variants={collapsedIconVariants} animate={isExpanded ? "expanded" : "collapsed"}>
            <Menu aria-hidden size={22} strokeWidth={2} style={{ color: "var(--t1)" }} />
          </motion.div>
        </div>
      </motion.nav>
    </div>
  );
}
