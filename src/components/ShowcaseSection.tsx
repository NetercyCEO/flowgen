"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { triggerAnvilFeedback } from "@/lib/feedback";

const AnvilForge3D = dynamic(
  () => import("./AnvilForge3D").then((m) => m.AnvilForge3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full sm:h-[340px] md:h-[400px] lg:h-[480px] 2xl:h-[540px]" />
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
      <div className="mx-auto max-w-5xl px-7 sm:px-8 lg:px-12 2xl:max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1.05fr_1fr] sm:gap-8 md:gap-10 lg:gap-14">
          {/* Left column: heading and 3 interactive steps */}
          <div className="min-w-0 lg:pl-6">
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-aqua sm:text-[12px]">
              How it works
            </p>
            <h2 className="mt-2.5 font-hero text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:mt-4 sm:text-3xl md:text-4xl lg:text-[46px] 2xl:text-[56px]">
              We forge your site
              <br />
              <span className="font-normal italic text-ink-muted">in 48 hours</span>
            </h2>

            <ol className="mt-5 divide-y divide-line/[0.07] border-y border-line/[0.07] sm:mt-9">
              {PROCESS_STEPS.map((step) => (
                <li
                  key={step.number}
                  onMouseEnter={() => setStrikeSignal((n) => n + 1)}
                  onClick={() => {
                    triggerAnvilFeedback();
                    setStrikeSignal((n) => n + 1);
                  }}
                  className="grid cursor-pointer grid-cols-[28px_1fr] gap-2 rounded-xl px-1 py-3.5 transition-colors duration-150 hover:bg-line/[0.025] sm:grid-cols-[32px_1fr] sm:px-2 sm:py-4 md:grid-cols-[40px_1fr]"
                >
                  <span className="pt-0.5 font-hero text-[11px] font-medium uppercase tracking-[0.12em] tabular-nums text-aqua sm:text-[12px]">
                    {step.number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-1 sm:gap-2">
                      <p className="font-hero text-[16px] font-medium leading-[1.2] tracking-[-0.01em] text-ink sm:text-[17px] lg:text-[19px]">
                        {step.title}
                      </p>
                      <span className="font-hero text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint sm:text-[11px]">
                        {step.tag}
                      </span>
                    </div>
                    <p className="mt-1 font-hero text-[13.5px] font-light leading-[1.55] tracking-[0.01em] text-ink-muted sm:mt-1.5 sm:text-[14px] sm:leading-[1.6]">
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
