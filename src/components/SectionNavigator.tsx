"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { NAV_SECTIONS, scrollToId } from "./Header";

interface SettleTarget {
  key: "hero" | "how-it-works" | "testimonials" | "socials";
  y: number;
  duration: number;
  ease: string;
}

function pickSettleTarget(): SettleTarget | null {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  const firstSection = document.querySelector("main > section");
  const heroHeight = firstSection ? firstSection.getBoundingClientRect().height : vh;

  if (scrollY > 12 && scrollY < heroHeight * 0.35) {
    return { key: "hero", y: 0, duration: 0.65, ease: "back.out(1.15)" };
  }

  const howEl = document.getElementById("how-it-works");
  if (howEl) {
    const rect = howEl.getBoundingClientRect();
    if (rect.top > -rect.height * 0.25 && rect.top < vh * 0.45) {
      const y = Math.min(
        maxScroll,
        Math.max(0, Math.round(rect.top + scrollY - Math.max(16, (vh - rect.height) / 2)))
      );
      return { key: "how-it-works", y, duration: 0.72, ease: "back.out(1.25)" };
    }
  }

  const proofEl = document.getElementById("testimonials");
  if (proofEl) {
    const rect = proofEl.getBoundingClientRect();
    const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
    const ratio = visible / Math.max(1, Math.min(rect.height, vh));
    if (ratio >= 0.65 || (rect.top > -rect.height * 0.25 && rect.top < vh * 0.38)) {
      const y = Math.min(
        maxScroll,
        Math.max(0, Math.round(rect.top + scrollY - Math.max(12, (vh - rect.height) / 2)))
      );
      return { key: "testimonials", y, duration: 0.72, ease: "back.out(1.2)" };
    }
  }

  const socialsEl = document.getElementById("socials");
  if (socialsEl) {
    const rect = socialsEl.getBoundingClientRect();
    if (rect.top < vh * 0.45 && maxScroll - scrollY < rect.height * 0.65) {
      return { key: "socials", y: maxScroll, duration: 0.7, ease: "back.out(1.1)" };
    }
  }

  return null;
}

/**
 * Floating AKQA-style bottom-center section navigator:
 * - Mobile (<640px): single clean capsule showing active number + section ("03 Book a call  ="),
 *   or "Menu" on the top hero screen, expanding a compact floating section list on tap.
 * - Desktop (sm+): horizontal pill bar with zero-dependency CSS gliding highlight and an inline
 *   dot-to-arrow scroll-to-top button once scrolled past the hero.
 */
