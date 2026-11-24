"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Copy, Mail } from "lucide-react";

const FlowGenFox3D = dynamic(
  () => import("./FlowGenFox3D").then((m) => m.FlowGenFox3D),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-[175px] w-full max-w-[215px] sm:h-[260px] sm:max-w-[340px] md:h-[310px] md:max-w-[390px] lg:h-[350px] lg:max-w-[430px]" />
    ),
  }
);

function ContactFlowArrow() {
  return (
    <svg
      viewBox="0 0 68 30"
      aria-hidden="true"
      data-testid="contact-flow-arrow"
      className="animate-fg-arrow-right inline-block h-3 w-[22px] shrink-0 overflow-visible text-aqua sm:h-4 sm:w-[30px] md:h-[18px] md:w-[34px]"
    >
      <path
        fill="currentColor"
        d="M 4 26 C 17 16 31 14.5 49 15.5 L 49 22.5 L 64 12.5 L 49 2.5 L 49 9.5 C 29 9 15 12 4 26 Z"
      />
    </svg>
  );
}

function FoxSpeechBubble() {
  return (
    <div className="relative mx-auto w-full max-w-[186px] -translate-x-1.5 sm:max-w-[278px] sm:-translate-x-4 md:max-w-[344px] md:-translate-x-6">
      <div className="relative rounded-[18px] border border-line/[0.08] bg-surface px-2.5 py-2 text-center sm:rounded-[28px] sm:px-5 sm:py-3.5">
        <p className="text-[10px] font-medium leading-snug text-ink sm:text-sm md:text-[15px]">
          <span className="block">I&apos;m waiting for your message</span>
          <span className="mt-0.5 inline-flex items-center justify-center gap-1 sm:gap-1.5">
            <span>
              <span className="text-aqua-soft">WhatsApp</span>,{" "}
              <span className="text-aqua-soft">Email</span> or{" "}
              <span className="text-aqua-soft">LinkedIn</span>
            </span>
            <ContactFlowArrow />
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
            stroke="rgba(255, 255, 255, 0.08)"
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
const WHATSAPP_DISPLAY = "+31 6 16558573";
const WHATSAPP_URL = `https://wa.me/31616558573?text=${encodeURIComponent(
  "Hi Roham, I'd like to get a free 48-hour 3D digital brand preview from FlowGen."
)}`;

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.03 2C6.51 2 2.04 6.47 2.04 11.99c0 1.76.46 3.48 1.33 4.99L2 22l5.15-1.35a9.95 9.95 0 0 0 4.88 1.24h.01c5.52 0 9.99-4.47 9.99-9.99A9.97 9.97 0 0 0 12.03 2Z"
      />
      <path
        fill="#FFFFFF"
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"
      />
    </svg>
  );
}

const iconBadgeClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line/[0.08] bg-canvas sm:h-12 sm:w-12";

const emailPillBaseClass =
  "h-8 w-8 items-center justify-center whitespace-nowrap rounded-full border border-line/[0.08] bg-canvas p-0 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-line/[0.16] hover:text-aqua-soft md:h-auto md:w-auto md:gap-1.5 md:px-2.5 md:py-1.5";

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

type ContactKey = "whatsapp" | "email" | "linkedin";

const cardBaseClass =
  "group relative flex flex-col items-center justify-between rounded-2xl border border-line/[0.07] bg-surface p-2.5 text-center transition-all duration-150 ease-premium hover:-translate-y-0.5 hover:border-line/[0.14] md:items-stretch md:rounded-3xl md:p-3.5 md:text-left";
const badgeLinkClass = `pointer-events-auto relative z-10 ${iconBadgeClass} transition-transform duration-150 ease-premium hover:scale-105`;
const hoverLabelClass =
  "pointer-events-none hidden -translate-x-1.5 text-xs font-medium text-aqua-soft opacity-0 transition-all duration-200 ease-premium group-hover:translate-x-0 group-hover:opacity-100 md:inline-block";

