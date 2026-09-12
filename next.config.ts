import type { NextConfig } from "next";
import path from "node:path";

// A10: conservative security headers. The CSP intentionally allows
// 'unsafe-inline'/'unsafe-eval' for scripts (Next.js's dev-mode Fast
// Refresh and hydration bootstrap need this without a nonce-based
// setup, which is a larger change than this hardening pass covers),
// Google Fonts for style-src/font-src (see globals.css), and the
// Google Maps embed origin for frame-src (see the contact page's
// mapEmbedUrl iframe). pdfkit responses are same-origin binary API
// responses, not page content, so they're unaffected by CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Prisma 7's driver-adapter runtime and pg's native bindings must
  // not be bundled by Turbopack/webpack — they're loaded as real
  // Node modules at request time.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "pdfkit",
    "exceljs",
  ],
  // Pins the workspace root to this project explicitly. Without this,
  // Turbopack's root auto-detection can find an unrelated lockfile
  // further up the filesystem (e.g. in your home directory) and warn
  // about it, or trace files from the wrong directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: CSP },
          // Browsers only act on this over an https response, so it's
          // harmless during local http dev and takes effect the moment
          // the app is served over https in production.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // No page in this app needs the camera, microphone, or
          // geolocation APIs — deny them outright rather than leaving
          // the browser default (which varies by embedding context).
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
