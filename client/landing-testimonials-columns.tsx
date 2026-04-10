import React from "react";

export type LandingTestimonialColumnItem = {
  text: string;
  name: string;
  role: string;
  initials: string;
  avatarStyle: React.CSSProperties;
};

type ColumnProps = {
  className?: string;
  testimonials: LandingTestimonialColumnItem[];
  duration?: number;
};

export function TestimonialsColumn({ className = "", testimonials, duration = 14 }: ColumnProps) {
  if (testimonials.length === 0) return null;

  const blocks = [0, 1].map((blockIdx) => (
    <React.Fragment key={blockIdx}>
      {testimonials.map((item, i) => (
        <article className="testi-col__card" key={`${blockIdx}-${i}`}>
          <div className="testi-col__stars" aria-hidden>
            ★★★★★
          </div>
          <p className="testi-col__text">{item.text}</p>
          <div className="testi-col__author">
            <div className="testi-col__av" style={item.avatarStyle}>
              {item.initials}
            </div>
            <div className="testi-col__meta">
              <div className="testi-col__name">{item.name}</div>
              <div className="testi-col__role">{item.role}</div>
            </div>
          </div>
        </article>
      ))}
    </React.Fragment>
  ));

  return (
    <div
      className={"testi-col " + className}
      style={{ ["--testi-marquee-dur"]: `${duration}s` } as React.CSSProperties}
    >
      <div className="testi-col__track testi-col__track--marquee">{blocks}</div>
    </div>
  );
}

type GridProps = {
  columns: LandingTestimonialColumnItem[][];
  durations?: [number, number, number];
};

export function LandingTestimonialsColumns({ columns, durations = [16, 22, 18] }: GridProps) {
  if (columns.length === 0) return null;
  return (
    <div className="testi-cols-grid">
      {columns.map((col, i) => (
        <TestimonialsColumn
          key={i}
          testimonials={col}
          duration={durations[Math.min(i, durations.length - 1)]}
          className="testi-cols-grid__cell"
        />
      ))}
    </div>
  );
}
