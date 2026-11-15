/**
 * Founder approval rules (spec section 15; docs/procurement/02-design.md §5).
 *
 * Pure, so the rules are tested without a database. An approval binds one
 * manifest hash: the hash of the package's files, destination, price and
 * declarations. Any change makes a new hash, so an old approval no longer
 * matches and fails closed.
 */
import crypto from "node:crypto";
import type { ApprovalAction } from "./lifecycle";

export type ManifestInput = {
  destination: string;
  items: { documentVersionId: string; sha256: string; label: string }[];
  priceSnapshot: unknown;
  declarations: unknown;
};

/** JSON with object keys sorted, so equal content always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function manifestSha256(input: ManifestInput): string {
  const items = [...input.items]
    .map((i) => ({ documentVersionId: i.documentVersionId, sha256: i.sha256, label: i.label }))
    .sort((a, b) => (a.documentVersionId < b.documentVersionId ? -1 : 1));
  const body = canonicalJson({
    v: 1,
    destination: input.destination.trim(),
    items,
    priceSnapshot: input.priceSnapshot ?? null,
    declarations: input.declarations ?? [],
  });
  return crypto.createHash("sha256").update(body).digest("hex");
}

export const APPROVAL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** Seven days, never past the opportunity's deadline. Null when the deadline has passed. */
export function approvalExpiry(now: Date, deadlineAt: Date | null): Date | null {
  const week = new Date(now.getTime() + APPROVAL_LIFETIME_MS);
  if (!deadlineAt) return week;
  if (deadlineAt.getTime() <= now.getTime()) return null;
  return deadlineAt < week ? deadlineAt : week;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/**
 * Document statuses that can stand as evidence or as a receipt. An AI draft is
 * never evidence (spec section 9), and a superseded version is not current.
 */
export const EVIDENCE_STATUSES = ["verified", "founder_approved", "certified_evidence"] as const;

/**
 * Company facts that may never be marked public (DECISIONS section 4): the
 * residential registered office, its postcode, and personal details of the
 * founder or directors. Matched on the key, whatever the label says.
 */
export function isWithheldFactKey(key: string): boolean {
  return /^(registered_office|registered_address|postcode|founder|director|home_|personal_)/.test(key) || /(_address|_postcode)$/.test(key);
}

export function evidenceVerdict(version: { status: string } | null): Verdict {
  if (!version) return { ok: false, reason: "The evidence document could not be found." };
  if (!(EVIDENCE_STATUSES as readonly string[]).includes(version.status)) {
    return {
      ok: false,
      reason:
        version.status === "ai_draft"
          ? "An AI draft is not evidence. Upload the document you received."
          : "That version has been superseded. Use the current one.",
    };
  }
  return { ok: true };
}

export function canDecide(request: { status: string; expiresAt: Date }, now: Date): Verdict {
  if (request.status !== "pending") return { ok: false, reason: "This request has already been decided." };
  if (request.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "This request has expired. Ask for a new one." };
  return { ok: true };
}

export type ExecutionCheckInput = {
  now: Date;
  action: ApprovalAction;
  request: { actionType: string; manifestSha256: string; opportunityId: string };
  decision: { decision: string; manifestSha256: string; expiresAt: Date } | null;
  /** The package as it is now. */
  pkg: { status: string; manifestSha256: string | null; opportunityId: string };
  /** The manifest recomputed from the package's items now. */
  recomputedManifest: string;
  alreadyUsed: boolean;
  hasConfirmedSameAction: boolean;
  /** Another execution of the same action on this opportunity is pending or unclear. */
  hasUnresolvedSameAction: boolean;
};

/**
 * Whether an approved action may be carried out now. Every check fails closed:
 * an approval for a different action, a changed or unlocked package, an expired
 * or already-used approval, or a second confirmed submission is refused.
 */
export function canExecute(input: ExecutionCheckInput): Verdict {
  const { decision, request, pkg } = input;
  if (!decision || decision.decision !== "approved") return { ok: false, reason: "There is no founder approval for this action." };
  if (request.actionType !== input.action) return { ok: false, reason: "The approval is for a different action." };
  if (decision.expiresAt.getTime() <= input.now.getTime()) return { ok: false, reason: "The approval has expired." };
  if (input.alreadyUsed) return { ok: false, reason: "This approval has already been used." };
  if (pkg.opportunityId !== request.opportunityId) return { ok: false, reason: "The package belongs to a different opportunity." };
  if (pkg.status !== "locked") return { ok: false, reason: "The package is no longer the approved version." };
  if (
    decision.manifestSha256 !== request.manifestSha256 ||
    pkg.manifestSha256 !== request.manifestSha256 ||
    input.recomputedManifest !== request.manifestSha256
  ) {
    return { ok: false, reason: "The package has changed since it was approved. Ask for a new approval." };
  }
  if (input.hasConfirmedSameAction) return { ok: false, reason: "This has already been carried out for this opportunity." };
  // An unclear or unfinished attempt may have gone through: retrying could submit twice.
  if (input.hasUnresolvedSameAction) {
    return { ok: false, reason: "An earlier attempt is still pending or unclear. Check the portal and record its outcome first." };
  }
  return { ok: true };
}