function CopyActionButton({
  copied,
  onClick,
  ariaLabel,
  testId,
  variant = "desktop",
}: {
  copied: boolean;
  onClick: () => void;
  ariaLabel: string;
  testId?: string;
  variant?: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-label={ariaLabel}
      className={
        isDesktop
          ? "pointer-events-auto relative z-10 hidden items-center justify-center gap-1.5 rounded-full border border-line/[0.08] bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 ease-premium hover:border-line/[0.16] hover:text-aqua-soft md:inline-flex"
          : `pointer-events-auto relative z-10 inline-flex md:hidden ${emailPillBaseClass}`
      }
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
      ) : (
        <Copy
          className={`h-3.5 w-3.5 ${isDesktop ? "text-ink/75" : "text-ink/80"}`}
          aria-hidden="true"
        />
      )}
      {isDesktop && <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  );
}

/**
 * Direct contact section for reaching out via WhatsApp, Email, or LinkedIn.
 */
export function SocialsSection() {
  const [copiedKey, setCopiedKey] = useState<ContactKey | null>(null);
  const [happySignal, setHappySignal] = useState(0);
  const copyTimerRef = useRef<number | null>(null);
  const links = useMemo(() => buildEmailLinks(), []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const triggerHappy = () => setHappySignal((n) => n + 1);

  const handleCopy = async (key: ContactKey, value: string) => {
    triggerHappy();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <section
      id="socials"
      className="mx-auto max-w-6xl bg-canvas px-4 pb-28 pt-5 sm:px-5 sm:pb-24 sm:pt-6 md:pb-20 lg:pb-[84px] lg:pt-5 2xl:max-w-7xl 2xl:pb-24"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[13px] text-aqua">Contact</p>
        <h2 className="mt-2.5 text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl 2xl:text-6xl">
          Reach out{" "}
          <span className="font-serif font-normal italic text-ink-muted">directly</span>
        </h2>
        <p className="mt-2.5 text-base leading-relaxed text-ink-muted sm:text-lg">
          Send your website to get your premium digital brand preview in 48 hours
        </p>
      </div>

      <div className="mx-auto mt-5 grid max-w-3xl grid-cols-[1.2fr_0.8fr] items-center gap-3 sm:mt-6 sm:gap-6 md:grid-cols-[1fr_auto] lg:gap-10">
        <div className="flex min-w-0 flex-col items-center">
          <FoxSpeechBubble />
          <div className="mt-1 w-full">
            <FlowGenFox3D happySignal={happySignal} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[144px] min-w-0 flex-col gap-2 sm:max-w-[168px] sm:gap-2.5 md:mx-0 md:w-[250px] md:max-w-none md:gap-3 lg:w-[260px]">
          <div data-testid="socials-whatsapp-card" className={cardBaseClass}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-hidden="true"
              onClick={triggerHappy}
              className="absolute inset-0 z-0 rounded-2xl md:rounded-3xl"
            />
            <div className="pointer-events-none relative z-10 flex w-full items-center justify-center md:justify-between">
              <div className="flex items-center gap-2.5">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={triggerHappy}
                  aria-label="Message on WhatsApp"
                  className={badgeLinkClass}
                >
                  <WhatsAppIcon size={24} />
                </a>
                <span className={hoverLabelClass}>WhatsApp</span>
              </div>
              <CopyActionButton
                copied={copiedKey === "whatsapp"}
                testId="socials-copy-whatsapp"
                onClick={() => handleCopy("whatsapp", WHATSAPP_DISPLAY)}
                ariaLabel={
                  copiedKey === "whatsapp" ? "WhatsApp number copied" : "Copy WhatsApp number"
                }
              />
            </div>

            <div className="pointer-events-none relative z-10 mt-3 hidden md:block">
              <p className="text-sm font-medium text-aqua-soft">{WHATSAPP_DISPLAY}</p>
            </div>

            <div className="pointer-events-none relative z-10 mt-2.5 flex w-full items-center justify-center border-t border-line/[0.07] pt-2.5 md:hidden">
              <CopyActionButton
                variant="mobile"
                copied={copiedKey === "whatsapp"}
                onClick={() => handleCopy("whatsapp", WHATSAPP_DISPLAY)}
                ariaLabel={
                  copiedKey === "whatsapp" ? "WhatsApp number copied" : "Copy WhatsApp number"
                }
              />
            </div>
          </div>

          <div data-testid="socials-email-card" className={cardBaseClass}>
            <a
              href={links.gmail}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-hidden="true"
              onClick={triggerHappy}
              className="absolute inset-0 z-0 rounded-2xl md:rounded-3xl"
            />
            <div className="pointer-events-none relative z-10 flex w-full flex-col items-center gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5">
                <a
                  href={links.gmail}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={triggerHappy}
                  aria-label="Compose in Gmail"
                  className={badgeLinkClass}
                >
                  <GmailIcon size={22} />
                </a>
                <span className={hoverLabelClass}>Gmail</span>
              </div>
              <CopyActionButton
                copied={copiedKey === "email"}
                testId="socials-copy-email"
                onClick={() => handleCopy("email", CONTACT_EMAIL)}
                ariaLabel={copiedKey === "email" ? "Email copied" : "Copy email address"}
              />
            </div>

            <div className="pointer-events-none relative z-10 mt-3 hidden md:block">
              <p className="break-all text-sm font-medium text-aqua-soft">{CONTACT_EMAIL}</p>
            </div>

            <div className="pointer-events-none relative z-10 mt-2.5 flex w-full flex-nowrap items-center justify-center gap-1.5 border-t border-line/[0.07] pt-2.5 md:mt-3 md:flex-wrap md:justify-start md:pt-3">
              <CopyActionButton
                variant="mobile"
                copied={copiedKey === "email"}
                onClick={() => handleCopy("email", CONTACT_EMAIL)}
                ariaLabel={copiedKey === "email" ? "Email copied" : "Copy email address"}
              />
              <a
                href={links.outlook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={triggerHappy}
                aria-label="Compose in Outlook"
                className={`pointer-events-auto relative z-10 ${emailPillClass}`}
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
                className={`pointer-events-auto relative z-10 ${emailPillClass}`}
              >
                <Mail className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
                <span className="hidden md:inline">Mail</span>
              </a>
            </div>
          </div>

          <div data-testid="socials-linkedin-card" className={cardBaseClass}>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-hidden="true"
              onClick={triggerHappy}
              className="absolute inset-0 z-0 rounded-2xl md:rounded-3xl"
            />
            <div className="pointer-events-none relative z-10 flex w-full items-center justify-center md:justify-between">
              <div className="flex items-center gap-2.5">
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={triggerHappy}
                  aria-label="Message on LinkedIn"
                  className={badgeLinkClass}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4.5" y="4.5" width="15" height="15" fill="#FFFFFF" />
                    <path
                      fill="#0A66C2"
                      d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
                    />
                  </svg>
                </a>
                <span className={hoverLabelClass}>LinkedIn</span>
              </div>
              <CopyActionButton
                copied={copiedKey === "linkedin"}
                testId="socials-copy-linkedin"
                onClick={() => handleCopy("linkedin", LINKEDIN_URL)}
                ariaLabel={
                  copiedKey === "linkedin" ? "LinkedIn link copied" : "Copy LinkedIn URL"
                }
              />
            </div>

            <div className="pointer-events-none relative z-10 mt-3 hidden md:block">
              <p className="text-sm font-medium text-aqua-soft">linkedin.com/in/rohamdoost</p>
            </div>

            <div className="pointer-events-none relative z-10 mt-2.5 flex w-full items-center justify-center border-t border-line/[0.07] pt-2.5 md:hidden">
              <CopyActionButton
                variant="mobile"
                copied={copiedKey === "linkedin"}
                onClick={() => handleCopy("linkedin", LINKEDIN_URL)}
                ariaLabel={
                  copiedKey === "linkedin" ? "LinkedIn link copied" : "Copy LinkedIn URL"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
