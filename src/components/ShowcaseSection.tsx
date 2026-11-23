"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const AnvilForge3D = dynamic(
  () => import("./AnvilForge3D").then((m) => m.AnvilForge3D),
  {
    ssr: false,
    loading: () => <div className="h-[360px] w-full sm:h-[420px] lg:h-[480px]" />,
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
    <section id="how-it-works" className="relative overflow-hidden bg-canvas py-12 sm:py-16 lg:py-24 2xl:py-28">
      <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 2xl:max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* Left column: heading and 3 interactive steps */}
          <div className="lg:pl-6">
            <p className="text-[13px] text-aqua">How it works</p>
            <h2 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl lg:text-5xl 2xl:text-6xl">
              We forge your site
              <br />
              <span className="font-serif font-normal italic text-ink-muted">in 48 hours</span>
            </h2>

            <ol className="mt-8 divide-y divide-line/[0.07] border-y border-line/[0.07]">
              {PROCESS_STEPS.map((step) => (
                <li
                  key={step.number}
                  onMouseEnter={() => setStrikeSignal((n) => n + 1)}
                  onClick={() => setStrikeSignal((n) => n + 1)}
                  className="grid cursor-pointer grid-cols-[32px_1fr] gap-2 rounded-xl px-2 py-4 transition-colors duration-150 hover:bg-line/[0.025] sm:grid-cols-[40px_1fr]"
                >
                  <span className="pt-0.5 text-[13px] tabular-nums text-aqua">{step.number}</span>
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-base font-medium text-ink sm:text-lg">{step.title}</p>
                      <span className="text-[12px] text-ink-faint">{step.tag}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Right column: unboxed 3D anvil sitting directly on the page */}
          <div className="flex items-center justify-center">
            <AnvilForge3D strikeSignal={strikeSignal} />
          </div>
        </div>
      </div>
    </section>
  );
}
