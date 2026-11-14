/**
 * Server side of enquiry-source capture (see lib/attribution.ts).
 *
 * The browser's JSON is a hint, never trusted: keys are allow-listed, values
 * re-cleaned and capped, the confidence checked against a fixed set. Bad input
 * yields all-null columns and never fails the enquiry. Pure, so
 * scripts/test-enquiry-source.mts can exercise it.
 */
import { ATTRIBUTION_CAPS, ATTRIBUTION_MAX_LENGTH, CONFIDENCES, cleanToken, type Confidence } from "@/lib/attribution";
import { heardAboutLabel, normaliseHeardAbout, normaliseHeardAboutOther } from "@/lib/heard-about";
import type { Prisma } from "@/generated/prisma";

export type SourceColumns = {
  leadSource: string | null;
  leadMedium: string | null;
  leadCampaign: string | null;
  sourceConfidence: Confidence | null;
  sourceDetail: Prisma.InputJsonValue | undefined;
};

const NONE: SourceColumns = {
  leadSource: null,
  leadMedium: null,
  leadCampaign: null,
  sourceConfidence: null,
  sourceDetail: undefined,
};

// The same limits and confidence set the browser uses (lib/attribution.ts),
// so a change on one side can never silently truncate on the other.
const CONFIDENCE = new Set<string>(CONFIDENCES);
const CAP = ATTRIBUTION_CAPS;
const KEYS = Object.keys(CAP) as (keyof typeof CAP)[];

function touch(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = typeof raw[key] === "string" ? cleanToken(raw[key] as string, CAP[key]) : "";
    if (value) out[key] = value;
  }
  if (typeof raw.confidence !== "string" || !CONFIDENCE.has(raw.confidence) || !out.source) return null;
  out.confidence = raw.confidence;
  return out;
}

/** Never throws. Anything malformed returns all-null columns. */
export function sanitiseAttribution(raw: unknown): SourceColumns {
  try {
    if (typeof raw !== "string" || !raw || raw.length > ATTRIBUTION_MAX_LENGTH) return NONE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NONE;
    const payload = parsed as Record<string, unknown>;
    if (payload.v !== 1) return NONE;

    const first = touch(payload.firstTouch);
    const last = touch(payload.lastTouch) ?? first;
    if (!last) return NONE;

    const formPage = typeof payload.formPage === "string" ? cleanToken(payload.formPage, 200) || null : null;
    return {
      leadSource: last.source ?? null,
      leadMedium: last.medium ?? null,
      leadCampaign: last.campaign ?? null,
      sourceConfidence: last.confidence as SourceColumns["sourceConfidence"],
      sourceDetail: { v: 1, firstTouch: first ?? last, lastTouch: last, formPage },
    };
  } catch {
    return NONE;
  }
}

const CONFIDENCE_LABEL: Record<string, string> = {
  utm: "Campaign link",
  referrer: "Referring website",
  direct: "No referrer (typed, bookmarked or private)",
};

/**
 * Read-only rows for the CRM lead panel. Leads from before capture existed, or
 * whose browser sent nothing, read "Not captured" (never "direct").
 */
export function enquirySourceRows(lead: {
  heardAbout?: string | null;
  heardAboutOther?: string | null;
  leadSource?: string | null;
  leadMedium?: string | null;
  leadCampaign?: string | null;
  sourceConfidence?: string | null;
  sourceDetail?: unknown;
}): [label: string, value: string][] {
  const notCaptured = "Not captured";
  const detail = (lead.sourceDetail && typeof lead.sourceDetail === "object" ? lead.sourceDetail : {}) as Record<string, unknown>;
  const first = (detail.firstTouch && typeof detail.firstTouch === "object" ? detail.firstTouch : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" && value ? value : notCaptured);
  const heard = heardAboutLabel(lead.heardAbout);
  return [
    ["How they heard", heard ? (lead.heardAbout === "other" && lead.heardAboutOther ? `${heard}: ${lead.heardAboutOther}` : heard) : notCaptured],
    ["Source", text(lead.leadSource)],
    ["Medium", text(lead.leadMedium)],
    ["Campaign", text(lead.leadCampaign)],
    ["Based on", lead.sourceConfidence ? CONFIDENCE_LABEL[lead.sourceConfidence] ?? notCaptured : notCaptured],
    ["First landed on", text(first.landingPage)],
    ["Form page", text(detail.formPage)],
  ];
}

/** The seven columns for a new lead, from the submitted form values. */
export function enquirySourceColumns(values: { heardAbout?: unknown; heardAboutOther?: unknown; attribution?: unknown }) {
  const heardAbout = normaliseHeardAbout(values.heardAbout);
  return {
    heardAbout,
    heardAboutOther: normaliseHeardAboutOther(heardAbout, values.heardAboutOther),
    ...sanitiseAttribution(values.attribution),
  };
}
