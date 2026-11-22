"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";

const LINKEDIN_URL = "https://www.linkedin.com/in/rohamdoost/";
const CONTACT_EMAIL = "roham.doost@gmail.com";

const iconBadgeClass =
  "inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.20] ring-1 ring-aqua/45 bg-gradient-to-b from-[#313131] to-[#262626] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-2px_3px_rgba(0,0,0,0.42),0_7px_16px_rgba(0,0,0,0.5),0_0_14px_-3px_rgba(229,107,42,0.38)]";

const emailPillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line/[0.10] bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-aqua/50 hover:text-aqua-soft";

/** Builds Gmail web, Outlook web, and OS mailto compose URLs with a pre-written message. */
function buildEmailLinks() {
  const subject = "Free 3D Website Preview — FlowGen";
  const body = [
    "Hi Roham,",
    "",
    "I'd love to see a free 48-hour 3D preview for our website.",
    "",
    "Website: ",
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
  const copyTimerRef = useRef<number | null>(null);
  const links = useMemo(() => buildEmailLinks(), []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyEmail = async () => {
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
      className="mx-auto max-w-6xl bg-canvas px-4 pb-28 pt-8 sm:px-5 sm:pb-32 sm:pt-10 lg:pb-36 lg:pt-12 2xl:max-w-7xl 2xl:pb-40"
    >
      <div className="mx-auto max-w-xl text-center">
        <p className="text-[13px] text-aqua">Socials</p>
        <h2 className="mt-2.5 text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl 2xl:text-6xl">
          Reach out{" "}
          <span className="font-serif font-normal italic text-ink-muted">directly</span>
        </h2>
        <p className="mt-2.5 text-base leading-relaxed text-ink-muted sm:text-lg">
          Send your website for a free 48-hour 3D preview
        </p>
      </div>

      <div className="mx-auto mt-7 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="socials-linkedin-card"
          className="group flex flex-col justify-between rounded-3xl border border-line/[0.08] bg-surface p-5 transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:border-aqua/40 sm:p-6"
        >
          <div className="flex items-start justify-between">
            <span className={iconBadgeClass}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4.5" y="4.5" width="15" height="15" fill="#FFFFFF" />
                <path
                  fill="#0A66C2"
                  d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
                />
              </svg>
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-ink-faint transition-transform duration-150 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-aqua-soft"
              aria-hidden="true"
            />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-medium tracking-tight text-ink">LinkedIn</h3>
            <p className="mt-1 text-sm text-ink-muted">linkedin.com/in/rohamdoost</p>
          </div>

          <div className="mt-4 border-t border-line/[0.07] pt-4">
            <span className="text-xs font-medium text-aqua-soft">Message on LinkedIn</span>
          </div>
        </a>

        <div
          data-testid="socials-email-card"
          className="flex flex-col justify-between rounded-3xl border border-line/[0.08] bg-surface p-5 sm:p-6"
        >
          <div className="flex items-start justify-between">
            <span className={iconBadgeClass}>
              <GmailIcon size={24} />
            </span>
            <button
              type="button"
              data-testid="socials-copy-email"
              onClick={handleCopyEmail}
              aria-label={copied ? "Email copied" : "Copy email address"}
              className="inline-flex items-center gap-1.5 rounded-full border border-line/[0.10] bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-aqua/50 hover:text-aqua-soft"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-ink/75" aria-hidden="true" />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-medium tracking-tight text-ink">Email</h3>
            <p className="mt-1 break-all text-sm text-ink-muted">{CONTACT_EMAIL}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line/[0.07] pt-4">
            <a
              href={links.gmail}
              target="_blank"
              rel="noopener noreferrer"
              className={emailPillClass}
            >
              <GmailIcon size={14} />
              <span>Gmail</span>
            </a>
            <a
              href={links.outlook}
              target="_blank"
              rel="noopener noreferrer"
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
              <span>Outlook</span>
            </a>
            <a href={links.mailto} className={emailPillClass}>
              <Mail className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
              <span>Mail</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
