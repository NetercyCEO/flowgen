"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { detectGraphicsProfile } from "@/lib/gpuProfile";
import { waitForAnvilReady, waitForHeroReady } from "@/lib/sceneReady";

gsap.registerPlugin(ScrollTrigger);

const LETTERS = ["F", "l", "o", "w", "G", "e", "n"] as const;

/**
 * GPU-composited fullscreen preloader adapted to FlowGen's graphite + ember + Instrument Serif palette.
 * Uses Element.animate (WAAPI) on transform/opacity compositor layers so letter entrance (bottom -> middle,
 * F -> n), opposite reverse exit (middle -> top, n -> F), and curtain reveal stay silky even while
 * 3D shaders initialize in Chrome & Firefox.
 */
export function PageLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const barWrapRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
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

    let cancelled = false;
    let exited = false;
    let finished = false;
    let targetVal = 0;
    let currentVal = 0;
    let lastRenderedInt = 0;
    let currentScale = 0;
    let countRaf = 0;
    let mountRaf1 = 0;
    let mountRaf2 = 0;
    let barAnim: Animation | null = null;
    const timers: number[] = [];
    const activeAnims = new Set<Animation>();

    let resolveEntrance: (() => void) | null = null;
    let entranceResolved = false;
    const entranceDone = new Promise<void>((resolve) => {
      resolveEntrance = resolve;
    });
    const finishEntrance = () => {
      if (entranceResolved) return;
      entranceResolved = true;
      resolveEntrance?.();
    };

    const stepCounter = () => {
      countRaf = 0;
      if (cancelled) return;
      currentVal += (targetVal - currentVal) * 0.22;
      if (Math.abs(targetVal - currentVal) < 0.35) {
        currentVal = targetVal;
      }
      const rounded = Math.round(currentVal);
      if (countRef.current && rounded !== lastRenderedInt) {
        lastRenderedInt = rounded;
        countRef.current.textContent = String(rounded);
      }
      if (currentVal < targetVal) {
        countRaf = window.requestAnimationFrame(stepCounter);
      }
    };

    const raise = (v: number) => {
      if (cancelled || v <= targetVal) return;
      targetVal = v;
      if (!countRaf) {
        countRaf = window.requestAnimationFrame(stepCounter);
      }

      const bar = barRef.current;
      if (bar && typeof bar.animate === "function") {
        const toScale = v / 100;
        let fromScale = currentScale;
        if (barAnim) {
          try {
            const computed = window.getComputedStyle(bar).transform;
            if (computed && computed !== "none") {
              const m = new DOMMatrixReadOnly(computed);
              if (Number.isFinite(m.a)) fromScale = m.a;
            }
            barAnim.cancel();
            activeAnims.delete(barAnim);
          } catch {
            // Fall back cleanly to tracked scale
          }
        }
        bar.style.transform = `scaleX(${fromScale})`;
        currentScale = toScale;
        barAnim = bar.animate(
          [
            { transform: `scaleX(${fromScale})` },
            { transform: `scaleX(${toScale})` },
          ],
          {
            duration: 360,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          }
        );
        activeAnims.add(barAnim);
        const capturedBarAnim = barAnim;
        capturedBarAnim.finished
          .then(() => {
            if (!cancelled && bar) {
              bar.style.transform = `scaleX(${toScale})`;
            }
            activeAnims.delete(capturedBarAnim);
          })
          .catch(() => {});
      }
    };

    // Wait two frames so initial compositor layers are ready before starting entrance motion
    mountRaf1 = window.requestAnimationFrame(() => {
      if (cancelled) return;
      mountRaf2 = window.requestAnimationFrame(() => {
        if (cancelled || exited) return;
        const letters = letterRefs.current.filter(Boolean) as HTMLSpanElement[];
        if (!letters.length || typeof letters[0].animate !== "function") {
          letters.forEach((el) => {
            el.style.transform = "translate3d(0, 0%, 0)";
            el.style.opacity = "1";
          });
          finishEntrance();
          return;
        }

        const entranceAnims = letters.map((el, idx) => {
          const anim = el.animate(
            [
              { transform: "translate3d(0, 115%, 0)", opacity: 0 },
              { transform: "translate3d(0, 0%, 0)", opacity: 1 },
            ],
            {
              duration: 700,
              delay: idx * 55,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "forwards",
            }
          );
          activeAnims.add(anim);
          return anim;
        });

        Promise.all(entranceAnims.map((a) => a.finished))
          .then(() => {
            if (cancelled) return;
            letters.forEach((el, idx) => {
              el.style.transform = "translate3d(0, 0%, 0)";
              el.style.opacity = "1";
              const anim = entranceAnims[idx];
              if (anim) {
                activeAnims.delete(anim);
                try {
                  anim.cancel();
                } catch {
                  // Ignore if already cancelled
                }
              }
            });
            finishEntrance();
          })
          .catch(() => {
            finishEntrance();
          });
      });
    });

    // Guard against backgrounded tabs pausing rAF before entrance finishes
    timers.push(window.setTimeout(finishEntrance, 1600));

    let safetyTimer = 0;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      unlockScroll();
      window.requestAnimationFrame(() => ScrollTrigger.refresh());
      setDone(true);
    };

    const triggerExit = () => {
      if (cancelled || exited) return;
      exited = true;
      finishEntrance();
      window.clearTimeout(safetyTimer);
      raise(100);

      const letters = letterRefs.current.filter(Boolean) as HTMLSpanElement[];
      if (!letters.length || typeof letters[0].animate !== "function") {
        finish();
        return;
      }

      const holdMs = 140;
      const letterStepMs = 52;
      const letterExitMs = 560;

      // Ensure resting state before reverse upward sweep in case safety cap triggered early
      letters.forEach((el, idx) => {
        el.getAnimations?.().forEach((a) => {
          activeAnims.delete(a);
          a.cancel();
        });
        el.style.transform = "translate3d(0, 0%, 0)";
        el.style.opacity = "1";

        const revIdx = LETTERS.length - 1 - idx;
        const exitAnim = el.animate(
          [
            { transform: "translate3d(0, 0%, 0)", opacity: 1 },
            { transform: "translate3d(0, -115%, 0)", opacity: 0 },
          ],
          {
            duration: letterExitMs,
            delay: holdMs + revIdx * letterStepMs,
            easing: "cubic-bezier(0.7, 0, 0.84, 0)",
            fill: "forwards",
          }
        );
        activeAnims.add(exitAnim);
      });

      [footRef.current, barWrapRef.current].forEach((el) => {
        if (!el || typeof el.animate !== "function") return;
        const uiAnim = el.animate(
          [
            { transform: "translate3d(0, 0, 0)", opacity: 1 },
            { transform: "translate3d(0, -8px, 0)", opacity: 0 },
          ],
          {
            duration: 340,
            delay: 200,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          }
        );
        activeAnims.add(uiAnim);
      });

      const curtainDelay = holdMs + (LETTERS.length - 1) * letterStepMs + 420;
      const curtainDuration = 660;
      const root = rootRef.current;

      if (root && typeof root.animate === "function") {
        const curtainAnim = root.animate(
          [
            { transform: "translate3d(0, 0, 0)" },
            { transform: "translate3d(0, -100%, 0)" },
          ],
          {
            duration: curtainDuration,
            delay: curtainDelay,
            easing: "cubic-bezier(0.76, 0, 0.24, 1)",
            fill: "forwards",
          }
        );
        activeAnims.add(curtainAnim);
        curtainAnim.finished.catch(() => {}).finally(finish);
        timers.push(window.setTimeout(finish, curtainDelay + curtainDuration + 250));
      } else {
        finish();
      }
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

    Promise.all([
      fontsPromise,
      preloadChunksPromise,
      heroReadyPromise,
      entranceDone,
    ]).then(async () => {
      if (cancelled || exited) return;
      await waitForAnvilReady(850);
      triggerExit();
    });

    // Hard safety cap so visitors are never trapped behind the loader
    safetyTimer = window.setTimeout(triggerExit, 6500);
    timers.push(safetyTimer);

    return () => {
      cancelled = true;
      finishEntrance();
      if (countRaf) window.cancelAnimationFrame(countRaf);
      if (mountRaf1) window.cancelAnimationFrame(mountRaf1);
      if (mountRaf2) window.cancelAnimationFrame(mountRaf2);
      timers.forEach((id) => window.clearTimeout(id));
      activeAnims.forEach((anim) => {
        try {
          anim.cancel();
        } catch {
          // Ignore teardown errors
        }
      });
      activeAnims.clear();
      unlockScroll();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-canvas-deep text-ink select-none"
      style={{ willChange: "transform", contain: "layout style paint" }}
    >
      <div className="flex items-end">
        {LETTERS.map((ch, idx) => (
          <span key={idx} className="block overflow-hidden px-[0.02em]">
            <span
              ref={(el) => {
                letterRefs.current[idx] = el;
              }}
              className={`loader-ch block font-serif text-[clamp(68px,17vw,240px)] leading-[0.88] tracking-[-0.02em] ${
                idx >= 4 ? "text-aqua" : "text-ink"
              }`}
              style={{
                transform: "translate3d(0, 115%, 0)",
                opacity: 0,
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            >
              {ch}
            </span>
          </span>
        ))}
      </div>

      <div
        ref={footRef}
        className="loader-foot absolute inset-x-6 bottom-11 flex items-baseline justify-between sm:inset-x-10 sm:bottom-12"
      >
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

      <div
        ref={barWrapRef}
        className="loader-bar absolute inset-x-6 bottom-6 h-px bg-line/15 sm:inset-x-10 sm:bottom-7"
      >
        <i
          ref={barRef}
          className="block h-full w-full origin-left bg-aqua"
          style={{ transform: "scaleX(0)", willChange: "transform" }}
        />
      </div>
    </div>
  );
}
