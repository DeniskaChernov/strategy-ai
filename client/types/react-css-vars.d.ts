/** Позволяет использовать CSS custom properties (--foo) в style={{}} без ошибок tsc */
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
