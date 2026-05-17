"use client";

import { useEffect, useRef } from "react";
import type { JARVISState } from "@/types/jarvis";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  flash: number;
}

export function BrainNetwork({ state }: { state: JARVISState }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const ns = useRef<Node[]>([]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      ns.current = Array.from({ length: 65 }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 0.5,
        flash: 0,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const P = {
      idle:      { dist: 85,  rate: 0.006, la: 0.1,  nc: "#5d8156" },
      thinking:  { dist: 130, rate: 0.04,  la: 0.38, nc: "#38c4b4" },
      speaking:  { dist: 108, rate: 0.022, la: 0.26, nc: "#7aba6e" },
      listening: { dist: 112, rate: 0.028, la: 0.3,  nc: "#f4a435" },
    };

    const draw = () => {
      const p = P[state] || P.idle;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ns.current.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > cv.width) n.vx *= -1;
        if (n.y < 0 || n.y > cv.height) n.vy *= -1;
        if (Math.random() < p.rate) n.flash = 22 + Math.floor(Math.random() * 18);
        if (n.flash > 0) n.flash--;
      });
      for (let i = 0; i < ns.current.length; i++) {
        for (let j = i + 1; j < ns.current.length; j++) {
          const dx = ns.current[i].x - ns.current[j].x;
          const dy = ns.current[i].y - ns.current[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < p.dist) {
            const fire = ns.current[i].flash > 0 || ns.current[j].flash > 0;
            ctx.strokeStyle = p.nc;
            ctx.globalAlpha = Math.min(p.la * (1 - d / p.dist) * (fire ? 4 : 1), 0.65);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ns.current[i].x, ns.current[i].y);
            ctx.lineTo(ns.current[j].x, ns.current[j].y);
            ctx.stroke();
          }
        }
      }
      ns.current.forEach((n) => {
        ctx.fillStyle = p.nc;
        ctx.globalAlpha = Math.min(n.flash > 0 ? 0.95 : p.la * 2.5, 0.9);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.flash > 0 ? n.r * 2.2 : n.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [state]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.55,
      }}
    />
  );
}
