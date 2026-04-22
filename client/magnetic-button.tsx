import * as React from "react";
import { useMagnetic } from "./use-magnetic";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Сила магнитного притяжения в px. */
  strength?: number;
  /** Радиус срабатывания вокруг элемента. */
  radius?: number;
};

/**
 * Кнопка с "магнитным" hover-эффектом. В остальном прозрачно
 * пробрасывает пропсы и ref к <button>.
 */
export const MagneticButton = React.forwardRef<HTMLButtonElement, Props>(
  function MagneticButton({ strength = 10, radius = 140, className, children, ...rest }, _fwd) {
    const ref = useMagnetic<HTMLButtonElement>({ strength, radius });
    return (
      <button
        ref={ref}
        className={(className || "") + " sa-magnetic"}
        {...rest}
      >
        <span className="sa-magnetic__inner">{children}</span>
      </button>
    );
  },
);
