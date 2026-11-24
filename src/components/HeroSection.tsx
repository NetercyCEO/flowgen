"use client";

import React from "react";
import dynamic from "next/dynamic";
import { scrollToId } from "./Header";

const FlowConversion3D = dynamic(
  () => import("./FlowConversion3D").then((m) => m.FlowConversion3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-full sm:h-[290px] lg:h-[clamp(270px,38vh,360px)] 2xl:h-[420px]" />
    ),
  }
);

/**
 * Top landing hero framed cleanly above the bottom floating navigator with an unnamed root anchor.
 */
export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-canvas pb-24 pt-24 sm:pb-24 sm:pt-28 lg:pb-24 lg:pt-28 2xl:pt-36"
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-8 text-center sm:px-14 md:max-w-3xl md:px-20 lg:max-w-4xl">
        <h1 className="max-w-[13.5ch] text-balance text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:max-w-[16ch] sm:text-[42px] md:text-5xl lg:text-[56px] xl:text-[64px] 2xl:text-[74px]">
          <span data-intro="headline-1" className="block">
            More sales calls from
          </span>
          <span
            data-intro="headline-2"
            className="mt-0.5 block font-serif font-normal italic tracking-[-0.01em] text-aqua-gradient"
          >
            your same traffic
          </span>
        </h1>

        <div data-intro="cta" className="mt-5">
          <button
            type="button"
            onClick={() => scrollToId("socials")}
            className="rounded-full bg-aqua px-6 py-3 text-[15px] font-semibold text-canvas transition-colors duration-150 ease-premium hover:bg-aqua-soft"
          >
            Get my Digital Brand
          </button>
        </div>
      </div>

      {/* Sculptural hero lead conversion centerpiece */}
      <div data-intro="model" className="relative z-0 mt-2 w-full sm:mt-3">
        <FlowConversion3D />
      </div>
    </section>
  );
}
