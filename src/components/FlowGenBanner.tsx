"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { THEME } from "@/lib/theme";

gsap.registerPlugin(ScrollTrigger);

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const LINES = 12;

/**
 * FLOWGEN silk-cutout reveal: Canvas2D source-atop warm waves + scroll-scrubbed zoom.
 */
export function FlowGenBanner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoom = useRef({ p: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const waveSpeed = reduced ? 0.45 : 1.0;
    const zoomAmp = reduced ? 0.5 : 1.1;

    let raf = 0;
    let time = 0;
    let lastNow = performance.now();
    let visible = false;
    let hidden = document.hidden;
    let w = 0;
    let h = 0;
    let fit = 1;
    let step = 16;
    let lineGrads: CanvasGradient[] = [];
    let glow: CanvasGradient | null = null;

    const resize = () => {
      const cssW = Math.max(canvas.offsetWidth, 1);
      const cssH = Math.max(canvas.offsetHeight, 1);
      const rawDpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const scale = Math.min(rawDpr, 1440 / cssW);
      w = Math.max(1, Math.round(cssW * scale));
      h = Math.max(1, Math.round(cssH * scale));
      canvas.width = w;
      canvas.height = h;
      step = Math.max(14, Math.round(w / 72));

      ctx.font = "700 180px Inter, -apple-system, sans-serif";
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "-9px";
      }
      const measuredWidth = Math.max(ctx.measureText("FLOWGEN").width, 1);
      fit = Math.min((w * 0.86) / measuredWidth, (h * 0.72) / 180);

      lineGrads = Array.from({ length: LINES }, (_, i) => {
        const p = i / (LINES - 1);
        const a = 0.28 + 0.62 * Math.sin(Math.PI * p);
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, rgba(THEME.aquaDeep, 0));
        g.addColorStop(0.28, rgba(THEME.aqua, a));
        g.addColorStop(0.62, rgba(THEME.aquaSoft, a));
        g.addColorStop(1, rgba(THEME.aquaDeep, 0));
        return g;
      });
      glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.45);
      glow.addColorStop(0, rgba(THEME.aqua, 0.22));
      glow.addColorStop(1, rgba(THEME.aqua, 0));
    };

    const draw = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      const scale = fit * (1 + (1 - zoom.current.p) * zoomAmp);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.font = "700 180px Inter, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "-9px";
      }
      ctx.fillStyle = THEME.bannerFill;
      ctx.fillText("FLOWGEN", 0, 6);
      ctx.restore();

      ctx.globalCompositeOperation = "source-atop";
      if (glow) {
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      const lineScale = Math.max(1, w / 960);
      for (let i = 0; i < LINES; i++) {
        const p = i / (LINES - 1);
        ctx.strokeStyle = lineGrads[i];
        ctx.lineWidth = (i % 4 === 0 ? 1.8 : 1.05) * lineScale;
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const nx = x / w;
          const y =
            h * 0.5 +
            Math.sin(nx * 5.0 + time + p * 1.6) * h * (0.12 + p * 0.08) +
            Math.cos(nx * 2.4 - time * 0.6 + p * 2.1) * h * 0.07;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible || hidden) return;
      const dt = Math.max(0, Math.min((now - lastNow) / 1000, 0.05));
      lastNow = Math.max(lastNow, now);
      time += dt * 0.55 * waveSpeed;
      draw();
      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (raf || !visible || hidden) return;
      lastNow = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    resize();
    draw();

    const onResize = () => {
      resize();
      draw();
    };
    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) stopLoop();
      else startLoop();
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) startLoop();
          else stopLoop();
        },
        { rootMargin: "160px" }
      );
      io.observe(canvas);
    } else {
      visible = true;
      startLoop();
    }

    document.fonts?.ready.then(() => {
      resize();
      draw();
    });

    return () => {
      stopLoop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      zoom.current.p = 0;
      gsap.to(zoom.current, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top 92%",
          end: "center 48%",
          scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      return () => {
        zoom.current.p = 1;
      };
    },
    { scope: wrapRef }
  );

  return (
    <div ref={wrapRef} className="relative overflow-hidden bg-canvas py-4">
      <div
        ref={stageRef}
        className="relative h-[120px] w-full sm:h-[200px] lg:h-[270px] 2xl:h-[330px]"
      >
        <canvas ref={canvasRef} className="block h-full w-full bg-canvas" aria-hidden="true" />
      </div>
    </div>
  );
}
