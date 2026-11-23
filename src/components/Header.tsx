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

export function scrollToId(id: string) {
  if (id === "/") {
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

const FlowGenWordmark3D = dynamic(
  () => import("./FlowGenWordmark3D").then((m) => m.FlowGenWordmark3D),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex h-7 w-[120px] items-center justify-center text-[15px] font-bold tracking-[-0.035em] text-ink sm:h-8 sm:w-[145px] sm:text-[18px] lg:h-10 lg:w-[165px] lg:text-[22px] 2xl:h-12 2xl:w-[185px] 2xl:text-[25px]">
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
