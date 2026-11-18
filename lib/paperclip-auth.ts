/**
 * Which token unlocks which part of the Paperclip integration.
 *
 * Three scopes, three secrets (DECISIONS sections 15 and 20):
 *   read         leads, tickets, privacy requests and the company snapshot
 *   draft        submit marketing drafts and proposals, and read their review result
 *   procurement  read opportunities and organisations with no personal data,
 *                record research, and make the few moves agents may make
 *
 * An agent that only writes copy is given the draft token and never holds
 * client data. Each must differ from the others: a draft or procurement token
 * equal to another token switches that scope off, because one leaked secret
 * would otherwise grant both.
 *
 * Kept free of Prisma and `server-only` so `npm run test:paperclip` can run it.
 */
import { feedAuthorised } from "@/lib/executive-os-feed-core";
import type { SecurityScanCheck } from "@/lib/security-scan";

export type IntegrationScope = "read" | "draft" | "procurement";

export const MIN_TOKEN_LENGTH = 32;

const usable = (value: string | undefined) => {
  const t = value?.trim();
  return t && t.length >= MIN_TOKEN_LENGTH ? t : null;
};

/**
 * The configured token for a scope, or null when that scope is off.
 * The read scope also accepts the older EXECUTIVE_OS_FEED_TOKEN, so the feed
 * keeps working for anything already using it.
 */
export function integrationToken(scope: IntegrationScope, env: Record<string, string | undefined> = process.env): string | null {
  const read = usable(env.PAPERCLIP_READ_TOKEN) ?? usable(env.EXECUTIVE_OS_FEED_TOKEN);
  if (scope === "read") return read;
  const draft = usable(env.PAPERCLIP_DRAFT_TOKEN);
  if (scope === "draft") return !draft || draft === read ? null : draft;
  const procurement = usable(env.PAPERCLIP_PROCUREMENT_TOKEN);
  if (!procurement || procurement === read || procurement === draft) return null;
  return procurement;
}

export type AuthResult = "off" | "unauthorised" | "ok";

/** Off (answer 404), unauthorised (401), or ok. Constant-time comparison. */
export function authorise(scope: IntegrationScope, header: string | null, env: Record<string, string | undefined> = process.env): AuthResult {
  const token = integrationToken(scope, env);
  if (!token) return "off";
  return feedAuthorised(header, token) ? "ok" : "unauthorised";
}

/** Plain-language state of both tokens, for the Security Center. Never includes a value. */
export function integrationTokenState(env: Record<string, string | undefined> = process.env) {
  const raw = (v: string | undefined) => v?.trim() ?? "";
  const read = raw(env.PAPERCLIP_READ_TOKEN) || raw(env.EXECUTIVE_OS_FEED_TOKEN);
  const draft = raw(env.PAPERCLIP_DRAFT_TOKEN);
  const procurement = raw(env.PAPERCLIP_PROCUREMENT_TOKEN);
  return {
    readSet: read.length > 0,
    readStrong: read.length >= MIN_TOKEN_LENGTH,
    draftSet: draft.length > 0,
    draftStrong: draft.length >= MIN_TOKEN_LENGTH,
    sameValue: read.length > 0 && read === draft,
    procurementSet: procurement.length > 0,
    procurementStrong: procurement.length >= MIN_TOKEN_LENGTH,
    procurementReused: procurement.length > 0 && (procurement === read || procurement === draft),
  };
}

/**
 * The Security Center's view of the integration. Not configured is not a
 * failure: the integration is optional, so it is reported as not applicable.
 */
export function paperclipTokenCheck(env: Record<string, string | undefined> = process.env): SecurityScanCheck {
  const t = integrationTokenState(env);
  const base = { id: "paperclip_tokens", label: "Paperclip Integration Tokens", category: "security" as const };
  if (!t.readSet && !t.draftSet && !t.procurementSet) {
    return { ...base, status: "pass", assessed: false, notApplicable: true, detail: "The Paperclip integration is switched off: no tokens are set, so its routes answer 404." };
  }
  const problems: string[] = [];
  if (t.readSet && !t.readStrong) problems.push(`the read token is shorter than ${MIN_TOKEN_LENGTH} characters, so reading is switched off`);
  if (t.draftSet && !t.draftStrong) problems.push(`the draft token is shorter than ${MIN_TOKEN_LENGTH} characters, so drafting is switched off`);
  if (t.sameValue) problems.push("the read and draft tokens are the same value, so drafting is switched off; give them different values");
  if (t.procurementSet && !t.procurementStrong) problems.push(`the procurement token is shorter than ${MIN_TOKEN_LENGTH} characters, so procurement access is switched off`);
  if (t.procurementReused) problems.push("the procurement token is the same as another token, so procurement access is switched off; give it its own value");
  if (problems.length > 0) {
    return { ...base, status: "warn", detail: `Paperclip: ${problems.join("; ")}.` };
  }
  const on = [t.readSet && "read", t.draftSet && "draft", t.procurementSet && "procurement"].filter(Boolean).join(", ");
  return { ...base, status: "pass", detail: `Paperclip ${on} access is on, each with its own token of at least ${MIN_TOKEN_LENGTH} characters.` };
}
