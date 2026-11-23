"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
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
  },
  {
    number: "02",
    name: "Wijsdom Podcast",
    category: "Media & Podcast",
    url: "https://www.wijsdompodcast.nl/",
    domain: "wijsdompodcast.nl",
    summary: "Editorial podcast hub designed for clean episode browsing and listener growth",
    preview: wijsdomPodcastPreview,
  },
  {
    number: "03",
    name: "Captain Autohandel",
    category: "WebGPU · 3D Auto",
    url: "https://captain-autohandel-webgpu.vercel.app/",
    domain: "captain-autohandel-webgpu.vercel.app",
    summary: "Interactive WebGPU 3D automotive showcase built to drive showroom inquiries",
    preview: captainAutohandelPreview,
  },
  {
    number: "04",
    name: "Cardboard Webshop",
    category: "Interactive 3D · Webshop",
    url: "https://3dlandignpage.vercel.app/",
    domain: "3dlandignpage.vercel.app",
    summary: "Interactive 3D webshop experience where buyers explore products in the browser",
    preview: cardboardWebshopPreview,
  },
] as const;

const TOTAL_PROJECTS = PROOF_PROJECTS.length;
const SLOT_COUNT = TOTAL_PROJECTS * 2;
const LOOP_SLOTS = Array.from({ length: SLOT_COUNT }, (_, slotIndex) => ({
  slotIndex,
  project: PROOF_PROJECTS[slotIndex % TOTAL_PROJECTS],
}));

function CurvedFlowArrow({
  direction,
  className = "",
}: {
  direction: "prev" | "next";
  className?: string;
}) {
  return (
    <svg
      width="34"
      height="15"
      viewBox="0 0 64 28"
      aria-hidden="true"
      className={`${direction === "prev" ? "-scale-x-100" : ""} ${className}`}
    >
      <path
        fill="currentColor"
        d="M 4 5 C 14 17 28 19 46 17 L 46 10 L 60 18.5 L 46 27 L 46 21 C 27 22 13 19 4 5 Z"
      />
    </svg>
  );
}

/**
 * Proof section: single-screen GSAP looping horizontal showcase with edge fade and curved ember controls.
 */