export function SectionNavigator() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lockUntilRef = useRef<number>(0);
  const unlockTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const settleTweenRef = useRef<gsap.core.Tween | null>(null);
  const isSettlingRef = useRef<boolean>(false);
  const isPointerDownRef = useRef<boolean>(false);
  const lastSettledRef = useRef<{ key: SettleTarget["key"]; at: number } | null>(null);
  const rafRef = useRef<number>(0);
  const activeIdRef = useRef<string | null>(null);
  const updateActiveRef = useRef<() => void>(() => {});

  activeIdRef.current = activeId;

  const cancelSettle = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    isSettlingRef.current = false;
    settleTweenRef.current?.kill();
    settleTweenRef.current = null;
  }, []);

  const syncPill = useCallback((id: string | null) => {
    if (!id) {
      setPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    const btn = btnRefs.current[id];
    if (!btn || btn.offsetWidth === 0) return;
    setPill({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
      ready: true,
    });
  }, []);

  useEffect(() => {
    const updateActive = () => {
      rafRef.current = 0;
      setIsScrolled(window.scrollY > 140);

      if (performance.now() < lockUntilRef.current) return;

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

    const scheduleSettle = () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (
        isSettlingRef.current ||
        isPointerDownRef.current ||
        performance.now() < lockUntilRef.current
      ) {
        return;
      }
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        if (isPointerDownRef.current || performance.now() < lockUntilRef.current) {
          return;
        }
        const candidate = pickSettleTarget();
        if (!candidate) return;
        const delta = Math.abs(candidate.y - window.scrollY);
        if (delta <= 14 || delta > window.innerHeight * 0.65) return;

        const now = performance.now();
        if (
          lastSettledRef.current?.key === candidate.key &&
          now - lastSettledRef.current.at < 1400
        ) {
          return;
        }

        lastSettledRef.current = { key: candidate.key, at: now };
        const proxy = { y: window.scrollY };
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        isSettlingRef.current = true;
        settleTweenRef.current?.kill();
        settleTweenRef.current = gsap.to(proxy, {
          y: candidate.y,
          duration: candidate.duration,
          ease: candidate.ease,
          onUpdate: () => {
            window.scrollTo({
              top: Math.max(0, Math.min(maxScroll, proxy.y)),
              behavior: "instant" as ScrollBehavior,
            });
          },
          onComplete: () => {
            isSettlingRef.current = false;
            settleTweenRef.current = null;
            updateActive();
          },
          onInterrupt: () => {
            isSettlingRef.current = false;
            settleTweenRef.current = null;
          },
        });
      }, 260);
    };

    const onScroll = () => {
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(updateActive);
      }
      if (!isSettlingRef.current) {
        scheduleSettle();
      }
    };

    const cancelLock = () => {
      cancelSettle();
      lockUntilRef.current = 0;
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(updateActive);
      }
    };

    const onPointerDown = () => {
      isPointerDownRef.current = true;
      cancelSettle();
    };

    const onPointerUp = () => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      scheduleSettle();
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

    const onScrollEnd = () => {
      lockUntilRef.current = 0;
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      updateActive();
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("wheel", cancelLock, { passive: true });
    window.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchend", onPointerUp, { passive: true });
    window.addEventListener("touchcancel", onPointerUp, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("keydown", onKeyScrollIntent);
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    return () => {
      cancelSettle();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", cancelLock);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("touchcancel", onPointerUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyScrollIntent);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [cancelSettle]);

  useEffect(() => {
    syncPill(activeId);
  }, [activeId, syncPill]);

  useEffect(() => {
    const navEl = navRef.current;
    const onResize = () => {
      syncPill(activeIdRef.current);
      if (window.innerWidth >= 640) setMobileOpen(false);
    };
    const ro =
      navEl && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncPill(activeIdRef.current))
        : null;
    if (navEl && ro) ro.observe(navEl);
    window.addEventListener("resize", onResize, { passive: true });
    document.fonts?.ready.then(() => syncPill(activeIdRef.current));
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [activeId, syncPill]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const lockAndScroll = (nextActiveId: string | null, targetId: string) => {
    cancelSettle();
    isPointerDownRef.current = false;
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current);
    }
    lockUntilRef.current = performance.now() + 1200;
    setActiveId(nextActiveId);
    setMobileOpen(false);
    scrollToId(targetId);
    unlockTimerRef.current = window.setTimeout(() => {
      unlockTimerRef.current = null;
      lockUntilRef.current = 0;
      updateActiveRef.current();
    }, 1250);
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
              className="animate-fg-fade mb-2.5 rounded-3xl border border-line/[0.12] bg-nav/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-aqua/[0.09] backdrop-blur-xl"
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
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "border-aqua/35 bg-aqua/[0.16] text-aqua-soft"
                        : "border-transparent text-ink-muted hover:bg-line/[0.05] hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`text-xs tabular-nums ${
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
                        style={{ boxShadow: "0 0 10px rgba(229, 107, 42, 0.85)" }}
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
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-transparent px-3.5 py-2.5 text-left text-sm font-medium text-aqua transition-colors duration-150 hover:bg-line/[0.05] hover:text-aqua-soft"
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
            className="flex w-full items-center justify-between rounded-full border border-line/[0.12] bg-nav/90 px-5 py-3.5 shadow-[0_14px_44px_rgba(0,0,0,0.48)] ring-1 ring-inset ring-aqua/[0.1] backdrop-blur-xl transition-colors duration-150 hover:border-aqua/35"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
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
                    style={{ boxShadow: "0 0 10px rgba(229, 107, 42, 0.85)" }}
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
          className="pointer-events-auto relative hidden items-center gap-1 rounded-full border border-line/[0.11] bg-nav/85 p-1.5 shadow-[0_14px_44px_rgba(0,0,0,0.42)] ring-1 ring-inset ring-aqua/[0.09] backdrop-blur-xl sm:flex"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1.5 left-0 rounded-full border border-aqua/35 bg-aqua/[0.16] transition-[transform,width,opacity] duration-[850ms] ease-[cubic-bezier(0.34,1.35,0.64,1)] ${
              pill.ready ? "opacity-100" : "opacity-0"
            }`}
            style={{
              width: `${pill.width}px`,
              transform: `translate3d(${pill.left}px, 0, 0)`,
              boxShadow: "inset 0 1px 0 rgba(247, 173, 128, 0.22)",
            }}
          />

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
              style={{ boxShadow: "0 0 10px rgba(229, 107, 42, 0.85)" }}
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
                className={`relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-500 ease-premium ${
                  isActive && !pill.ready
                    ? "border border-aqua/35 bg-aqua/[0.16] text-aqua-soft"
                    : isActive
                      ? "text-aqua-soft"
                      : "text-ink-muted hover:text-ink"
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
