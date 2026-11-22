import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowGen — Interactive 3D websites that turn visitors into booked calls",
  description:
    "FlowGen builds fast, interactive 3D websites for B2B companies. Buyers explore your product instantly, understand it faster, and book more sales calls.",
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
