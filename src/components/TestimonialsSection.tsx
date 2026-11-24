"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { createFreshProofGifUrl, preloadProofGifs } from "@/lib/proofVideos";
import { markProofVideosReady, waitForLoaderReveal } from "@/lib/sceneReady";
import gadgetCentrePreview from "../../public/previews/gadget-centre.png";
import wijsdomPodcastPreview from "../../public/previews/wijsdom-podcast.png";
import captainAutohandelPreview from "../../public/previews/captain-autohandel.png";
import cardboardWebshopPreview from "../../public/previews/cardboard-webshop.png";

const PROOF_PROJECTS = [
  {
    number: "01",
    name: "Gadget Centre",
    category: "E-commerce",
    url: "https://gadgetcentres.co.uk/",
    domain: "gadgetcentres.co.uk",
    summary: "High-converting storefront built for speed and effortless product discovery",
    preview: gadgetCentrePreview,
    gif: "/previews/gadget-centre.gif",
  },
  {
    number: "02",
    name: "Wijsdom Podcast",
    category: "Media & Podcast",
    url: "https://www.wijsdompodcast.nl/",
    domain: "wijsdompodcast.nl",
    summary: "Editorial podcast hub designed for clean episode browsing and listener growth",
    preview: wijsdomPodcastPreview,
    gif: "/previews/wijsdom-podcast.gif",
  },
  {
    number: "03",
    name: "Captain Autohandel",
    category: "WebGPU · 3D Auto",
    url: "https://captain-autohandel-webgpu.vercel.app/",
    domain: "captain-autohandel-webgpu.vercel.app",
    summary: "Interactive WebGPU 3D automotive showcase built to drive showroom inquiries",
    preview: captainAutohandelPreview,
    gif: "/previews/captain-autohandel.gif",
  },
  {
    number: "04",
    name: "Cardboard Webshop",
    category: "Interactive 3D · Webshop",
    url: "https://3dlandignpage.vercel.app/",
    domain: "3dlandignpage.vercel.app",
    summary: "Interactive 3D webshop experience where buyers explore products in the browser",
    preview: cardboardWebshopPreview,
    gif: "/previews/cardboard-webshop.gif",
  },
] as const;

const TOTAL_PROJECTS = PROOF_PROJECTS.length;
const MAX_INDEX = TOTAL_PROJECTS - 1;

function CurvedFlowArrow({
  direction,
  className = "",
}: {
  direction: "prev" | "next";
  className?: string;
}) {
  return (
    <svg
      width="28"
      height="13"
      viewBox="0 0 64 28"
      aria-hidden="true"
      className={className}
    >
      <g transform={direction === "prev" ? "translate(64 0) scale(-1 1)" : undefined}>
        <path
          fill="currentColor"
          d="M 4 5 C 14 17 28 19 46 17 L 46 10 L 60 18.5 L 46 27 L 46 21 C 27 22 13 19 4 5 Z"
        />
      </g>
    </svg>
  );
}

/**
 * Proof section: linear 4-card GSAP showcase with preloaded GIF Blobs that start
 * together from Frame 0 when entering Proof, mint fresh blob: URLs on hover to
 * restart cleanly without lag, depth blur, clean edge fades, and bigger arrows.
 */
