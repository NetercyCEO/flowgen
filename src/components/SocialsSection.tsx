"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight, Check, Copy, Mail } from "lucide-react";

const FlowGenFox3D = dynamic(
  () => import("./FlowGenFox3D").then((m) => m.FlowGenFox3D),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-[175px] w-full max-w-[215px] sm:h-[260px] sm:max-w-[340px] md:h-[310px] md:max-w-[390px] lg:h-[350px] lg:max-w-[430px]" />
    ),
  }
);

function FoxSpeechBubble() {
  return (
    <div className="relative mx-auto w-full max-w-[175px] -translate-x-1.5 sm:max-w-[260px] sm:-translate-x-4 md:max-w-[320px] md:-translate-x-6">
      <div className="relative rounded-[18px] border border-aqua/45 bg-surface px-2.5 py-2 text-center shadow-[0_14px_34px_rgba(0,0,0,0.45),0_0_24px_-6px_rgba(229,107,42,0.3)] sm:rounded-[28px] sm:px-5 sm:py-3.5">
        <p className="text-[10px] font-medium leading-snug text-ink sm:text-sm md:text-[15px]">
          <span className="block">I&apos;m waiting for your message</span>
          <span className="mt-0.5 inline-flex items-center justify-center gap-1 sm:gap-1.5">
            <span>
              <span className="text-aqua-soft">Email</span> or{" "}
              <span className="text-aqua-soft">LinkedIn</span> here
            </span>
            <ArrowRight
              className="animate-fg-arrow-right inline-block h-3 w-3 shrink-0 text-aqua drop-shadow-[0_0_8px_rgba(229,107,42,0.8)] sm:h-4 sm:w-4"
              aria-hidden="true"
            />
          </span>
        </p>

        <svg
          width="46"
          height="18"
          viewBox="0 0 46 18"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[18px] left-[64%] z-10 -translate-x-1/2 md:left-[68%]"
        >
          <path
            d="M 12 0 L 34 0 C 30 5 30 11 34 17 C 26 12 20 5 12 0 Z"
            fill="#2a2a2a"
          />
          <path
            d="M 12 0.5 C 20 5.5 26 12 34 17 C 30 11 30 5.5 34 0.5"
            fill="none"
            stroke="rgba(229, 107, 42, 0.45)"
            strokeWidth="1"
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

const LINKEDIN_URL = "https://www.linkedin.com/in/rohamdoost/";
const CONTACT_EMAIL = "roham@flowgen-studio.com";

const iconBadgeClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.20] ring-1 ring-aqua/45 bg-gradient-to-b from-[#313131] to-[#262626] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-2px_3px_rgba(0,0,0,0.42),0_7px_16px_rgba(0,0,0,0.5),0_0_14px_-3px_rgba(229,107,42,0.38)] sm:h-12 sm:w-12";

const emailPillBaseClass =
  "h-8 w-8 items-center justify-center whitespace-nowrap rounded-full border border-line/[0.10] bg-canvas p-0 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-aqua/50 hover:text-aqua-soft md:h-auto md:w-auto md:gap-1.5 md:px-2.5 md:py-1.5";

const emailPillClass = `inline-flex ${emailPillBaseClass}`;

/** Builds Gmail web, Outlook web, and OS mailto compose URLs with a pre-written message. */
function buildEmailLinks() {
  const subject = "Premium Digital Brand — 48-Hour 3D Preview | FlowGen";
  const body = [
    "Hi Roham,",
    "",
    "I'd like to create our premium digital brand with FlowGen and get our free 48-hour 3D preview so we can turn more of our traffic into booked sales calls.",
    "",
    "Website: ",
    "What we offer: ",
    "",
    "Best,",
  ].join("\n");

  const encTo = encodeURIComponent(CONTACT_EMAIL);
  const encSub = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);

  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSub}&body=${encBody}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${encTo}&subject=${encSub}&body=${encBody}`,
    mailto: `mailto:${CONTACT_EMAIL}?subject=${encSub}&body=${encBody}`,
  };
}

function GmailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M6.5 19.25V12.5L2 9.125V18.25C2 18.8 2.45 19.25 3 19.25H6.5Z" />
      <path fill="#34A853" d="M17.5 19.25H21C21.55 19.25 22 18.8 22 18.25V9.125L17.5 12.5V19.25Z" />
      <path fill="#EA4335" d="M6.5 12.5V7.45L12 11.575L17.5 7.45V12.5L12 16.625L6.5 12.5Z" />
      <path fill="#FBBC05" d="M17.5 7.45V12.5L22 9.125V6.75C22 5.46 21.15 4.71 20.1 5.5L17.5 7.45Z" />
      <path fill="#C5221F" d="M6.5 7.45V12.5L2 9.125V6.75C2 5.46 2.85 4.71 3.9 5.5L6.5 7.45Z" />
    </svg>
  );
}

/**
 * Direct socials and contact section for reaching out via LinkedIn or Email.
 */
export function SocialsSection() {
  const [copied, setCopied] = useState(false);
  const [happySignal, setHappySignal] = useState(0);
  const copyTimerRef = useRef<number | null>(null);
  const links = useMemo(() => buildEmailLinks(), []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const triggerHappy = () => setHappySignal((n) => n + 1);

  const handleCopyEmail = async () => {
    triggerHappy();
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <section
      id="socials"
      className="mx-auto max-w-6xl bg-canvas px-4 pb-24 pt-8 sm:px-5 sm:pb-20 sm:pt-10 md:pb-14 lg:pt-12 2xl:max-w-7xl 2xl:pb-16"
    >
      <div className="mx-auto max-w-xl text-center">
        <p className="text-[13px] text-aqua">Socials</p>
        <h2 className="mt-2.5 text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl 2xl:text-6xl">
          Reach out{" "}
          <span className="font-serif font-normal italic text-ink-muted">directly</span>
        </h2>
        <p className="mt-2.5 text-base leading-relaxed text-ink-muted sm:text-lg">
          Send your website to get your premium digital brand preview in 48 hours
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-[1.2fr_0.8fr] items-center gap-3 sm:mt-10 sm:gap-6 md:grid-cols-[1fr_auto] lg:gap-10">
        <div className="flex min-w-0 flex-col items-center">
          <FoxSpeechBubble />
          <div className="mt-1 w-full">
            <FlowGenFox3D happySignal={happySignal} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[144px] min-w-0 flex-col gap-2.5 sm:max-w-[168px] sm:gap-3 md:mx-0 md:w-[250px] md:max-w-none md:gap-3.5 lg:w-[260px]">
          <div
            data-testid="socials-email-card"
            className="flex flex-col items-center justify-between rounded-2xl border border-line/[0.08] bg-surface p-3 text-center md:items-stretch md:rounded-3xl md:p-4 md:text-left"
          >
            <div className="flex w-full flex-col items-center gap-2 md:flex-row md:items-start md:justify-between">
              <a
                href={links.gmail}
                target="_blank"
                rel="noopener noreferrer"
                onClick={triggerHappy}
                aria-label="Compose in Gmail"
                className={`${iconBadgeClass} transition-transform duration-150 ease-premium hover:scale-105`}
              >
                <GmailIcon size={22} />
              </a>
              <button
                type="button"
                data-testid="socials-copy-email"
                onClick={handleCopyEmail}
                aria-label={copied ? "Email copied" : "Copy email address"}
                className="hidden items-center justify-center gap-1.5 rounded-full border border-line/[0.10] bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-aqua/50 hover:text-aqua-soft md:inline-flex"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-ink/75" aria-hidden="true" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-3 hidden md:block">
              <p className="break-all text-sm font-medium text-aqua-soft">{CONTACT_EMAIL}</p>
            </div>

            <div className="mt-2.5 flex w-full flex-nowrap items-center justify-center gap-1.5 border-t border-line/[0.07] pt-2.5 md:mt-4 md:flex-wrap md:justify-start md:pt-4">
              <button
                type="button"
                onClick={handleCopyEmail}
                aria-label={copied ? "Email copied" : "Copy email address"}
                className={`inline-flex md:hidden ${emailPillBaseClass}`}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-ink/80" aria-hidden="true" />
                )}
              </button>
              <a
                href={links.outlook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={triggerHappy}
                aria-label="Compose in Outlook"
                className={emailPillClass}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#0078D4" />
                  <path
                    d="M2 6.5L12 13L22 6.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden md:inline">Outlook</span>
              </a>
              <a
                href={links.mailto}
                onClick={triggerHappy}
                aria-label="Open default mail app"
                className={emailPillClass}
              >
                <Mail className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
                <span className="hidden md:inline">Mail</span>
              </a>
            </div>
          </div>

          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="socials-linkedin-card"
            aria-label="Message on LinkedIn"
            onClick={triggerHappy}
            className="group flex flex-col items-center justify-between rounded-2xl border border-line/[0.08] bg-surface p-3 text-center transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:border-aqua/40 md:items-stretch md:rounded-3xl md:p-4 md:text-left"
          >
            <div className="flex w-full items-center justify-center md:items-start md:justify-between">
              <span className={iconBadgeClass}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4.5" y="4.5" width="15" height="15" fill="#FFFFFF" />
                  <path
                    fill="#0A66C2"
                    d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
                  />
                </svg>
              </span>
              <ArrowUpRight
                className="hidden h-4 w-4 text-ink-faint transition-transform duration-150 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-aqua-soft md:block"
                aria-hidden="true"
              />
            </div>

            <div className="mt-3 hidden md:block">
              <p className="text-sm font-medium text-aqua-soft">linkedin.com/in/rohamdoost</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
