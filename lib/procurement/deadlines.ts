/**
 * Phase 4: which deadlines need attention (spec section 13). Pure, so it is
 * tested without a database (npm run test:procurement-tender).
 *
 * Two dates per opportunity: the submission deadline and the clarification
 * deadline (the last day to ask the buyer a question). Both come from the
 * notice (OCDS tenderPeriod and enquiryPeriod) or are entered by a person.
 * Nothing is sent anywhere: alerts are shown in the admin only.
 */

/**
 * Statuses where a deadline can still be missed: everything before the bid is
 * submitted. After submission (or a no-bid) the dates are history.
 */
export const DEADLINE_STATUSES = [
  "Discovered",
  "Validated",
  "Qualified",
  "EligibilityReview",
  "RegistrationRequired",
  "AwaitingBidDecision",
  "PreparingBid",
  "QualityReview",
  "AwaitingFinalApproval",
  "ApprovedForSubmission",
  "Submitting",
  "SubmissionFailed",
] as const;

export type Urgency = "passed" | "within_2_days" | "within_7_days" | "within_14_days";
export type DeadlineKind = "submission" | "clarification";

export type DeadlineAlert = {
  opportunityId: string;
  title: string;
  status: string;
  kind: DeadlineKind;
  at: Date;
  urgency: Urgency;
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  passed: "Passed",
  within_2_days: "Within 2 days",
  within_7_days: "Within 7 days",
  within_14_days: "Within 14 days",
};

const DAY = 86_400_000;
/** A deadline that passed more than this long ago is no longer shown (the record should be closed). */
const PASSED_WINDOW = 7 * DAY;

export function urgency(at: Date, now: Date): Urgency | null {
  const left = at.getTime() - now.getTime();
  if (left < 0) return -left <= PASSED_WINDOW ? "passed" : null;
  if (left <= 2 * DAY) return "within_2_days";
  if (left <= 7 * DAY) return "within_7_days";
  if (left <= 14 * DAY) return "within_14_days";
  return null;
}

type OppDates = { id: string; title: string; status: string; deadlineAt: Date | null; clarificationDeadlineAt: Date | null };

/** Alerts for every live opportunity, soonest first; passed ones lead. */
export function deadlineAlerts(opps: OppDates[], now: Date): DeadlineAlert[] {
  const live = new Set<string>(DEADLINE_STATUSES);
  const alerts: DeadlineAlert[] = [];
  for (const o of opps) {
    if (!live.has(o.status)) continue;
    const dates: [DeadlineKind, Date | null][] = [
      ["submission", o.deadlineAt],
      // A clarification deadline after the submission deadline is meaningless; ignore it.
      ["clarification", o.clarificationDeadlineAt && (!o.deadlineAt || o.clarificationDeadlineAt <= o.deadlineAt) ? o.clarificationDeadlineAt : null],
    ];
    for (const [kind, at] of dates) {
      if (!at) continue;
      const u = urgency(at, now);
      if (u) alerts.push({ opportunityId: o.id, title: o.title, status: o.status, kind, at, urgency: u });
    }
  }
  return alerts.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * What a newer notice did to a recorded date. Buyers extend deadlines and
 * sometimes bring them forward; both must be visible. A date the newer notice
 * leaves out is kept (never blanked).
 */
export function dateChange(previous: Date | null, next: Date | null): "set" | "extended" | "brought_forward" | null {
  if (!next) return null;
  if (!previous) return "set";
  if (next.getTime() === previous.getTime()) return null;
  return next.getTime() > previous.getTime() ? "extended" : "brought_forward";
}

/** The changes a new pair of dates makes, for the audit log. Dates left out are kept. */
export function recordDateChanges(
  previous: { deadlineAt: Date | null; clarificationDeadlineAt: Date | null },
  next: { deadlineAt: Date | null; clarificationDeadlineAt: Date | null }
) {
  const out: { field: string; change: string; from: string | null; to: string }[] = [];
  for (const field of ["deadlineAt", "clarificationDeadlineAt"] as const) {
    const change = dateChange(previous[field], next[field]);
    if (change) out.push({ field, change, from: previous[field]?.toISOString() ?? null, to: next[field]!.toISOString() });
  }
  return out;
}
