import React from "react";
import { motion } from "framer-motion";

export type TestimonialCardItem = {
  text: string;
  image: string;
  name: string;
  role: string;
};

type TestimonialsColumnProps = {
  className?: string;
  testimonials: TestimonialCardItem[];
  duration?: number;
};

export function TestimonialsColumn({ className = "", testimonials, duration = 10 }: TestimonialsColumnProps) {
  if (testimonials.length === 0) return null;

  const loops = [0, 1];
  return (
    <div className={"sa-tcol1-root " + className}>
      <motion.div
        animate={{ y: ["0%", "-50%"] }}
        transition={{
          duration: duration || 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="sa-tcol1-track"
      >
        {loops.map((loopIdx) => (
          <React.Fragment key={loopIdx}>
            {testimonials.map((item, i) => (
              <div className="sa-tcol1-card" key={`${loopIdx}-${i}`}>
                <div className="sa-tcol1-text">{item.text}</div>
                <div className="sa-tcol1-author">
                  <img
                    width={40}
                    height={40}
                    src={item.image}
                    alt=""
                    className="sa-tcol1-avatar"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="sa-tcol1-meta">
                    <div className="sa-tcol1-name">{item.name}</div>
                    <div className="sa-tcol1-role">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
