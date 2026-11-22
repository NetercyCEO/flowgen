"use client";

import React from "react";
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
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-muted">
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
