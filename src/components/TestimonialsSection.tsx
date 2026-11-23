"use client";

import React from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import gadgetCentrePreview from "../../public/previews/gadget-centre.png";
import wijsdomPodcastPreview from "../../public/previews/wijsdom-podcast.png";
import captainAutohandelPreview from "../../public/previews/captain-autohandel.png";
import cardboardWebshopPreview from "../../public/previews/cardboard-webshop.png";

const PROOF_PROJECTS = [
  {
    number: "01",
    name: "Gadget Centre",
    category: "E-commerce",
    url: "https://gadgetcentres.co.uk/",
    domain: "gadgetcentres.co.uk",
    summary: "High-converting storefront built for speed and effortless product discovery",
    preview: gadgetCentrePreview,
  },
  {
    number: "02",
    name: "Wijsdom Podcast",
    category: "Media & Podcast",
    url: "https://www.wijsdompodcast.nl/",
    domain: "wijsdompodcast.nl",
    summary: "Editorial podcast hub designed for clean episode browsing and listener growth",
    preview: wijsdomPodcastPreview,
  },
  {
    number: "03",
    name: "Captain Autohandel",
    category: "WebGPU · 3D Auto",
    url: "https://captain-autohandel-webgpu.vercel.app/",
    domain: "captain-autohandel-webgpu.vercel.app",
    summary: "Interactive WebGPU 3D automotive showcase built to drive showroom inquiries",
    preview: captainAutohandelPreview,
  },
  {
    number: "04",
    name: "Cardboard Webshop",
    category: "Interactive 3D · Webshop",
    url: "https://3dlandignpage.vercel.app/",
    domain: "3dlandignpage.vercel.app",
    summary: "Interactive 3D webshop experience where buyers explore products in the browser",
    preview: cardboardWebshopPreview,
  },
] as const;

/**
 * Proof section: 2x2 showcase of shipped client and interactive 3D web projects.
 */
export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="mx-auto max-w-4xl bg-canvas px-4 py-14 sm:px-6 lg:py-20 2xl:max-w-5xl 2xl:py-28"
    >
      <div className="mx-auto max-w-[300px] sm:mx-0 sm:max-w-2xl">
        <p className="text-[13px] text-aqua">Proof</p>
        <h2 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl lg:text-5xl 2xl:text-6xl">
          Selected{" "}
          <span className="font-serif font-normal italic text-ink-muted">work</span>
        </h2>
      </div>

      <div className="mx-auto mt-8 grid max-w-[300px] grid-cols-1 gap-5 sm:mt-12 sm:max-w-none sm:grid-cols-2">
        {PROOF_PROJECTS.map((project) => (
          <a
            key={project.url}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`proof-project-${project.number}`}
            className="group flex flex-col justify-between rounded-3xl border border-line/[0.08] bg-surface p-4 transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:border-aqua/40 sm:p-6"
          >
            <div>
              <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-line/[0.08] bg-canvas sm:aspect-[4/3]">
                <Image
                  src={project.preview}
                  alt={`${project.name} hero preview`}
                  fill
                  sizes="(min-width: 1024px) 440px, (min-width: 640px) 46vw, 270px"
                  className="object-cover object-top transition-transform duration-300 ease-premium group-hover:scale-[1.03]"
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-aqua">
                    {project.number}
                  </span>
                  <span className="text-xs text-ink-faint" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-ink-faint">{project.category}</span>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/[0.10] bg-canvas text-ink-faint transition-colors duration-150 ease-premium group-hover:border-aqua/45 group-hover:text-aqua-soft">
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-150 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
                {project.name}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                {project.summary}
              </p>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-line/[0.07] pt-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-aqua"
                  style={{ boxShadow: "0 0 8px rgba(229, 107, 42, 0.75)" }}
                />
                <span className="truncate text-xs text-ink-faint">{project.domain}</span>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-aqua-soft">
                Visit live site
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
