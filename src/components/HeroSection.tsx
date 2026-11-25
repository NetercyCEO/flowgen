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
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-canvas pb-24 pt-28 sm:pb-24 sm:pt-32 lg:pb-20 lg:pt-36 2xl:pt-44"
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-8 text-center sm:px-14 md:max-w-3xl md:px-20 lg:max-w-4xl">
        <h1 className="max-w-[15ch] text-balance font-hero text-[27px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:max-w-[17ch] sm:text-[35px] md:text-[42px] lg:text-[48px] xl:text-[54px] 2xl:text-[61px]">
          <span data-intro="headline-1" className="block">
            More sales calls from
          </span>
          <span
            data-intro="headline-2"
            className="mt-1 block pb-[0.06em] font-medium italic text-aqua-gradient"
          >
            your same traffic
          </span>
        </h1>

        <div data-intro="cta" className="mt-6 sm:mt-7">
          <button
            type="button"
            onClick={() => scrollToId("socials")}
            className="rounded-full bg-aqua px-7 py-3.5 font-sans text-[12px] font-extrabold uppercase tracking-[0.14em] text-canvas transition-colors duration-150 ease-premium hover:bg-aqua-soft sm:text-[13px]"
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
