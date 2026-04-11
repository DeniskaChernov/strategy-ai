export type MarketingPath =
  | { type: "home" }
  | { type: "app" }
  | { type: "privacy" }
  | { type: "terms" }
  | { type: "notFound" };

export function parseMarketingPath(pathname: string): MarketingPath {
  const raw = pathname.trim() || "/";
  const p = raw.replace(/\/+$/, "") || "/";
  if (p === "/") return { type: "home" };
  if (p === "/app") return { type: "app" };
  if (p === "/privacy") return { type: "privacy" };
  if (p === "/terms") return { type: "terms" };
  if (p === "/404") return { type: "notFound" };
  if (p.startsWith("/app/")) return { type: "app" };
  return { type: "notFound" };
}

export function marketingPathToUrl(mp: MarketingPath): string {
  switch (mp.type) {
    case "home":
      return "/";
    case "app":
      return "/app";
    case "privacy":
      return "/privacy";
    case "terms":
      return "/terms";
    case "notFound":
      return "/404";
    default:
      return "/";
  }
}
