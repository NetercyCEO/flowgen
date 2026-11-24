"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

export interface NavSection {
  readonly id: string;
  readonly number: string;
  readonly label: string;
  readonly mobileLabel?: string;
}

export const NAV_SECTIONS: readonly NavSection[] = [
  { id: "how-it-works", number: "01", label: "How it works" },
  { id: "testimonials", number: "02", label: "Proof" },
  { id: "socials", number: "03", label: "Contact", mobileLabel: "Contact" },
];

/**
 * Broadcast while a programmatic (nav / CTA / logo) scroll is running, so the section
 * navigator can hold its highlight on the destination instead of flickering through every
 * section the page passes on the way. `detail.id` is the destination ("/" = top).
 */
export const SCROLL_START_EVENT = "fg:scroll-start";
export const SCROLL_END_EVENT = "fg:scroll-end";

let activeScrollCancel: (() => void) | null = null;

function smoothScrollTo(targetY: number, id: string) {
  // A newer scroll replaces the running one silently (no "end" event in between).
  activeScrollCancel?.();

  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) {
    // Already there. If we just replaced a running scroll, tell listeners it is over.
    window.dispatchEvent(new Event(SCROLL_END_EVENT));
    return;
  }

  const htmlEl = document.documentElement;
  htmlEl.style.scrollBehavior = "auto";
  const maxScroll = Math.max(0, htmlEl.scrollHeight - window.innerHeight);
  const duration = Math.min(1650, Math.max(1050, Math.abs(delta) * 0.78));
  const maxOvershootRatio = Math.min(0.028, 24 / Math.max(Math.abs(delta), 1));
  const bounceGain = maxOvershootRatio / 0.0052;

  let rafId = 0;
  let startTime: number | null = null;
  let cleaned = false;

  const cancelOnKey = (e: KeyboardEvent) => {
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "PageUp" ||
      e.key === "PageDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.key === " "
    ) {
      cleanup();
    }
  };

  const finish = (silent: boolean) => {
    if (cleaned) return;
    cleaned = true;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    htmlEl.style.scrollBehavior = "";
    window.removeEventListener("wheel", cleanup);
    window.removeEventListener("touchstart", cleanup);
    window.removeEventListener("keydown", cancelOnKey);
    activeScrollCancel = null;
    if (!silent) window.dispatchEvent(new Event(SCROLL_END_EVENT));
  };
  const cleanup = () => finish(false);

  activeScrollCancel = () => finish(true);
  window.addEventListener("wheel", cleanup, { passive: true });
  window.addEventListener("touchstart", cleanup, { passive: true });
  window.addEventListener("keydown", cancelOnKey);
  window.dispatchEvent(new CustomEvent(SCROLL_START_EVENT, { detail: { id } }));

  const step = (now: number) => {
    if (cleaned) return;
    if (startTime === null) startTime = now;
    const t = Math.min(1, (now - startTime) / duration);
    const smooth = t * t * t * (t * (6 * t - 15) + 10);
    const cushion = bounceGain * Math.pow(t, 5) * Math.pow(1 - t, 2);
    const nextY = Math.max(0, Math.min(maxScroll, startY + delta * (smooth + cushion)));
    window.scrollTo(0, Math.round(nextY));
    if (t < 1) {
      rafId = window.requestAnimationFrame(step);
    } else {
      cleanup();
    }
  };

  rafId = window.requestAnimationFrame(step);
}

export function scrollToId(id: string) {
  if (id === "/") {
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
    smoothScrollTo(0, "/");
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetY =
    id === "socials"
      ? maxScroll
      : Math.min(
          maxScroll,
          Math.max(
            0,
            Math.round(rect.top + window.scrollY - Math.max(8, (window.innerHeight - rect.height) / 2))
          )
        );
  smoothScrollTo(targetY, id);
}

const FlowGenWordmark3D = dynamic(
  () => import("./FlowGenWordmark3D").then((m) => m.FlowGenWordmark3D),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex h-7 w-[120px] items-center justify-center font-hero text-[15px] font-bold leading-none tracking-[-0.025em] text-ink sm:h-8 sm:w-[145px] sm:text-[18px] lg:h-10 lg:w-[165px] lg:text-[22px] 2xl:h-12 2xl:w-[185px] 2xl:text-[25px]">
        FlowGen
      </span>
    ),
  }
);

/**
 * Minimal top mark: centered animated "FlowGen" wordmark linking directly to "/".
 * Section navigation lives in the bottom navigator bar.
 */
export function Header() {
  const [logoSurge, setLogoSurge] = useState(0);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-3 z-40 flex h-12 items-center justify-center sm:top-5 sm:h-14 lg:top-6 lg:h-16 2xl:top-7 2xl:h-20">
      <a
        href="/"
        data-intro="brand"
        onClick={(e) => {
          setLogoSurge((n) => n + 1);
          if (window.location.pathname === "/") {
            e.preventDefault();
            scrollToId("/");
          }
        }}
        aria-label="FlowGen home"
        className="group pointer-events-auto"
      >
        <span className="inline-flex origin-center transition-transform duration-300 ease-premium group-hover:scale-150">
          <FlowGenWordmark3D surgeSignal={logoSurge} />
        </span>
      </a>
    </header>
  );
}
