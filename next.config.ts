import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Load exFAT and EPERM path patches
import "./patch-exfat.js";

const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
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
const sentryBuildOptions = {
  silent: true,
  org: "cyvrix",
  project: "cyvrix-next",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    automaticVercelMonitors: true,
  },
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
