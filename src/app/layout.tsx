import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://flowgen-eight.vercel.app"),
  title: "FlowGen — Your digital appearance in 48 hours",
  description:
    "Your digital appearance in 48 hours. Interactive 3D websites that turn visitors into booked sales calls.",
  openGraph: {
    title: "FlowGen — Your digital appearance in 48 hours",
    description:
      "Interactive 3D websites that turn visitors into booked sales calls. Free 3D preview in 48 hours.",
    url: "https://flowgen-eight.vercel.app",
    siteName: "FlowGen",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FlowGen — Interactive 3D sphere",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowGen — Your digital appearance in 48 hours",
    description:
      "Interactive 3D websites that turn visitors into booked sales calls. Free 3D preview in 48 hours.",
    images: ["/og-image.jpg"],
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
