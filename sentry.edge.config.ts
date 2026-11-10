import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "@/lib/sentry-options";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // See lib/sentry-options.ts: no bodies, cookies, headers or user details.
  dataCollection: sentryDataCollection,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console regarding SDK integration.
  debug: false,
});