export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [gifsReady, setGifsReady] = useState(false);
  const [activeGifUrls, setActiveGifUrls] = useState<(string | null)[]>(() =>
    Array(TOTAL_PROJECTS).fill(null)
  );
  const [hoverCounts, setHoverCounts] = useState<number[]>(() =>
    Array(TOTAL_PROJECTS).fill(0)
  );

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const posRef = useRef(0);
  const targetPosRef = useRef(0);
  const strideRef = useRef(315);
  const inViewRef = useRef(false);
  const loaderRevealedRef = useRef(false);
  const gifsReadyRef = useRef(false);
  const activeGifUrlsRef = useRef<(string | null)[]>(Array(TOTAL_PROJECTS).fill(null));
  const revokeTimersRef = useRef<number[]>([]);
  const snapTweenRef = useRef<gsap.core.Tween | null>(null);
  const wheelCooldownRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const scheduleRevoke = useCallback((url: string | null) => {
    if (!url || !url.startsWith("blob:")) return;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      revokeTimersRef.current = revokeTimersRef.current.filter((id) => id !== timer);
    }, 600);
    revokeTimersRef.current.push(timer);
  }, []);

  const startAllGifs = useCallback(() => {
    const nextUrls = PROOF_PROJECTS.map((project) => createFreshProofGifUrl(project.gif));
    activeGifUrlsRef.current.forEach((prevUrl) => scheduleRevoke(prevUrl));
    activeGifUrlsRef.current = nextUrls;
    setActiveGifUrls(nextUrls);
  }, [scheduleRevoke]);

  const stopAllGifs = useCallback(() => {
    if (!activeGifUrlsRef.current.some(Boolean)) return;
    activeGifUrlsRef.current.forEach((prevUrl) => scheduleRevoke(prevUrl));
    const empty = Array<string | null>(TOTAL_PROJECTS).fill(null);
    activeGifUrlsRef.current = empty;
    setActiveGifUrls(empty);
  }, [scheduleRevoke]);

  const syncPlayback = useCallback(() => {
    if (inViewRef.current && loaderRevealedRef.current && gifsReadyRef.current) {
      if (!activeGifUrlsRef.current.some(Boolean)) {
        startAllGifs();
      }
    } else {
      stopAllGifs();
    }
  }, [startAllGifs, stopAllGifs]);

  const layoutCards = useCallback(() => {
    const stride = strideRef.current;
    const pos = posRef.current;

    for (let i = 0; i < TOTAL_PROJECTS; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const offset = i - pos;
      const dist = Math.abs(offset);
      const scale = Math.max(0.82, 1.06 - dist * 0.2);
      const opacity = dist > 2.3 ? 0 : Math.max(0.24, 1 - dist * 0.34);
      const blurPx = dist < 0.08 ? 0 : Math.min(5, dist * 2.6);

      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x: offset * stride,
        scale,
        opacity,
        filter: blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : "none",
        zIndex: Math.round(30 - dist * 10),
        pointerEvents: dist > 1.8 ? "none" : "auto",
      });
    }

    const clampedIdx = Math.max(0, Math.min(MAX_INDEX, Math.round(pos)));
    setActiveIndex((prev) => (prev === clampedIdx ? prev : clampedIdx));
  }, []);

  const animateToSlot = useCallback(
    (nextPos: number) => {
      const clamped = Math.max(0, Math.min(MAX_INDEX, Math.round(nextPos)));
      targetPosRef.current = clamped;
      snapTweenRef.current?.kill();

      const proxy = { pos: posRef.current };
      snapTweenRef.current = gsap.to(proxy, {
        pos: clamped,
        duration: 0.72,
        ease: "back.out(1.15)",
        onUpdate: () => {
          posRef.current = proxy.pos;
          layoutCards();
        },
        onComplete: () => {
          posRef.current = clamped;
          targetPosRef.current = clamped;
          snapTweenRef.current = null;
          layoutCards();
        },
      });
    },
    [layoutCards]
  );

  const stepBy = useCallback(
    (delta: number) => {
      const base = snapTweenRef.current ? targetPosRef.current : Math.round(posRef.current);
      const next = Math.max(0, Math.min(MAX_INDEX, base + delta));
      if (next === base && !snapTweenRef.current && Math.abs(posRef.current - base) < 0.001) {
        return;
      }
      animateToSlot(next);
    },
    [animateToSlot]
  );

  // Preload all 4 GIF Blobs on mount & synchronize reveal with PageLoader
  useEffect(() => {
    let cancelled = false;

    preloadProofGifs().then(() => {
      if (cancelled) return;
      gifsReadyRef.current = true;
      setGifsReady(true);
      markProofVideosReady();
      syncPlayback();
    });

    waitForLoaderReveal().then(() => {
      if (cancelled) return;
      loaderRevealedRef.current = true;
      syncPlayback();
    });

    return () => {
      cancelled = true;
      revokeTimersRef.current.forEach((id) => window.clearTimeout(id));
      revokeTimersRef.current = [];
      activeGifUrlsRef.current.forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      activeGifUrlsRef.current = Array(TOTAL_PROJECTS).fill(null);
    };
  }, [syncPlayback]);

  // Layout, IntersectionObserver visibility tracking, drag/swipe, and wheel support
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!stage) return;

    const measureAndLayout = () => {
      const firstCard = cardRefs.current[0];
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 295;
      const gap = window.innerWidth < 640 ? 14 : 20;
      strideRef.current = cardWidth + gap;
      layoutCards();
    };

    measureAndLayout();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureAndLayout) : null;
    ro?.observe(stage);

    const io =
      section && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              inViewRef.current = entries.some((entry) => entry.isIntersecting);
              syncPlayback();
            },
            { threshold: 0.15 }
          )
        : null;
    if (section && io) {
      io.observe(section);
    } else {
      inViewRef.current = true;
      syncPlayback();
    }

    window.addEventListener("resize", measureAndLayout, { passive: true });

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startPos = 0;
    let lockedAxis: "x" | "y" | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startPos = posRef.current;
      lockedAxis = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!lockedAxis) {
        if (Math.abs(dx) <= 8 && Math.abs(dy) <= 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          pointerId = null;
          return;
        }
        lockedAxis = "x";
        snapTweenRef.current?.kill();
        snapTweenRef.current = null;
      }

      const rawPos = startPos - dx / strideRef.current;
      if (rawPos < 0) {
        posRef.current = rawPos * 0.22;
      } else if (rawPos > MAX_INDEX) {
        posRef.current = MAX_INDEX + (rawPos - MAX_INDEX) * 0.22;
      } else {
        posRef.current = rawPos;
      }
      layoutCards();
    };

    const finishDrag = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const wasDragging = lockedAxis === "x";
      const dx = e.clientX - startX;
      pointerId = null;
      lockedAxis = null;

      if (!wasDragging) return;
      suppressClickUntilRef.current = performance.now() + 260;

      let snapTarget = Math.round(posRef.current);
      if (Math.abs(dx) > 36 && Math.abs(dx) < strideRef.current * 0.5) {
        snapTarget = Math.round(startPos + (dx < 0 ? 1 : -1));
      }
      snapTarget = Math.max(0, Math.min(MAX_INDEX, snapTarget));
      animateToSlot(snapTarget);
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const rawDelta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(rawDelta) < 12) return;

      e.preventDefault();
      const now = performance.now();
      if (now < wheelCooldownRef.current) return;
      wheelCooldownRef.current = now + 380;
      stepBy(rawDelta > 0 ? 1 : -1);
    };

    stage.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    stage.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      snapTweenRef.current?.kill();
      snapTweenRef.current = null;
      ro?.disconnect();
      io?.disconnect();
      window.removeEventListener("resize", measureAndLayout);
      stage.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      stage.removeEventListener("wheel", onWheel);
    };
  }, [animateToSlot, layoutCards, stepBy, syncPlayback]);

  const handleCardMouseEnter = useCallback(
    (index: number) => {
      if (!loaderRevealedRef.current || !gifsReadyRef.current) return;
      const freshUrl = createFreshProofGifUrl(PROOF_PROJECTS[index].gif);
      const prevUrl = activeGifUrlsRef.current[index];
      scheduleRevoke(prevUrl);
      const next = [...activeGifUrlsRef.current];
      next[index] = freshUrl;
      activeGifUrlsRef.current = next;
      setActiveGifUrls(next);
      setHoverCounts((prev) => prev.map((c, idx) => (idx === index ? c + 1 : c)));
    },
    [scheduleRevoke]
  );

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    if (performance.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      return;
    }
    const offset = index - posRef.current;
    if (Math.abs(offset) > 0.35) {
      e.preventDefault();
      animateToSlot(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepBy(1);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      onKeyDown={handleKeyDown}
      className="mx-auto flex max-w-6xl flex-col justify-center bg-canvas px-4 pb-24 pt-5 sm:px-6 sm:pb-24 sm:pt-6 lg:pb-24 lg:pt-4 2xl:max-w-7xl 2xl:pb-28 2xl:pt-8"
    >
      <div className="mx-auto flex w-full max-w-[248px] items-end justify-between gap-2 sm:mx-0 sm:max-w-none">
        <div>
          <p className="text-[13px] text-aqua">Proof</p>
          <h2 className="mt-1.5 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl lg:text-[42px] 2xl:text-5xl">
            Selected{" "}
            <span className="font-serif font-normal italic text-ink-muted">work</span>
          </h2>
        </div>

        <p
          data-testid="proof-counter"
          className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-ink-faint sm:text-sm"
        >
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(TOTAL_PROJECTS).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={stageRef}
        aria-roledescription="carousel"
        aria-label="Selected work horizontal showcase"
        style={{ touchAction: "pan-y" }}
        className="relative mt-2.5 h-[366px] w-full select-none overflow-x-clip sm:mt-3 sm:h-[396px] lg:h-[404px] 2xl:h-[456px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-14 bg-gradient-to-r from-canvas via-canvas/85 to-transparent sm:w-32 lg:w-52 2xl:w-64"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-14 bg-gradient-to-l from-canvas via-canvas/85 to-transparent sm:w-32 lg:w-52 2xl:w-64"
        />

        {PROOF_PROJECTS.map((project, index) => {
          const isCenter = index === activeIndex;
          const activeGifUrl = activeGifUrls[index];
          return (
            <a
              key={project.number}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              onMouseEnter={() => handleCardMouseEnter(index)}
              onClick={(e) => handleCardClick(e, index)}
              tabIndex={isCenter ? 0 : -1}
              data-testid={`proof-project-${project.number}`}
              className={`group absolute left-1/2 top-1/2 flex h-[332px] w-[248px] flex-col justify-between rounded-3xl border bg-surface p-3 transition-colors duration-200 ease-premium sm:h-[360px] sm:w-[285px] lg:h-[364px] lg:w-[300px] 2xl:h-[410px] 2xl:w-[345px] 2xl:p-3.5 ${
                isCenter
                  ? "border-aqua/40 shadow-[0_14px_30px_rgba(0,0,0,0.42),0_0_20px_-8px_rgba(229,107,42,0.28)]"
                  : "border-line/[0.08] hover:border-aqua/30"
              }`}
            >
              <div>
                <div
                  data-gif-ready={gifsReady ? "true" : "false"}
                  data-gif-playing={activeGifUrl ? "true" : "false"}
                  data-hover-restarts={String(hoverCounts[index])}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line/[0.08] bg-canvas"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.preview.src}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 ease-premium group-hover:scale-[1.03]"
                  />
                  {activeGifUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeGifUrl}
                      data-gif-src={project.gif}
                      alt={`${project.name} animated showcase`}
                      className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 ease-premium group-hover:scale-[1.03]"
                    />
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-aqua">
                      {project.number}
                    </span>
                    <span className="text-xs text-ink-faint" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate text-xs text-ink-faint">{project.category}</span>
                  </div>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line/[0.10] bg-canvas text-ink-faint transition-colors duration-150 ease-premium group-hover:border-aqua/45 group-hover:text-aqua-soft">
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-150 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <h3 className="mt-1 text-base font-semibold tracking-[-0.025em] text-ink sm:text-lg">
                  {project.name}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted">
                  {project.summary}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/[0.07] pt-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-aqua"
                    style={{ boxShadow: "0 0 8px rgba(229, 107, 42, 0.75)" }}
                  />
                  <span className="truncate text-xs text-ink-faint">{project.domain}</span>
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-aqua-soft">
                  Visit live site
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="relative z-30 mt-4 hidden w-full items-center justify-end gap-2 sm:flex sm:pr-0 md:gap-3 md:pr-6 lg:pr-28 xl:pr-44 2xl:pr-56">
        <button
          type="button"
          data-testid="proof-prev"
          disabled={activeIndex === 0}
          onClick={() => stepBy(-1)}
          aria-label="Previous project"
          className="group inline-flex h-11 items-center justify-center rounded-full border border-line/[0.14] bg-surface px-4 text-ink-muted shadow-[0_8px_22px_rgba(0,0,0,0.38)] transition-all duration-150 ease-premium hover:-translate-x-0.5 hover:border-aqua/50 hover:text-aqua-soft hover:shadow-[0_0_18px_-4px_rgba(229,107,42,0.5)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:border-line/[0.14] disabled:hover:text-ink-muted disabled:hover:shadow-[0_8px_22px_rgba(0,0,0,0.38)]"
        >
          <CurvedFlowArrow
            direction="prev"
            className="transition-transform duration-150 group-hover:scale-105 group-disabled:scale-100"
          />
        </button>

        <button
          type="button"
          data-testid="proof-next"
          disabled={activeIndex === MAX_INDEX}
          onClick={() => stepBy(1)}
          aria-label="Next project"
          className="group inline-flex h-11 items-center justify-center rounded-full border border-line/[0.14] bg-surface px-4 text-ink-muted shadow-[0_8px_22px_rgba(0,0,0,0.38)] transition-all duration-150 ease-premium hover:translate-x-0.5 hover:border-aqua/50 hover:text-aqua-soft hover:shadow-[0_0_18px_-4px_rgba(229,107,42,0.5)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:border-line/[0.14] disabled:hover:text-ink-muted disabled:hover:shadow-[0_8px_22px_rgba(0,0,0,0.38)]"
        >
          <CurvedFlowArrow
            direction="next"
            className="transition-transform duration-150 group-hover:scale-105 group-disabled:scale-100"
          />
        </button>
      </div>
    </section>
  );
}
