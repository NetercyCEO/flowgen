"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { detectGraphicsProfile } from "@/lib/gpuProfile";
import { waitForAnvilReady, waitForHeroReady } from "@/lib/sceneReady";

const LETTERS = ["F", "l", "o", "w", "G", "e", "n"] as const;

/**
 * Fullscreen preloader adapted to FlowGen's graphite + ember + Instrument Serif palette.
 * Preloads fonts, graphics backend profile, 3D chunks/assets, and waits for Hero 3D Frame 1
 * (plus a brief window for Anvil 3D warm-up) before lifting cleanly.
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
    const timers: number[] = [];

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
          duration: reduced ? 0.12 : 0.45,
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
          { yPercent: 0, duration: 0.72, stagger: 0.04, ease: "expo.out" }
        );
      }

      let safetyTimer = 0;

      const triggerExit = () => {
        if (cancelled || exited) return;
        exited = true;
        window.clearTimeout(safetyTimer);
        raise(100);

        const finish = () => {
          if (cancelled) return;
          unlockScroll();
          setDone(true);
        };

        if (reduced) {
          gsap.to(rootRef.current, {
            autoAlpha: 0,
            duration: 0.2,
            delay: 0.05,
            onComplete: finish,
          });
          return;
        }

        gsap
          .timeline({ delay: 0.12, defaults: { ease: "expo.inOut" } })
          .to(".loader-ch", {
            yPercent: -105,
            duration: 0.45,
            stagger: 0.03,
            ease: "expo.in",
          })
          .to([".loader-foot", ".loader-bar"], { autoAlpha: 0, duration: 0.25 }, "<")
          .fromTo(
            rootRef.current,
            { clipPath: "inset(0% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 100% 0%)", duration: 0.58, onComplete: finish },
            "-=0.2"
          );
      };

      const fontsPromise = Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise<void>((r) => {
          timers.push(window.setTimeout(r, 1500));
        }),
      ])
        .catch(() => {})
        .then(() => raise(25));

      const preloadChunksPromise = Promise.all([
        detectGraphicsProfile().catch(() => {}),
        import("./FlowConversion3D").catch(() => {}),
        import("./AnvilForge3D")
          .then((m) => m.preloadAnvilGLTF())
          .catch(() => {}),
      ]).then(() => raise(55));

      const heroReadyPromise = waitForHeroReady(4500).then(() => raise(88));

      const minTime = new Promise<void>((r) => {
        timers.push(window.setTimeout(r, reduced ? 120 : 450));
      });

      Promise.all([
        fontsPromise,
        preloadChunksPromise,
        heroReadyPromise,
        minTime,
      ]).then(async () => {
        if (cancelled || exited) return;
        await waitForAnvilReady(500);
        triggerExit();
      });

      // Hard safety cap so visitors are never trapped behind the loader
      safetyTimer = window.setTimeout(triggerExit, 6000);
      timers.push(safetyTimer);
    }, rootRef);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
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
