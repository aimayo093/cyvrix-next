import crypto from "node:crypto";

/**
 * Pre-acceptance scanning for documents uploaded through public forms.
 *
 * A CV is an untrusted file from an anonymous submitter that a member of staff
 * will later open. Everything here runs BEFORE the file is stored, and a file
 * that fails any check is never persisted and never reaches an administrator.
 *
 * The checks are real inspections of the byte content, not a progress bar:
 *
 *  - the declared type must match the actual file signature;
 *  - PDFs are rejected when they contain the active-content constructs used to
 *    weaponise them (embedded JavaScript, auto-run actions, launch actions,
 *    embedded files);
 *  - Office documents are ZIP containers, so they are inspected for macro
 *    payloads, path traversal in entry names, and compression-ratio abuse;
 *  - obvious script and executable content is rejected outright.
 *
 * This module holds the pure byte-inspection logic so it can be unit tested
 * without a server context. `lib/document-scan.ts` adds the external
 * anti-malware integration on top.
 */

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export type DocumentKind = "pdf" | "docx" | "doc" | "odt" | "rtf" | "txt";

export type ScanVerdict = {
  accepted: boolean;
  /** Detected kind, present only when the signature was recognised. */
  kind?: DocumentKind;
  /** SHA-256 of the file, recorded so a stored document can be matched to its scan. */
  sha256: string;
  sizeBytes: number;
  /** Reasons the file was rejected. Empty when accepted. */
  reasons: string[];
  /** Non-blocking observations worth recording. */
  notes: string[];
  /** Whether an external anti-malware engine verified the file. */
  externallyScanned: boolean;
};

type Signature = { kind: DocumentKind; bytes: number[]; offset?: number };

const SIGNATURES: Signature[] = [
  { kind: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { kind: "docx", bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP container (docx/odt)
  { kind: "doc", bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // OLE2
  { kind: "rtf", bytes: [0x7b, 0x5c, 0x72, 0x74, 0x66] }, // {\rtf
];

/** Extensions accepted from the public careers form. */
export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt"] as const;

function matches(buffer: Buffer, signature: Signature): boolean {
  const offset = signature.offset ?? 0;
  if (buffer.length < offset + signature.bytes.length) return false;
  return signature.bytes.every((byte, index) => buffer[offset + index] === byte);
}

function detectKind(buffer: Buffer, filename: string): DocumentKind | undefined {
  for (const signature of SIGNATURES) {
    if (matches(buffer, signature)) {
      // A ZIP container is docx or odt; the extension disambiguates.
      if (signature.kind === "docx" && filename.toLowerCase().endsWith(".odt")) return "odt";
      return signature.kind;
    }
  }
  // Plain text has no signature. Accept only if it is valid UTF-8 without control bytes.
  if (filename.toLowerCase().endsWith(".txt") && isPlainText(buffer)) return "txt";
  return undefined;
}

function isPlainText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    // Allow tab, newline, carriage return; reject other control characters and NUL.
    if (byte === 0) return false;
    if (byte < 0x09) return false;
    if (byte > 0x0d && byte < 0x20) return false;
  }
  return true;
}

/** Active-content constructs that have no place in a CV. */
const PDF_ACTIVE_CONTENT: Array<{ token: string; reason: string }> = [
  { token: "/JavaScript", reason: "The PDF contains embedded JavaScript." },
  { token: "/JS", reason: "The PDF contains a JavaScript action." },
  { token: "/OpenAction", reason: "The PDF runs an action automatically when opened." },
  { token: "/AA", reason: "The PDF contains an automatic additional action." },
  { token: "/Launch", reason: "The PDF contains a launch action that can start another program." },
  { token: "/EmbeddedFile", reason: "The PDF contains an embedded file attachment." },
  { token: "/RichMedia", reason: "The PDF contains embedded rich media." },
  { token: "/XFA", reason: "The PDF uses an XFA form, which can carry active content." },
];

function scanPdf(buffer: Buffer): string[] {
  const reasons: string[] = [];
  // Latin-1 keeps byte offsets stable, so token matching is not affected by decoding.
  const text = buffer.toString("latin1");

  for (const { token, reason } of PDF_ACTIVE_CONTENT) {
    if (text.includes(token)) reasons.push(reason);
  }
  return reasons;
}

/**
 * Reads ZIP central-directory entries without inflating them, so a malicious
 * archive cannot exhaust memory during inspection.
 */
function readZipEntries(buffer: Buffer): Array<{ name: string; compressed: number; uncompressed: number }> {
  const entries: Array<{ name: string; compressed: number; uncompressed: number }> = [];
  const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]); // central directory header

  let index = buffer.indexOf(signature);
  let guard = 0;
  while (index !== -1 && guard < 2048) {
    guard += 1;
    if (index + 46 > buffer.length) break;

    const compressed = buffer.readUInt32LE(index + 20);
    const uncompressed = buffer.readUInt32LE(index + 24);
    const nameLength = buffer.readUInt16LE(index + 28);
    const extraLength = buffer.readUInt16LE(index + 30);
    const commentLength = buffer.readUInt16LE(index + 32);

    const nameStart = index + 46;
    if (nameStart + nameLength > buffer.length) break;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    entries.push({ name, compressed, uncompressed });

    index = buffer.indexOf(signature, nameStart + nameLength + extraLength + commentLength);
  }

  return entries;
}

