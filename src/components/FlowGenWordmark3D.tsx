"use client";

import React, { useEffect, useRef, useState } from "react";
import { THEME } from "@/lib/theme";

const WORDMARK_TEXT = "FlowGen";

/**
 * Lightweight zero-WebGL animated "FlowGen" wordmark on a steady baseline:
 * ember-to-platinum flowing current gradient, 3 internal silk ribbons,
 * and a periodic diagonal sheen sweep moving strictly inside the letters.
 */
export function FlowGenWordmark3D() {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMq = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let time = 0;
    let lastNow = performance.now();
    let visible = true;
    let hidden = document.hidden;
    let w = 0;
    let h = 0;
    let fontSize = 48;

    const layoutText = () => {
      const cssW = Math.max(wrap.offsetWidth, 1);
      const cssH = Math.max(wrap.offsetHeight, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(cssW * dpr));
      h = Math.max(1, Math.round(cssH * dpr));
      canvas.width = w;
      canvas.height = h;

      fontSize = Math.round(h * 0.72);
      ctx.font = `700 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(
          fontSize * -0.032
        ).toFixed(2)}px`;
      }

      const fullWidth = ctx.measureText(WORDMARK_TEXT).width;
      const maxFit = w * 0.92;
      if (fullWidth > maxFit && fullWidth > 0) {
        fontSize = Math.floor(fontSize * (maxFit / fullWidth));
        ctx.font = `700 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
        if ("letterSpacing" in ctx) {
          (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(
            fontSize * -0.032
          ).toFixed(2)}px`;
        }
      }
    };

    const draw = () => {
      if (w <= 0 || h <= 0) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      ctx.font = `700 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(
          fontSize * -0.032
        ).toFixed(2)}px`;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = THEME.ink;
      ctx.fillText(WORDMARK_TEXT, w / 2, h * 0.52);

      // Clip internal animation exclusively inside the steady letterforms
      ctx.globalCompositeOperation = "source-atop";

      const shift = 0.5 + 0.25 * Math.sin(time * 1.15);
      const baseGrad = ctx.createLinearGradient(0, 0, w, h);
      baseGrad.addColorStop(0, THEME.aquaDeep);
      baseGrad.addColorStop(Math.max(0.15, shift - 0.18), THEME.aqua);
      baseGrad.addColorStop(Math.min(0.9, shift + 0.16), THEME.ink);
      baseGrad.addColorStop(1, THEME.aqua);
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // Three flowing silk ribbons gliding horizontally inside the text
      const ribbons = [
        { amp: 0.15, freq: 6.2, speed: -2.0, phase: 0, lw: 0.072, color: "rgba(247, 173, 128, 0.78)" },
        { amp: 0.12, freq: 4.8, speed: 1.6, phase: 2.1, lw: 0.055, color: "rgba(229, 107, 42, 0.72)" },
        { amp: 0.09, freq: 7.4, speed: -1.4, phase: 4.0, lw: 0.042, color: "rgba(255, 212, 184, 0.65)" },
      ];
      const step = Math.max(4, Math.round(w / 44));
      for (const r of ribbons) {
        ctx.strokeStyle = r.color;
        ctx.lineWidth = Math.max(1.5, h * r.lw);
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const nx = x / w;
          const y = h * (0.52 + r.amp * Math.sin(nx * r.freq + time * r.speed + r.phase));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Periodic diagonal liquid gloss sweep across the wordmark
      const sweepPos = ((time * 0.36) % 1.45) - 0.22;
      const sx = sweepPos * w;
      const sw = w * 0.22;
      const sweepGrad = ctx.createLinearGradient(sx - sw, 0, sx + sw, h * 0.65);
      sweepGrad.addColorStop(0, "rgba(255, 212, 184, 0)");
      sweepGrad.addColorStop(0.5, "rgba(255, 224, 200, 0.75)");
      sweepGrad.addColorStop(1, "rgba(255, 212, 184, 0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible || hidden) return;
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      time += dt;
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

    layoutText();
    draw();
    startLoop();

    const onResize = () => {
      layoutText();
      draw();
    };
    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) stopLoop();
      else startLoop();
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              if (visible) startLoop();
              else stopLoop();
            },
            { threshold: 0.01 }
          )
        : null;
    io?.observe(wrap);

    document.fonts?.ready.then(() => {
      layoutText();
      draw();
    });

    return () => {
      stopLoop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, [reducedMotion]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex h-14 w-[240px] items-center justify-center sm:h-16 sm:w-[290px] lg:h-20 lg:w-[330px] 2xl:h-24 2xl:w-[370px]"
    >
      {reducedMotion ? (
        <span className="text-[30px] font-bold tracking-[-0.035em] text-ink sm:text-[36px] lg:text-[44px] 2xl:text-[50px]">
          FlowGen
        </span>
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
      )}
    </span>
  );
}
