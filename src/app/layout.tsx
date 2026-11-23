import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink-muted antialiased">
        {children}
      </body>
    </html>
  );
}
