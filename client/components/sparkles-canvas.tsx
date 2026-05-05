import React, { useEffect, useRef } from "react";

export function SparklesCanvas({
  color = "#ffffff",
  density = 120,
  speed = 1.2,
  minSz = 0.4,
  maxSz = 1.4,
  style = {},
}: {
  color?: string;
  density?: number;
  speed?: number;
  minSz?: number;
  maxSz?: number;
  style?: React.CSSProperties;
}) {
  const cvs = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = cvs.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let W = el.offsetWidth;
    let H = el.offsetHeight;
    el.width = W;
    el.height = H;
    const hex = color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const pts = Array.from({ length: density }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      sz: minSz + Math.random() * (maxSz - minSz),
      op: Math.random(),
      dop: (Math.random() * 0.02 + 0.005) * speed * (Math.random() < 0.5 ? 1 : -1),
      vx: (Math.random() - 0.5) * 0.22 * speed,
      vy: (Math.random() - 0.5) * 0.22 * speed,
    }));
    let raf = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.op += p.dop;
        if (p.op > 1) {
          p.op = 1;
          p.dop *= -1;
        }
        if (p.op < 0.04) {
          p.op = 0.04;
          p.dop *= -1;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.op})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onR = () => {
      W = el.offsetWidth;
      H = el.offsetHeight;
      el.width = W;
      el.height = H;
      pts.forEach((p) => {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
      });
    };
    window.addEventListener("resize", onR);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, [color, density, speed, minSz, maxSz]);
  return <canvas ref={cvs} style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none", ...style }} />;
}
