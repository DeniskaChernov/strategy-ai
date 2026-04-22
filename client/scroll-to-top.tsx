import * as React from "react";

type Props = {
  scrollRef?: { readonly current: HTMLElement | null };
  /** После какого скролла показывать кнопку (px). */
  threshold?: number;
  /** ARIA-метка. */
  label?: string;
};

/**
 * Плавающая круглая кнопка "вернуться наверх".
 * Появляется после прокрутки > threshold, исчезает наверху.
 */
export function ScrollToTop({ scrollRef, threshold = 600, label = "Наверх" }: Props) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const target: HTMLElement | Window =
      (scrollRef && scrollRef.current) || window;

    let raf: number | null = null;
    const check = () => {
      raf = null;
      const top =
        target instanceof Window
          ? target.scrollY || document.documentElement.scrollTop || 0
          : target.scrollTop;
      setVisible(top > threshold);
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(check);
    };

    check();
    if (target instanceof Window) {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      target.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (target instanceof Window) {
        window.removeEventListener("scroll", onScroll);
      } else {
        target.removeEventListener("scroll", onScroll);
      }
    };
  }, [scrollRef, threshold]);

  const onClick = React.useCallback(() => {
    const target: HTMLElement | Window =
      (scrollRef && scrollRef.current) || window;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    if (target instanceof Window) {
      target.scrollTo({ top: 0, behavior });
    } else {
      target.scrollTo({ top: 0, behavior });
    }
  }, [scrollRef]);

  return (
    <button
      type="button"
      aria-label={label}
      className={"sa-totop" + (visible ? " is-on" : "")}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
