/**
 * Pure rules for telling account holders that a public legal document changed
 * (DECISIONS §19), so `npm run test:legal-notices` can cover them.
 */

export const LEGAL_NOTICE_SUMMARY_MAX = 600;

export type LegalVersion = { status: string; title: string; body: string | null } | null;

/** Whitespace-insensitive, so re-saving the same text never sends a notice. */
function normalise(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/**
 * A notice goes out when the public text changes: a document published for the
 * first time, republished after being a draft, or published with different
 * wording. Saving a draft, unpublishing, or re-saving identical text does not.
 */
export function legalChangeNeedsNotice(before: LegalVersion, after: LegalVersion): boolean {
  if (!after || after.status !== "PUBLISHED") return false;
  if (!before || before.status !== "PUBLISHED") return true;
  return normalise(before.title) !== normalise(after.title) || normalise(before.body) !== normalise(after.body);
}

/** The optional "what changed" note, one paragraph, bounded. */
export function cleanChangeSummary(value: string | null | undefined): string {
  const text = (value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return text.length <= LEGAL_NOTICE_SUMMARY_MAX ? text : `${text.slice(0, LEGAL_NOTICE_SUMMARY_MAX - 1)}…`;
}

export function legalNoticeNotification(input: { title: string; summary: string; url: string }) {
  return {
    title: `We have updated our ${input.title}`,
    body: [input.summary || `Our ${input.title} has changed.`, `Read it at ${input.url}`].join(" "),
  };
}

export function legalNoticeEmail(input: { title: string; summary: string; url: string; name?: string | null; date: string }) {
  const greeting = input.name?.trim() ? `Hello ${input.name.trim()},` : "Hello,";
  return {
    subject: `We have updated our ${input.title}`,
    text: [
      greeting,
      "",
      `We have updated our ${input.title}. The new version applies from ${input.date}.`,
      ...(input.summary ? ["", `What changed: ${input.summary}`] : []),
      "",
      `You can read it in full here: ${input.url}`,
      "",
      "You are receiving this because you have a CYVRIX account. It is a service message about the terms that apply to you, not marketing.",
      "",
      "CYVRIX",
    ].join("\n"),
  };
}
