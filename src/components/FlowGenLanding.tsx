"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { waitForLoaderReveal } from "@/lib/sceneReady";
import { PageLoader } from "./PageLoader";
import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { ShowcaseSection } from "./ShowcaseSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { FlowGenBanner } from "./FlowGenBanner";
import { SocialsSection } from "./SocialsSection";
import { SectionNavigator } from "./SectionNavigator";

/**
 * FlowGen landing: graphite base (#212121), warm ember accent (#e56b2a), 4 minimal sections.
 * PageLoader → Hero → How it works → Proof → FLOWGEN banner → Socials + bottom navigator.
 */
export function FlowGenLanding() {
  const landingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;

      gsap.set('[data-intro="model"]', { opacity: 0, y: 28, scale: 0.96 });
      gsap.set('[data-intro="brand"]', { opacity: 0, y: 20 });
      gsap.set('[data-intro="nav"]', { opacity: 0, y: 28 });
      gsap.set('[data-intro="headline-1"]', { opacity: 0, y: 26 });
      gsap.set('[data-intro="headline-2"]', { opacity: 0, y: 26 });
      gsap.set('[data-intro="cta"]', { opacity: 0, y: 22 });

      waitForLoaderReveal(7500).then(() => {
        if (cancelled) return;

        tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to(
          '[data-intro="model"]',
          { opacity: 1, y: 0, scale: 1, duration: 0.85, clearProps: "opacity,transform" },
          0
        )
          .to(
            '[data-intro="brand"]',
            { opacity: 1, y: 0, duration: 0.65, clearProps: "opacity,transform" },
            0.26
          )
          .to(
            '[data-intro="nav"]',
            { opacity: 1, y: 0, duration: 0.65, clearProps: "opacity,transform" },
            0.42
          )
          .to(
            '[data-intro="headline-1"]',
            { opacity: 1, y: 0, duration: 0.65, clearProps: "opacity,transform" },
            0.58
          )
          .to(
            '[data-intro="headline-2"]',
            { opacity: 1, y: 0, duration: 0.65, clearProps: "opacity,transform" },
            0.72
          )
          .to(
            '[data-intro="cta"]',
            { opacity: 1, y: 0, duration: 0.6, clearProps: "opacity,transform" },
            0.88
          );
      });

      return () => {
        cancelled = true;
        tl?.kill();
      };
    },
    { scope: landingRef }
  );

  return (
    <div ref={landingRef} className="flex min-h-screen flex-col bg-canvas text-ink-muted">
      <PageLoader />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ShowcaseSection />
        <TestimonialsSection />
        <FlowGenBanner />
        <SocialsSection />
      </main>
      <SectionNavigator />
    </div>
  );
}
