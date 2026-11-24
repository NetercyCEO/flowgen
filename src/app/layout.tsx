import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Fira_Sans,
  Plus_Jakarta_Sans,
  Sorts_Mill_Goudy,
} from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sortsMillGoudy = Sorts_Mill_Goudy({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
  display: "swap",
});

/* Fira Sans — SIL OFL 1.1, Copyright 2012-2016 The Mozilla Foundation and Telefonica S.A. */
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-hero",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.flowgen-studio.com"),
  alternates: {
    canonical: "/",
  },
  title: "FlowGen — Your digital brand in less than 48 hours",
  description:
    "The modern, premium digital brand your business can have in less than 48 hours. Check out the website for more information.",
  openGraph: {
    title: "FlowGen — Your digital brand in less than 48 hours",
    description:
      "The modern, premium digital brand your business can have in less than 48 hours. Check out the website for more information.",
    url: "https://www.flowgen-studio.com",
    siteName: "FlowGen",
    type: "website",
    images: [
      {
        url: "/og-image.jpg?v=2",
        secureUrl: "https://www.flowgen-studio.com/og-image.jpg?v=2",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "FlowGen — 3D ember sphere and flow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowGen — Your digital brand in less than 48 hours",
    description:
      "The modern, premium digital brand your business can have in less than 48 hours. Check out the website for more information.",
    images: [
      {
        url: "/og-image.jpg?v=2",
        alt: "FlowGen — 3D ember sphere and flow",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} ${sortsMillGoudy.variable} ${firaSans.variable}`}
    >
      <body className="min-h-screen bg-canvas font-sans text-ink-muted antialiased">
        {children}
      </body>
    </html>
  );
}
