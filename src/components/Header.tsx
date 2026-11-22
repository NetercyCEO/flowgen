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
  { id: "socials", number: "03", label: "Socials", mobileLabel: "Socials" },
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
      <span className="inline-flex h-14 w-[240px] items-center justify-center text-[30px] font-bold tracking-[-0.035em] text-ink sm:h-16 sm:w-[290px] sm:text-[36px] lg:h-20 lg:w-[330px] lg:text-[44px] 2xl:h-24 2xl:w-[370px] 2xl:text-[50px]">
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
    <header className="pointer-events-none absolute inset-x-0 top-3 z-40 flex h-16 items-center justify-center sm:top-5 sm:h-20 lg:top-6 lg:h-24 2xl:top-7 2xl:h-28">
      <a
        href="/"
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
