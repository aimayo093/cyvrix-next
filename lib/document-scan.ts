import "server-only";

import {
  inspectDocument,
  MAX_DOCUMENT_BYTES,
  type DocumentKind,
} from "@/lib/document-scan-checks";

export { MAX_DOCUMENT_BYTES, ACCEPTED_EXTENSIONS } from "@/lib/document-scan-checks";
export type { DocumentKind } from "@/lib/document-scan-checks";

export type ScanVerdict = {
  accepted: boolean;
  kind?: DocumentKind;
  sha256: string;
  sizeBytes: number;
  reasons: string[];
  notes: string[];
  /** Whether an external anti-malware engine verified the file. */
  externallyScanned: boolean;
};

/**
 * Integration point for an anti-malware engine.
 *
 * Returns `null` when no engine is configured, which is reported honestly
 * rather than treated as a clean result. Wire an approved engine here (for
 * example a ClamAV daemon or a cloud scanning API) and return its verdict.
 */
async function scanWithExternalEngine(
  _buffer: Buffer
): Promise<{ clean: boolean; detail: string } | null> {
  const endpoint = process.env.MALWARE_SCAN_URL;
  const apiKey = process.env.MALWARE_SCAN_API_KEY;
  if (!endpoint || !apiKey) return null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", Authorization: `Bearer ${apiKey}` },
      body: new Uint8Array(_buffer),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { clean: false, detail: "The scanning service could not verify this file." };

    const result = (await response.json()) as { clean?: boolean; detail?: string };
    return { clean: result.clean === true, detail: result.detail ?? "" };
  } catch {
    // A scanner that cannot be reached must not be treated as a pass.
    return { clean: false, detail: "The scanning service was unavailable." };
  }
}

/**
 * Scans a document and returns a verdict. The caller must not persist the file
 * unless `accepted` is true.
 */
export async function scanDocument(input: {
  buffer: Buffer;
  filename: string;
}): Promise<ScanVerdict> {
  const structural = inspectDocument(input.buffer, input.filename);
  const reasons = [...structural.reasons];
  const notes = [...structural.notes];

  // Size and emptiness are fatal; do not spend an external scan on them.
  if (reasons.length === 0 || structural.sizeBytes <= MAX_DOCUMENT_BYTES) {
    const external = await scanWithExternalEngine(input.buffer);
    if (external && !external.clean) {
      reasons.push(external.detail || "The file was rejected by the scanning service.");
    }
    if (!external) {
      notes.push("No external anti-malware engine is configured; only structural checks were applied.");
    }
    return {
      accepted: reasons.length === 0,
      kind: structural.kind,
      sha256: structural.sha256,
      sizeBytes: structural.sizeBytes,
      reasons: [...new Set(reasons)],
      notes: [...new Set(notes)],
      externallyScanned: external !== null,
    };
  }

  return {
    accepted: false,
    kind: structural.kind,
    sha256: structural.sha256,
    sizeBytes: structural.sizeBytes,
    reasons,
    notes,
    externallyScanned: false,
  };
}
