import type { NextConfig } from "next";
import { withSentryConfig, type SentryBuildOptions } from "@sentry/nextjs/config";

// Load exFAT and EPERM path patches
import "./patch-exfat.js";

const isDevelopment = process.env.NODE_ENV === "development";
/**
 * Content-Security-Policy. See DECISIONS section 14 for why `script-src` still
 * allows inline scripts: nonces would make every page render per request and
 * undo the cached pages. What is locked down instead:
 *
 * - script-src-attr 'none': no inline event handlers (onerror=, onclick=). An
 *   injected `<img onerror>` is the usual way stored XSS runs; React never
 *   emits these attributes, so nothing legitimate is lost.
 * - connect-src 'self': the browser only talks to this origin. Sentry goes
 *   through the /monitoring tunnel and Vercel Analytics through /_vercel, so a
 *   script that did run could not post data anywhere else.
 * - upgrade-insecure-requests: an http:// image or link in CMS content is
 *   fetched over https instead of downgrading the page.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  // Development adds the hot-reload websocket.
  `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "browsing-topics=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Required for the forbidden()/unauthorized() interrupts used by app/forbidden.tsx.
    authInterrupts: true,

    // Static generation workers, capped to protect the database connection
    // budget. The build reaches Supabase through the session-mode pooler on
    // port 5432, which accepts 15 clients in total, and the default worker
    // count saturated it: pages fell back to static content mid-build and
    // published without their CMS data, silently. Four workers against a pool
    // of three connections each stays inside the limit.
    //
    // Remove this once DATABASE_URL points at the transaction pooler on 6543.
    cpus: 4,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kmfjipkazypuktpqnfvp.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

// Sentry configuration options
const sentryBuildOptions: SentryBuildOptions = {
  silent: true,
  org: "cyvrix",
  project: "cyvrix-next",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    // Sentry 11 moved disableLogger here.
    treeshake: { removeDebugLogging: true },
  },
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
