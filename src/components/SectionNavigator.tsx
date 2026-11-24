"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NAV_SECTIONS, SCROLL_END_EVENT, SCROLL_START_EVENT, scrollToId } from "./Header";

/**
 * Floating AKQA-style bottom-center section navigator:
 * - Mobile (<640px): single clean capsule showing active number + section ("03 Book a call  ="),
 *   or "Menu" on the top hero screen, expanding a compact floating section list on tap.
 * - Desktop (sm+): horizontal pill bar with a compositor-only gliding highlight (transform
 *   transitions only: no layout work, no main-thread dependence) and an inline dot-to-arrow
 *   scroll-to-top button once scrolled past the hero.
 */

/** One shared timing for the highlight glide and the label colour change so they land together. */
const PILL_MS = 560;
const PILL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

interface PillState {
  left: number;
  width: number;
  height: number;
  /** Highlight is shown (fades in/out in place, never slides in from elsewhere). */
  visible: boolean;
  /** Transform transitions on. Off while snapping to a new geometry (first show, resize). */
  animate: boolean;
}
export function SectionNavigator() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pill, setPill] = useState<PillState>({
    left: 0,
    width: 0,
    height: 0,
    visible: false,
    animate: false,
  });
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  /** True while a nav / CTA / logo scroll is running; position-based highlight updates wait. */
  const programmaticScrollRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);
  const pillRef = useRef<PillState>(pill);
  const pillVisibleRef = useRef(false);
  const settleRafRef = useRef(0);
  const rafRef = useRef<number>(0);
  const activeIdRef = useRef<string | null>(null);
  const updateActiveRef = useRef<() => void>(() => {});

  activeIdRef.current = activeId;
  pillRef.current = pill;

  const syncPill = useCallback((id: string | null, instant = false) => {
    if (!id) {
      window.cancelAnimationFrame(settleRafRef.current);
      pillVisibleRef.current = false;
      setPill((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const btn = btnRefs.current[id];
    if (!btn || btn.offsetWidth === 0) return;

    const next = { left: btn.offsetLeft, width: btn.offsetWidth, height: btn.offsetHeight };
    const cur = pillRef.current;
    const wasVisible = pillVisibleRef.current;
    const unchanged =
      cur.left === next.left && cur.width === next.width && cur.height === next.height;
    // Nothing to do (also keeps ResizeObserver's initial callback from cutting a glide short).
    if (unchanged && wasVisible) return;

    // First show after being hidden, or a real layout change (resize / font load): jump there
    // with transitions off, then re-enable them. Everything else glides.
    const snap = instant || !wasVisible;
    setPill({ ...next, visible: wasVisible, animate: !snap });
    if (snap) {
      window.cancelAnimationFrame(settleRafRef.current);
      settleRafRef.current = window.requestAnimationFrame(() => {
        settleRafRef.current = window.requestAnimationFrame(() => {
          pillVisibleRef.current = true;
          setPill((prev) => ({ ...prev, visible: true, animate: true }));
        });
      });
    }
  }, []);

  useEffect(() => {
    const updateActive = () => {
      rafRef.current = 0;
      setIsScrolled(window.scrollY > 140);

      if (programmaticScrollRef.current) return;

      if (window.scrollY <= 20) {
        setActiveId(null);
        return;
      }

      const atBottom =
        window.scrollY > 40 &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 40;
      if (atBottom) {
        setActiveId("socials");
        return;
      }

      const threshold = window.innerHeight * 0.42;
      let current: string | null = null;
      for (const section of NAV_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          current = section.id;
        }
      }
      setActiveId(current);
    };

    updateActiveRef.current = updateActive;

    const onScroll = () => {
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(updateActive);
      }
    };

    const releaseScrollHold = () => {
      programmaticScrollRef.current = false;
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
    };

    // User took over (wheel / touch / keys): stop holding the destination, follow the page.
    const cancelLock = () => {
      releaseScrollHold();
      onScroll();
    };

    // Programmatic scroll finished (or was replaced/interrupted): resume position tracking.
    const onProgrammaticEnd = () => {
      releaseScrollHold();
      updateActive();
    };

    // Programmatic scroll started: show the destination immediately and hold it for the whole
    // scroll, so the highlight glides once instead of chasing every section passed on the way.
    const onProgrammaticStart = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      programmaticScrollRef.current = true;
      if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = window.setTimeout(onProgrammaticEnd, 3000); // safety net
      if (id === "/") setActiveId(null);
      else if (id && NAV_SECTIONS.some((section) => section.id === id)) setActiveId(id);
    };

    const onKeyScrollIntent = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "PageUp" ||
        e.key === "PageDown" ||
        e.key === "Home" ||
        e.key === "End" ||
        e.key === " "
      ) {
        cancelLock();
      }
    };

    // Native scrollend can fire mid-animation if a frame hitches; it must never release the hold.
    const onScrollEnd = () => updateActive();

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("wheel", cancelLock, { passive: true });
    window.addEventListener("touchstart", cancelLock, { passive: true });
    window.addEventListener("keydown", onKeyScrollIntent);
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    window.addEventListener(SCROLL_START_EVENT, onProgrammaticStart);
    window.addEventListener(SCROLL_END_EVENT, onProgrammaticEnd);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", cancelLock);
      window.removeEventListener("touchstart", cancelLock);
      window.removeEventListener("keydown", onKeyScrollIntent);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener(SCROLL_START_EVENT, onProgrammaticStart);
      window.removeEventListener(SCROLL_END_EVENT, onProgrammaticEnd);
    };
  }, []);

  useEffect(() => {
    syncPill(activeId);
  }, [activeId, syncPill]);

  useEffect(() => {
    const navEl = navRef.current;
    const onResize = () => {
      syncPill(activeIdRef.current, true);
      if (window.innerWidth >= 640) setMobileOpen(false);
    };
    const ro =
      navEl && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncPill(activeIdRef.current, true))
        : null;
    if (navEl && ro) ro.observe(navEl);
    window.addEventListener("resize", onResize, { passive: true });
    document.fonts?.ready.then(() => syncPill(activeIdRef.current, true));
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(settleRafRef.current);
    };
  }, [syncPill]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const lockAndScroll = (nextActiveId: string | null, targetId: string) => {
    // The scroll itself holds the highlight (see SCROLL_START_EVENT); this just makes the
    // choice show instantly, including when the page is already at the destination.
    setActiveId(nextActiveId);
    setMobileOpen(false);
    scrollToId(targetId);
  };

  const handleSelect = (id: string) => lockAndScroll(id, id);
  const handleScrollTop = () => lockAndScroll(null, "/");

  const activeSection = activeId
    ? (NAV_SECTIONS.find((s) => s.id === activeId) ?? null)
    : null;

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 sm:hidden"
        />
      )}

      <div className="pointer-events-none fixed bottom-[max(24px,calc(env(safe-area-inset-bottom)+14px))] left-1/2 z-50 -translate-x-1/2 sm:bottom-9">
        <div data-intro="nav">
          {/* Mobile (<640px): single-bar AKQA capsule with expandable drawer */}
          <div className="pointer-events-auto relative w-[min(340px,calc(100vw-32px))] sm:hidden">
          {mobileOpen && (
            <div
              id="mobile-section-menu"
              role="menu"
              aria-label="Sections"
              className="animate-fg-fade mb-2.5 rounded-3xl border border-line/[0.08] bg-nav/95 p-2 backdrop-blur-xl"
            >
              {NAV_SECTIONS.map((section) => {
                const isActive = activeId === section.id;
                const displayTitle = section.mobileLabel ?? section.label;
                return (
                  <button
                    key={section.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(section.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-150 ${
                      isActive
                        ? "border-transparent bg-aqua/[0.14] text-aqua-soft"
                        : "border-transparent text-ink-muted hover:bg-line/[0.05] hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`text-[11px] tabular-nums ${
                          isActive ? "text-aqua" : "text-ink-faint"
                        }`}
                      >
                        {section.number}
                      </span>
                      <span>{displayTitle}</span>
                    </span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-aqua"
                      />
                    )}
                  </button>
                );
              })}

              {isScrolled && (
                <div className="mt-1.5 border-t border-line/[0.08] pt-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleScrollTop}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-transparent px-3.5 py-2.5 text-left font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-aqua transition-colors duration-150 hover:bg-line/[0.05] hover:text-aqua-soft"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        d="M8 12.5V3.5M8 3.5L4 7.5M8 3.5L12 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Back to top</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            data-testid="mobile-nav-toggle"
            aria-expanded={mobileOpen}
            aria-controls="mobile-section-menu"
            aria-label={mobileOpen ? "Close section menu" : "Open section menu"}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-full border border-line/[0.08] bg-nav/90 px-5 py-3.5 backdrop-blur-xl transition-colors duration-150 hover:border-line/[0.14]"
          >
            <span className="flex items-center gap-3 font-sans text-[11px] font-medium uppercase tracking-[0.14em]">
              {activeSection ? (
                <>
                  <span className="tabular-nums text-aqua">{activeSection.number}</span>
                  <span className="text-ink">
                    {activeSection.mobileLabel ?? activeSection.label}
                  </span>
                </>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-aqua"
                  />
                  <span className="text-ink">Menu</span>
                </>
              )}
            </span>

            <span className="flex flex-col items-end justify-center gap-[5px]" aria-hidden="true">
              <span
                className={`block h-[1.5px] w-4 rounded-full bg-ink transition-transform duration-200 ease-premium ${
                  mobileOpen ? "translate-y-[3.25px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-4 rounded-full bg-ink transition-transform duration-200 ease-premium ${
                  mobileOpen ? "-translate-y-[3.25px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        {/* Desktop (sm+): horizontal floating pill bar */}
        <nav
          ref={navRef}
          aria-label="Section navigator"
          className="pointer-events-auto relative hidden items-center gap-1 rounded-full border border-line/[0.08] bg-nav/90 p-1.5 backdrop-blur-xl sm:flex"
        >
          {/*
            Gliding highlight, built from three transform-only pieces (left cap, stretchy body,
            right cap) so it never animates width/layout: the compositor does all the work, and
            the rounded ends never get squashed. Solid fill + 1px overlap = no seams.
          */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1.5 left-0 right-0"
            style={{ opacity: pill.visible ? 1 : 0, transition: "opacity 240ms ease-out" }}
          >
            {(() => {
              const cap = pill.height / 2;
              const glide = pill.animate ? `transform ${PILL_MS}ms ${PILL_EASE}` : "none";
              const base = {
                transition: glide,
                willChange: "transform" as const,
                backfaceVisibility: "hidden" as const,
              };
              return (
                <>
                  <span
                    className="nav-pill-fill absolute left-0 top-0 h-full"
                    style={{
                      ...base,
                      width: cap,
                      borderRadius: `${cap}px 0 0 ${cap}px`,
                      transform: `translate3d(${pill.left}px, 0, 0)`,
                    }}
                  />
                  <span
                    className="nav-pill-fill absolute left-0 top-0 h-full"
                    style={{
                      ...base,
                      width: 1,
                      transformOrigin: "0 50%",
                      transform: `translate3d(${pill.left + cap - 1}px, 0, 0) scaleX(${Math.max(
                        0,
                        pill.width - pill.height + 2
                      )})`,
                    }}
                  />
                  <span
                    className="nav-pill-fill absolute left-0 top-0 h-full"
                    style={{
                      ...base,
                      width: cap,
                      borderRadius: `0 ${cap}px ${cap}px 0`,
                      transform: `translate3d(${pill.left + pill.width - cap}px, 0, 0)`,
                    }}
                  />
                </>
              );
            })()}
          </span>

          <button
            type="button"
            data-testid="nav-scroll-top"
            aria-label="Scroll to top"
            title="Back to top"
            disabled={!isScrolled}
            onClick={handleScrollTop}
            className={`relative z-10 ml-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 ${
              isScrolled
                ? "cursor-pointer text-aqua hover:bg-aqua/[0.16] hover:text-aqua-soft"
                : "cursor-default"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full bg-aqua transition-[opacity,transform] duration-200 ease-premium ${
                isScrolled ? "scale-50 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className={`absolute h-3.5 w-3.5 transition-[opacity,transform] duration-200 ease-premium ${
                isScrolled
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-1 scale-75 opacity-0"
              }`}
            >
              <path
                d="M8 12.5V3.5M8 3.5L4 7.5M8 3.5L12 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line/[0.08]" />

          {NAV_SECTIONS.map((section) => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                ref={(el) => {
                  btnRefs.current[section.id] = el;
                }}
                type="button"
                onClick={() => handleSelect(section.id)}
                aria-current={isActive ? "location" : undefined}
                className={`relative z-10 whitespace-nowrap rounded-full px-3.5 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-[560ms] ease-premium sm:text-[12px] lg:px-4 ${
                  isActive ? "text-aqua-soft" : "text-ink-muted hover:text-ink"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
        </div>
      </div>
    </>
  );
}
