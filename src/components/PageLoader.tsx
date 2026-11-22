"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const LETTERS = ["F", "l", "o", "w", "G", "e", "n"] as const;

/**
 * EV-AI-inspired fullscreen preloader adapted to FlowGen's graphite + aqua + Instrument Serif palette.
 * Preloads fonts, simplex-noise.png, anvil.glb, and the AnvilForge3D chunk before wiping open.
 */
export function PageLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const unlockScroll = () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let exited = false;
    let target = 0;
    const shown = { v: 0 };

    const drawProgress = () => {
      if (countRef.current) {
        countRef.current.textContent = String(Math.round(shown.v));
      }
      if (barRef.current) {
        gsap.set(barRef.current, { scaleX: shown.v / 100 });
      }
    };

    const ctx = gsap.context(() => {
      const raise = (v: number) => {
        if (cancelled || v <= target) return;
        target = v;
        gsap.to(shown, {
          v: target,
          duration: reduced ? 0.15 : 0.75,
          ease: "power2.out",
          overwrite: true,
          onUpdate: drawProgress,
        });
      };

      if (reduced) {
        gsap.set(".loader-ch", { y: 0, yPercent: 0 });
      } else {
        gsap.fromTo(
          ".loader-ch",
          { y: 0, yPercent: 105 },
          { yPercent: 0, duration: 1.15, stagger: 0.055, ease: "expo.out" }
        );
      }

      const triggerExit = () => {
        if (cancelled || exited) return;
        exited = true;
        raise(100);

        const finish = () => {
          if (cancelled) return;
          unlockScroll();
          setDone(true);
        };

        if (reduced) {
          gsap.to(rootRef.current, {
            autoAlpha: 0,
            duration: 0.25,
            delay: 0.15,
            onComplete: finish,
          });
          return;
        }

        gsap
          .timeline({ delay: 0.45, defaults: { ease: "expo.inOut" } })
          .to(".loader-ch", {
            yPercent: -105,
            duration: 0.75,
            stagger: 0.04,
            ease: "expo.in",
          })
          .to([".loader-foot", ".loader-bar"], { autoAlpha: 0, duration: 0.35 }, "<")
          .fromTo(
            rootRef.current,
            { clipPath: "inset(0% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 100% 0%)", duration: 0.95, onComplete: finish },
            "-=0.25"
          );
      };

      const fontsPromise = Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ])
        .catch(() => {})
        .then(() => raise(30));

      const noisePromise = fetch("/textures/simplex-noise.webp")
        .then((r) => r.arrayBuffer())
        .catch(() => {})
        .then(() => raise(55));

      const anvilPromise = Promise.all([
        fetch("/models/anvil.glb")
          .then((r) => r.arrayBuffer())
          .catch(() => {}),
        import("./AnvilForge3D").catch(() => {}),
      ]).then(() => raise(90));

      const minTime = new Promise<void>((r) => setTimeout(r, reduced ? 150 : 1050));

      Promise.all([fontsPromise, noisePromise, anvilPromise, minTime]).then(triggerExit);

      // Hard safety cap so visitors are never trapped behind the loader
      window.setTimeout(triggerExit, 6500);
    }, rootRef);

    return () => {
      cancelled = true;
      ctx.revert();
      unlockScroll();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-canvas-deep text-ink select-none"
    >
      <div className="flex items-end">
        {LETTERS.map((ch, idx) => (
          <span key={idx} className="block overflow-hidden px-[0.02em]">
            <span
              className={`loader-ch block translate-y-[105%] font-serif text-[clamp(68px,17vw,240px)] leading-[0.88] tracking-[-0.02em] ${
                idx >= 4 ? "text-aqua" : "text-ink"
              }`}
            >
              {ch}
            </span>
          </span>
        ))}
      </div>

      <div className="loader-foot absolute inset-x-6 bottom-11 flex items-baseline justify-between sm:inset-x-10 sm:bottom-12">
        <span className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          3D Web Studio
        </span>
        <span className="flex items-baseline">
          <span
            ref={countRef}
            className="font-serif text-[clamp(30px,3vw,46px)] tabular-nums leading-none text-ink"
          >
            0
          </span>
          <span className="ml-0.5 font-serif text-[clamp(16px,1.5vw,23px)] text-aqua/80">
            %
          </span>
        </span>
      </div>

      <div className="loader-bar absolute inset-x-6 bottom-6 h-px bg-line/15 sm:inset-x-10 sm:bottom-7">
        <i ref={barRef} className="block h-full w-full origin-left scale-x-0 bg-aqua" />
      </div>
    </div>
  );
}
