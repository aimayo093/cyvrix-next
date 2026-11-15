/**
 * Pure rules for telling account holders that a public legal document changed
 * (DECISIONS §19), so `npm run test:legal-notices` can cover them.
 *
 * No `server-only` (tests import it); it imports `node:crypto`, so a client
 * component importing it fails the build anyway.
 */
import { createHash } from "node:crypto";
import { getDefaultLegalDocument } from "@/lib/legal-content";
import { toPublicLegalDocument } from "@/lib/public-legal";

export const LEGAL_NOTICE_SUMMARY_MAX = 600;
/** One email may take this long before it is counted as failed and the next is tried. */
export const LEGAL_NOTICE_SEND_TIMEOUT_MS = 15_000;

export type LegalVersion = { status: string; title: string; body: string | null } | null;

/**
 * The wording visitors actually see for a legal route. It mirrors the public
 * pages: a published record that passes toPublicLegalDocument, otherwise the
 * reviewed default wording. Whitespace and paragraph breaks are ignored, so
 * only a change of words counts (a textarea may send CRLF line endings).
 */
export function visibleLegalText(slug: string, record: LegalVersion): string {
  const fromRecord = record && record.status === "PUBLISHED" ? toPublicLegalDocument({ title: record.title, body: record.body }) : null;
  const document = fromRecord ?? getDefaultLegalDocument(slug);
  if (!document) return "";
  const parts = document.sections?.length
    ? document.sections.flatMap((section) => [section.heading, ...section.paragraphs])
    : document.paragraphs;
  return [document.title, ...parts].join(" ").replace(/\s+/g, " ").trim();
}

/**
 * A notice goes out only when a save makes visitors see different text. A
 * draft, an unpublish, the same wording again, a whitespace-only edit, or a
 * restore that replaces a stub visitors never saw (the public page already
 * showed the reviewed wording) sends nothing.
 */
export function legalChangeNeedsNotice(slug: string, before: LegalVersion, after: LegalVersion): boolean {
  if (!after || after.status !== "PUBLISHED") return false;
  return visibleLegalText(slug, before) !== visibleLegalText(slug, after);
}

/** Identifies the announced version, so one version is never announced twice. */
export function legalVersionHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** The optional "what changed" note, one paragraph, bounded. */
export function cleanChangeSummary(value: string | null | undefined): string {
  const text = (value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return text.length <= LEGAL_NOTICE_SUMMARY_MAX ? text : `${text.slice(0, LEGAL_NOTICE_SUMMARY_MAX - 1)}…`;
}

/** The date the new version applies from: when it was saved, not when the email goes out. */
export function legalNoticeDate(effectiveAt: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(effectiveAt);
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
      "You can read it in full here:",
      input.url,
      "",
      "You are receiving this because you have a CYVRIX account. It is a service message about the terms that apply to you, not marketing.",
      "",
      "CYVRIX",
    ].join("\n"),
  };
}