function scanZipDocument(buffer: Buffer): { reasons: string[]; notes: string[] } {
  const reasons: string[] = [];
  const notes: string[] = [];
  const entries = readZipEntries(buffer);

  if (entries.length === 0) {
    reasons.push("The document container could not be read.");
    return { reasons, notes };
  }

  let totalCompressed = 0;
  let totalUncompressed = 0;

  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    totalCompressed += entry.compressed;
    totalUncompressed += entry.uncompressed;

    // Macro payloads.
    if (name.includes("vbaproject") || name.endsWith(".bin") && name.includes("vba")) {
      reasons.push("The document contains a macro project.");
    }
    if (name.includes("macros/") || name.includes("_vba_project")) {
      reasons.push("The document contains macro content.");
    }
    // Entry names that would escape the extraction directory.
    if (name.includes("../") || name.startsWith("/") || /^[a-z]:\\/i.test(entry.name)) {
      reasons.push("The document contains an unsafe internal file path.");
    }
    // OLE objects can embed executables.
    if (name.includes("embeddings/") || name.includes("oleobject")) {
      reasons.push("The document contains an embedded object.");
    }
    // External relationship targets used for template injection.
    if (name.endsWith("settings.xml.rels") || name.endsWith("document.xml.rels")) {
      notes.push("The document declares external relationships, which were not followed.");
    }
  }

  // Compression-ratio abuse (zip bomb).
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > 200) {
    reasons.push("The document expands to a disproportionate size when opened.");
  }
  if (totalUncompressed > 80 * 1024 * 1024) {
    reasons.push("The document expands beyond the permitted size.");
  }

  return { reasons, notes: [...new Set(notes)] };
}

/** Content that should never appear in a submitted document. */
function scanUniversal(buffer: Buffer): string[] {
  const reasons: string[] = [];
  const head = buffer.subarray(0, 4).toString("latin1");

  if (head.startsWith("MZ")) reasons.push("The file is a Windows executable.");
  if (head.startsWith("\x7fELF")) reasons.push("The file is a Linux executable.");
  if (head.startsWith("#!")) reasons.push("The file is a script.");

  return reasons;
}


/** Result of the structural checks, before any external engine runs. */
export type StructuralResult = {
  kind?: DocumentKind;
  sha256: string;
  sizeBytes: number;
  reasons: string[];
  notes: string[];
};

/**
 * Runs every structural check against the file. Pure and synchronous, so it is
 * directly testable; see scripts/test-document-scan.mts.
 */
export function inspectDocument(buffer: Buffer, filename: string): StructuralResult {
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const reasons: string[] = [];
  const notes: string[] = [];

  if (buffer.length === 0) {
    return { sha256, sizeBytes: 0, reasons: ["The file is empty."], notes };
  }
  if (buffer.length > MAX_DOCUMENT_BYTES) {
    return {
      sha256,
      sizeBytes: buffer.length,
      reasons: [`The file is larger than ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))}MB.`],
      notes,
    };
  }

  reasons.push(...scanUniversal(buffer));

  const kind = detectKind(buffer, filename);
  if (!kind) {
    reasons.push("The file is not a recognised document. Accepted formats are PDF, Word, OpenDocument, RTF and plain text.");
  } else if (kind === "pdf") {
    reasons.push(...scanPdf(buffer));
  } else if (kind === "docx" || kind === "odt") {
    const zipResult = scanZipDocument(buffer);
    reasons.push(...zipResult.reasons);
    notes.push(...zipResult.notes);
  } else if (kind === "doc") {
    // Legacy OLE2 documents cannot be inspected reliably and are the classic
    // macro-malware carrier, so they are not accepted.
    reasons.push("Legacy .doc files are not accepted. Please supply a PDF or .docx.");
  }

  return { kind, sha256, sizeBytes: buffer.length, reasons: [...new Set(reasons)], notes: [...new Set(notes)] };
}
