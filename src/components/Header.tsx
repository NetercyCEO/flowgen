"use client";

import React from "react";
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

let activeScrollCancel: (() => void) | null = null;

function smoothScrollTo(targetY: number) {
  activeScrollCancel?.();

  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return;

  const htmlEl = document.documentElement;
  htmlEl.style.scrollBehavior = "auto";
  const duration = Math.min(900, Math.max(520, Math.abs(delta) * 0.42));

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

  const cleanup = () => {
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
  };

  activeScrollCancel = cleanup;
  window.addEventListener("wheel", cleanup, { passive: true });
  window.addEventListener("touchstart", cleanup, { passive: true });
  window.addEventListener("keydown", cancelOnKey);

  const step = (now: number) => {
    if (cleaned) return;
    if (startTime === null) startTime = now;
    const progress = Math.min(1, (now - startTime) / duration);
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, Math.round(startY + delta * eased));
    if (progress < 1) {
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
    smoothScrollTo(0);
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
  smoothScrollTo(targetY);
}

const FlowGenWordmark3D = dynamic(
  () => import("./FlowGenWordmark3D").then((m) => m.FlowGenWordmark3D),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex h-7 w-[120px] items-center justify-center font-logo text-[15px] font-normal leading-none tracking-[-0.04em] text-ink sm:h-8 sm:w-[145px] sm:text-[18px] lg:h-10 lg:w-[165px] lg:text-[22px] 2xl:h-12 2xl:w-[185px] 2xl:text-[25px]">
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
  return (
    <header className="pointer-events-none absolute inset-x-0 top-3 z-40 flex h-12 items-center justify-center sm:top-5 sm:h-14 lg:top-6 lg:h-16 2xl:top-7 2xl:h-20">
      <a
        href="/"
        data-intro="brand"
        onClick={(e) => {
          if (window.location.pathname === "/") {
            e.preventDefault();
            scrollToId("/");
          }
        }}
        aria-label="FlowGen home"
        className="pointer-events-auto"
      >
        <FlowGenWordmark3D />
      </a>
    </header>
  );
}
