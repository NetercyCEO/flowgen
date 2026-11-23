"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
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
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".hero-stagger",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "opacity,transform",
        }
      );
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-canvas pb-24 pt-24 sm:pb-24 sm:pt-28 lg:pb-24 lg:pt-28 2xl:pt-36"
    >
      {/* Ultra-subtle top ambient warmth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-12%] h-[360px] w-[640px] -translate-x-1/2 rounded-full opacity-[0.025] blur-[130px]"
        style={{ background: "radial-gradient(closest-side, #e56b2a, transparent)" }}
      />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-8 text-center sm:px-14 md:max-w-3xl md:px-20 lg:max-w-4xl">
        <h1 className="hero-stagger max-w-[13.5ch] text-balance text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:max-w-[16ch] sm:text-[42px] md:text-5xl lg:text-[56px] xl:text-[64px] 2xl:text-[74px]">
          More sales calls from{" "}
          <span className="mt-0.5 block font-serif font-normal italic tracking-[-0.01em] text-aqua-gradient">
            your same traffic
          </span>
        </h1>

        <div className="hero-stagger mt-5">
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
      <div className="hero-stagger relative z-0 mt-2 w-full sm:mt-3">
        <FlowConversion3D />
      </div>
    </section>
  );
}
