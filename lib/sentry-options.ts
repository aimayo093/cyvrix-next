import type { BrowserOptions } from "@sentry/nextjs";

/**
 * What Sentry may collect, shared by the browser, server and edge set-ups.
 *
 * Sentry 11 replaced `sendDefaultPii` with `dataCollection` and made the
 * defaults collect almost everything: every request and response body,
 * headers, cookies, user details, database query values and the local
 * variables in each stack frame. On this site that would mean sign-in
 * passwords, contact-form contents and session cookies leaving for a third
 * party. Sentry 10, which we ran before, collected none of those unless asked,
 * so each is switched off here explicitly to keep that behaviour.
 *
 * Errors, stack traces (file, line, function) and request URLs without query
 * strings are still reported — enough to find a fault, not enough to identify
 * a visitor. Loosen one of these only with a decision in docs/DECISIONS.md.
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} satisfies NonNullable<BrowserOptions["dataCollection"]>;
