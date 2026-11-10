import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "@/lib/sentry-options";

// Browser set-up. This was sentry.client.config.ts; Next.js loads this file
// itself, and Sentry 11 expects it here for both webpack and Turbopack.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  // See lib/sentry-options.ts: no bodies, cookies, headers or user details.
  dataCollection: sentryDataCollection,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console regarding SDK integration.
  debug: false,
});

// Lets Sentry name client-side navigations by route.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