export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const posRef = useRef(0);
  const targetPosRef = useRef(0);
  const strideRef = useRef(344);
  const snapTweenRef = useRef<gsap.core.Tween | null>(null);
  const wheelCooldownRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const layoutCards = useCallback(() => {
    const stride = strideRef.current;
    const pos = posRef.current;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const wrapped = gsap.utils.wrap(-SLOT_COUNT / 2, SLOT_COUNT / 2, i - pos);
      const dist = Math.abs(wrapped);
      const scale = Math.max(0.88, 1 - dist * 0.055);
      const opacity = dist > 2.6 ? 0 : Math.max(0.28, 1 - dist * 0.32);

      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x: wrapped * stride,
        scale,
        opacity,
        zIndex: Math.round(30 - dist * 10),
      });
    }

    const normalized = ((Math.round(pos) % TOTAL_PROJECTS) + TOTAL_PROJECTS) % TOTAL_PROJECTS;
    setActiveIndex((prev) => (prev === normalized ? prev : normalized));
  }, []);

  const animateToSlot = useCallback(
    (nextPos: number) => {
      targetPosRef.current = nextPos;
      snapTweenRef.current?.kill();

      const proxy = { pos: posRef.current };
      snapTweenRef.current = gsap.to(proxy, {
        pos: nextPos,
        duration: 0.72,
        ease: "back.out(1.15)",
        onUpdate: () => {
          posRef.current = proxy.pos;
          layoutCards();
        },
        onComplete: () => {
          posRef.current = nextPos;
          targetPosRef.current = nextPos;
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
      animateToSlot(base + delta);
    },
    [animateToSlot]
  );

  const goToProject = useCallback(
    (projectIdx: number) => {
      const base = Math.round(posRef.current);
      const currentMod = ((base % TOTAL_PROJECTS) + TOTAL_PROJECTS) % TOTAL_PROJECTS;
      const shortestDelta = gsap.utils.wrap(
        -TOTAL_PROJECTS / 2,
        TOTAL_PROJECTS / 2,
        projectIdx - currentMod
      );
      animateToSlot(base + shortestDelta);
    },
    [animateToSlot]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measureAndLayout = () => {
      const firstCard = cardRefs.current[0];
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 320;
      const gap = window.innerWidth < 640 ? 18 : 24;
      strideRef.current = cardWidth + gap;
      layoutCards();
    };

    measureAndLayout();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureAndLayout) : null;
    ro?.observe(stage);
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

      posRef.current = startPos - dx / strideRef.current;
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
      window.removeEventListener("resize", measureAndLayout);
      stage.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      stage.removeEventListener("wheel", onWheel);
    };
  }, [animateToSlot, layoutCards, stepBy]);

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>, slotIndex: number) => {
    if (performance.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      return;
    }
    const wrapped = gsap.utils.wrap(-SLOT_COUNT / 2, SLOT_COUNT / 2, slotIndex - posRef.current);
    if (Math.abs(wrapped) > 0.35) {
      e.preventDefault();
      animateToSlot(posRef.current + wrapped);
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
      id="testimonials"
      onKeyDown={handleKeyDown}
      className="mx-auto flex min-h-[min(100svh,760px)] max-w-6xl flex-col justify-center bg-canvas px-4 pb-24 pt-8 sm:px-6 sm:pb-28 sm:pt-10 lg:py-12 lg:pb-28 2xl:max-w-7xl"
    >
      <div className="mx-auto flex w-full max-w-[300px] items-end justify-between sm:mx-0 sm:max-w-none">
        <div>
          <p className="text-[13px] text-aqua">Proof</p>
          <h2 className="mt-2.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl lg:text-5xl 2xl:text-[54px]">
            Selected{" "}
            <span className="font-serif font-normal italic text-ink-muted">work</span>
          </h2>
        </div>

        <p className="hidden text-xs tabular-nums text-ink-faint sm:block">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(TOTAL_PROJECTS).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={stageRef}
        aria-roledescription="carousel"
        aria-label="Selected work horizontal showcase"
        style={{ touchAction: "pan-y" }}
        className="relative mt-4 h-[352px] w-full select-none overflow-hidden sm:mt-6 sm:h-[392px] lg:h-[424px] 2xl:h-[442px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-canvas via-canvas/75 to-transparent sm:w-24 lg:w-36"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-canvas via-canvas/75 to-transparent sm:w-24 lg:w-36"
        />

        {LOOP_SLOTS.map(({ slotIndex, project }) => {
          const isPrimaryCopy = slotIndex < TOTAL_PROJECTS;
          const isCenter = slotIndex % TOTAL_PROJECTS === activeIndex;
          return (
            <a
              key={`${project.number}-${slotIndex}`}
              ref={(el) => {
                cardRefs.current[slotIndex] = el;
              }}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              onClick={(e) => handleCardClick(e, slotIndex)}
              aria-hidden={!isPrimaryCopy ? true : undefined}
              tabIndex={isPrimaryCopy && isCenter ? 0 : -1}
              data-testid={isPrimaryCopy ? `proof-project-${project.number}` : undefined}
              className={`group absolute left-1/2 top-1/2 flex h-[332px] w-[260px] flex-col justify-between rounded-3xl border bg-surface p-3.5 transition-colors duration-200 ease-premium sm:h-[372px] sm:w-[320px] sm:p-4 lg:h-[404px] lg:w-[360px] 2xl:h-[422px] 2xl:w-[390px] ${
                isCenter
                  ? "border-aqua/35 shadow-[0_18px_46px_rgba(0,0,0,0.48),0_0_26px_-8px_rgba(229,107,42,0.22)]"
                  : "border-line/[0.08] hover:border-aqua/30"
              }`}
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line/[0.08] bg-canvas">
                  <Image
                    src={project.preview}
                    alt={`${project.name} hero preview`}
                    fill
                    draggable={false}
                    sizes="(min-width: 1536px) 360px, (min-width: 1024px) 330px, (min-width: 640px) 290px, 232px"
                    className="object-cover object-top transition-transform duration-300 ease-premium group-hover:scale-[1.03]"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-aqua">
                      {project.number}
                    </span>
                    <span className="text-xs text-ink-faint" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate text-xs text-ink-faint">{project.category}</span>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/[0.10] bg-canvas text-ink-faint transition-colors duration-150 ease-premium group-hover:border-aqua/45 group-hover:text-aqua-soft">
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-150 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.025em] text-ink sm:text-xl">
                  {project.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted sm:text-sm">
                  {project.summary}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/[0.07] pt-2.5">
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

      <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5">
        <button
          type="button"
          data-testid="proof-prev"
          onClick={() => stepBy(-1)}
          aria-label="Previous project"
          className="group inline-flex h-10 items-center justify-center rounded-full border border-line/[0.12] bg-surface px-4 text-ink-muted shadow-[0_8px_24px_rgba(0,0,0,0.38)] transition-all duration-150 ease-premium hover:-translate-x-0.5 hover:border-aqua/50 hover:text-aqua-soft hover:shadow-[0_0_20px_-4px_rgba(229,107,42,0.5)]"
        >
          <CurvedFlowArrow direction="prev" className="transition-transform duration-150 group-hover:scale-105" />
        </button>

        <div className="flex items-center gap-2 rounded-full border border-line/[0.08] bg-surface/80 px-3 py-1.5">
          {PROOF_PROJECTS.map((project, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={project.number}
                type="button"
                onClick={() => goToProject(idx)}
                aria-label={`Show ${project.name}`}
                aria-current={isActive ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-300 ease-premium ${
                  isActive
                    ? "w-6 bg-aqua shadow-[0_0_10px_rgba(229,107,42,0.85)]"
                    : "w-2 bg-ink-faint/45 hover:bg-ink-muted"
                }`}
              />
            );
          })}
          <span className="ml-1 text-[11px] font-medium tabular-nums text-ink-muted sm:hidden">
            {String(activeIndex + 1).padStart(2, "0")}/{String(TOTAL_PROJECTS).padStart(2, "0")}
          </span>
        </div>

        <button
          type="button"
          data-testid="proof-next"
          onClick={() => stepBy(1)}
          aria-label="Next project"
          className="group inline-flex h-10 items-center justify-center rounded-full border border-line/[0.12] bg-surface px-4 text-ink-muted shadow-[0_8px_24px_rgba(0,0,0,0.38)] transition-all duration-150 ease-premium hover:translate-x-0.5 hover:border-aqua/50 hover:text-aqua-soft hover:shadow-[0_0_20px_-4px_rgba(229,107,42,0.5)]"
        >
          <CurvedFlowArrow direction="next" className="transition-transform duration-150 group-hover:scale-105" />
        </button>
      </div>
    </section>
  );
}
