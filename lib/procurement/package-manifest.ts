/**
 * The package manifest as a text file (Phase 7, manual submission): what was
 * approved, file by file, with each file's SHA-256 so the founder can check
 * that what they upload to a portal is exactly what was approved. Pure, so it
 * is tested without a database.
 */

export type ManifestInput = {
  opportunityTitle: string;
  destination: string;
  version: number;
  status: string;
  manifestSha256: string | null;
  lockedAt: Date | null;
  price: { amount?: number; basis?: string } | null;
  declarations: string[];
  items: { label: string; filename: string; sha256: string; sizeBytes: number }[];
};

/** One line, so a crafted title or filename cannot add lines that look like part of the record. */
const line = (v: string) => v.replace(/[\r\n\t\v\f\u0085\u2028\u2029]+/g, " ").trim();

export function packageManifestText(p: ManifestInput): string {
  const out: string[] = [
    "CYVRIX submission package manifest",
    "",
    `Opportunity:  ${line(p.opportunityTitle)}`,
    `Destination:  ${line(p.destination)}`,
    `Version:      ${p.version} (${p.status})`,
    `Locked:       ${p.lockedAt ? p.lockedAt.toISOString() : "not locked: this is not an approved package"}`,
    `Fingerprint:  ${p.manifestSha256 ?? "none"}`,
    `Price:        ${p.price?.amount !== undefined ? `GBP ${p.price.amount}${p.price.basis ? ` (${line(p.price.basis)})` : ""}` : "none"}`,
    "",
    `Files (${p.items.length}):`,
  ];
  p.items.forEach((i, n) => {
    out.push(`  ${n + 1}. ${line(i.label)}`, `     file:   ${line(i.filename)} (${i.sizeBytes} bytes)`, `     sha256: ${i.sha256}`);
  });
  out.push("", `Declarations (${p.declarations.length}):`);
  if (p.declarations.length === 0) out.push("  none");
  p.declarations.forEach((d, n) => out.push(`  ${n + 1}. ${line(d)}`));
  out.push(
    "",
    "Before you upload, check each file's fingerprint matches the sha256 above.",
    "On Windows:  certutil -hashfile \"<file>\" SHA256",
    "On macOS:    shasum -a 256 \"<file>\"",
    "A file that does not match is not the approved one: do not submit it."
  );
  return `${out.join("\r\n")}\r\n`;
}
