"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const AnvilForge3D = dynamic(
  () => import("./AnvilForge3D").then((m) => m.AnvilForge3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full sm:h-[340px] md:h-[400px] lg:h-[480px] 2xl:h-[540px]" />
    ),
  }
);

const PROCESS_STEPS = [
  {
    number: "01",
    tag: "48 hours",
    title: "Free 3D preview",
    body: "See a live 3D demo of your offer. Pay $0",
  },
  {
    number: "02",
    tag: "7 days",
    title: "Full site built for you",
    body: "Love it? We build the whole page. Zero effort for you",
  },
  {
    number: "03",
    tag: "Live",
    title: "Turn clicks into calls",
    body: "Launch fast and book more calls from your same traffic",
  },
] as const;

/**
 * Spacious 2-column How It Works section with interactive 3-step copy + unboxed 3D Anvil Forge.
 */
export function ShowcaseSection() {
  const [strikeSignal, setStrikeSignal] = useState(0);

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-canvas py-10 sm:py-16 lg:py-24 2xl:py-28">
      <div className="mx-auto max-w-5xl px-3.5 sm:px-8 lg:px-12 2xl:max-w-6xl">
        <div className="grid grid-cols-[1.05fr_1fr] items-center gap-3 sm:gap-8 md:gap-10 lg:gap-14">
          {/* Left column: heading and 3 interactive steps */}
          <div className="min-w-0 lg:pl-6">
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-aqua sm:text-[12px]">
              How it works
            </p>
            <h2 className="mt-2.5 font-serif text-[26px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:mt-4 sm:text-4xl md:text-[46px] lg:text-[54px] 2xl:text-[64px]">
              We forge your site
              <br />
              <span className="font-normal italic text-ink-muted">in 48 hours</span>
            </h2>

            <ol className="mt-5 divide-y divide-line/[0.07] border-y border-line/[0.07] sm:mt-9">
              {PROCESS_STEPS.map((step) => (
                <li
                  key={step.number}
                  onMouseEnter={() => setStrikeSignal((n) => n + 1)}
                  onClick={() => setStrikeSignal((n) => n + 1)}
                  className="grid cursor-pointer grid-cols-[20px_1fr] gap-1.5 rounded-xl px-1 py-2.5 transition-colors duration-150 hover:bg-line/[0.025] sm:grid-cols-[32px_1fr] sm:gap-2 sm:px-2 sm:py-4 md:grid-cols-[40px_1fr]"
                >
                  <span className="pt-0.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] tabular-nums text-aqua sm:text-[12px]">
                    {step.number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-1 sm:gap-2">
                      <p className="font-serif text-[15px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[20px] lg:text-[22px]">
                        {step.title}
                      </p>
                      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:text-[11px]">
                        {step.tag}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-[11px] font-light leading-[1.55] tracking-[0.01em] text-ink-muted sm:mt-1.5 sm:text-[15px] sm:leading-[1.65]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Right column: unboxed 3D anvil sitting directly on the page */}
          <div className="flex min-w-0 items-center justify-center">
            <AnvilForge3D strikeSignal={strikeSignal} />
          </div>
        </div>
      </div>
    </section>
  );
}
