import { useEffect, useRef } from "react";

// Confeti de papelitos rasgados (no neón). / Torn-paper confetti (no neon).
const COLORS = ["#ffe27a", "#ffb3c8", "#bdec8a", "#a9d8ff", "#ff6f61", "#f3e9d2"];

type P = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; vr: number; life: number;
};

export default function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (trigger === 0) return;
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.36;
    for (let i = 0; i < 120; i++) {
      const ang = (Math.PI * 2 * i) / 120 + (i % 3) * 0.2;
      const sp = 5 + (i % 7);
      parts.current.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4,
        size: 6 + (i % 4) * 2, color: COLORS[i % COLORS.length],
        rot: i, vr: (i % 5) - 2, life: 1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.current.forEach((p) => {
        p.vy += 0.22; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.011;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      });
      parts.current = parts.current.filter((p) => p.life > 0 && p.y < window.innerHeight + 50);
      if (parts.current.length) raf.current = requestAnimationFrame(draw);
      else { ctx.clearRect(0, 0, cv.width, cv.height); raf.current = undefined; }
    };
    if (!raf.current) raf.current = requestAnimationFrame(draw);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = undefined; };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
      aria-hidden
    />
  );
}
