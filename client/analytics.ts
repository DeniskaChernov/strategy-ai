declare global {
  interface Window {
    __SA_CONFIG__?: {
      ga4?: string;
      clarity?: string;
      siteUrl?: string;
      demoVideo?: string;
      ogImage?: string;
    };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gtagLoaded = false;
let clarityLoaded = false;

function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load: " + src));
    document.head.appendChild(s);
  });
}

export function initAnalyticsAfterConsent(): void {
  if (typeof window === "undefined") return;
  const cfg = window.__SA_CONFIG__;
  if (!cfg) return;

  if (cfg.ga4 && /^G-[A-Z0-9]+$/i.test(cfg.ga4) && !gtagLoaded) {
    gtagLoaded = true;
    void (async () => {
      try {
        await appendScript(
          `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4!)}`
        );
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer!.push(args);
        };
        window.gtag!("js", new Date());
        window.gtag!("config", cfg.ga4);
      } catch {
        gtagLoaded = false;
      }
    })();
  }

  if (cfg.clarity && /^[\w-]+$/.test(cfg.clarity) && !clarityLoaded) {
    clarityLoaded = true;
    try {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.clarity.ms/tag/" + encodeURIComponent(cfg.clarity);
      document.head.appendChild(s);
    } catch {
      clarityLoaded = false;
    }
  }
}

export function bootstrapAnalyticsIfConsented(): void {
  try {
    if (localStorage.getItem("sa_cookie_ok") === "1") {
      initAnalyticsAfterConsent();
    }
  } catch {
    /* ignore */
  }
}

export function trackSaEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  try {
    if (typeof window === "undefined" || !window.gtag) return;
    if (!window.__SA_CONFIG__?.ga4) return;
    const clean: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) clean[k] = v as string | number | boolean;
      }
    }
    window.gtag("event", name, clean);
  } catch {
    /* ignore */
  }
}
