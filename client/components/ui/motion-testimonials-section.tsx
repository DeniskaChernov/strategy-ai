import React from "react";
import { TestimonialsColumn, type TestimonialCardItem } from "./testimonials-columns-1";

export type MotionColumns = [TestimonialCardItem[], TestimonialCardItem[], TestimonialCardItem[]];

export function MotionTestimonialsMarquee({
  columns,
  durations = [15, 19, 17],
  ariaLabel,
}: {
  columns: MotionColumns;
  durations?: [number, number, number];
  ariaLabel?: string;
}) {
  const [a, b, c] = columns;
  return (
    <div className="sa-tcol1-grid" role="region" aria-label={ariaLabel || "Отзывы"}>
      <TestimonialsColumn testimonials={a} duration={durations[0]} />
      <TestimonialsColumn testimonials={b} className="sa-tcol1-col--md" duration={durations[1]} />
      <TestimonialsColumn testimonials={c} className="sa-tcol1-col--lg" duration={durations[2]} />
    </div>
  );
}
