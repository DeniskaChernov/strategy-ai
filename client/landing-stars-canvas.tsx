import React, { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  op: number;
  phase: number;
  spd: number;
  glow: boolean;
};

/** Звёздный фон как в strategy-reference.html (без WebGL). */
export function LandingStarsCanvas({ theme }: { theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    const isDark = () => theme === "dark";

    function mkStars() {
      stars = [];
      for (let i = 0; i < 210; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 0.6 + 0.15,
          op: Math.random() * 0.28 + 0.07,
          phase: Math.random() * Math.PI * 2,
          spd: Math.random() * 0.015 + 0.003,
          glow: false,
        });
      }
      for (let i = 0; i < 55; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 0.7 + 0.35,
          op: Math.random() * 0.38 + 0.12,
          phase: Math.random() * Math.PI * 2,
          spd: Math.random() * 0.01 + 0.002,
          glow: false,
        });
      }
      for (let i = 0; i < 18; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 0.8 + 0.55,
          op: Math.random() * 0.45 + 0.18,
          phase: Math.random() * Math.PI * 2,
          spd: Math.random() * 0.007 + 0.002,
          glow: true,
        });
      }
    }

    function resize() {
      W = cv!.width = window.innerWidth;
      H = cv!.height = window.innerHeight;
      mkStars();
    }

    let raf = 0;
    let alive = true;

    function loop() {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, W, H);
      const a = isDark() ? 0.88 : 0.1;
      stars.forEach((s) => {
        s.phase += s.spd;
        const o = Math.max(0.02, Math.min(0.7, (s.op + Math.sin(s.phase) * 0.18) * a));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${o})`;
        ctx.fill();
        if (s.glow && isDark()) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          g.addColorStop(0, `rgba(220,212,255,${o * 0.3})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      });
    }

    resize();
    window.addEventListener("resize", resize);
    loop();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        opacity: theme === "dark" ? 0.45 : 0.12,
      }}
    >
      <canvas
        ref={ref}
        id="stars-canvas"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        aria-hidden
      />
    </div>
  );
}
