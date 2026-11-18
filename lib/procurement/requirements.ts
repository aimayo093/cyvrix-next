/**
 * Phase 4: the requirements checklist for a tender (spec section 11). Pure, so
 * it is tested without a database (npm run test:procurement-tender).
 *
 * A person enters each requirement from the tender documents, with where it
 * came from, and records whether CYVRIX meets it. A mandatory requirement can
 * only be marked met with a current evidence document (never an AI draft or an
 * expired file), and an open or unmet mandatory requirement stops the bid going
 * to the founder for final approval.
 */

export const REQUIREMENT_KINDS = ["mandatory", "scored", "information"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

export const REQUIREMENT_STATUSES = ["unknown", "met", "partly_met", "not_met", "not_applicable"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const REQUIREMENT_KIND_LABEL: Record<RequirementKind, string> = {
  mandatory: "Mandatory (pass/fail)",
  scored: "Scored",
  information: "Information only",
};

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  unknown: "Not yet checked",
  met: "Met",
  partly_met: "Partly met",
  not_met: "Not met",
  not_applicable: "Not applicable",
};

export type RequirementInput = { kind: string; status: string; evidenceVersionId: string | null; text: string };

/** Why this requirement cannot be saved as given, or null. */
export function requirementProblem(r: RequirementInput): string | null {
  if (!(REQUIREMENT_KINDS as readonly string[]).includes(r.kind)) return "Choose what kind of requirement this is.";
  if (!(REQUIREMENT_STATUSES as readonly string[]).includes(r.status)) return "Choose a status.";
  const text = r.text.trim();
  if (text.length < 3 || text.length > 2000) return "Give the requirement in 3 to 2,000 characters.";
  if (r.kind === "mandatory" && r.status === "met" && !r.evidenceVersionId) {
    return "A mandatory requirement is marked met only with the evidence document that shows it.";
  }
  return null;
}

/** Open: still to be checked, or only partly met. Unmet is counted apart. */
const OPEN: readonly string[] = ["unknown", "partly_met"];

export type RequirementsSummary = {
  recorded: number;
  mandatory: number;
  mandatoryOpen: number;
  mandatoryNotMet: number;
  /** Texts of unmet mandatory requirements: candidate disqualifiers for the assessment. */
  disqualifiers: string[];
};

export function summarise(rows: { kind: string; status: string; ref: string | null; text: string }[]): RequirementsSummary {
  const mandatory = rows.filter((r) => r.kind === "mandatory");
  const notMet = mandatory.filter((r) => r.status === "not_met");
  return {
    recorded: rows.length,
    mandatory: mandatory.length,
    mandatoryOpen: mandatory.filter((r) => OPEN.includes(r.status)).length,
    mandatoryNotMet: notMet.length,
    disqualifiers: notMet.map((r) => (r.ref ? `${r.ref}: ${r.text}` : r.text).replace(/\s+/g, " ").slice(0, 300)),
  };
}

/**
 * The gate before final approval (lifecycle "requirements"). A tender needs
 * its requirements recorded; every mandatory one must be met or not applicable.
 */
export function requirementsGate(kind: string, s: Pick<RequirementsSummary, "recorded" | "mandatoryOpen" | "mandatoryNotMet">): { ok: true } | { ok: false; reason: string } {
  if (kind === "tender" && s.recorded === 0) return { ok: false, reason: "Record the tender's requirements before final approval." };
  if (s.mandatoryNotMet > 0) return { ok: false, reason: `${s.mandatoryNotMet} mandatory requirement(s) are not met. This is a no-bid unless that changes.` };
  if (s.mandatoryOpen > 0) {
    return { ok: false, reason: `${s.mandatoryOpen} mandatory requirement(s) are still unchecked, only partly met, or marked met on evidence that has since expired or been replaced.` };
  }
  return { ok: true };
}

/** Disqualifiers kept per assessment; the form's prefill uses the same limit, so none is dropped unseen. */
export const MAX_DISQUALIFIERS = 20;
