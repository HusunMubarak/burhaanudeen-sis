import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Burhaanudeen Islamic School — Sang, Mion District",
    template: "%s | Burhaanudeen Islamic School",
  },
  description:
    "Burhaanudeen Islamic School in Sang, Mion District, Ghana offers Creche, Primary and JHS education rooted in Islamic values and academic excellence.",
  // Optional: set GOOGLE_SITE_VERIFICATION in your host's env vars with
  // the value Google Search Console gives you for "HTML tag"
  // verification — no code change needed to verify a new domain.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col font-body">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
