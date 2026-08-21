/**
 * Verifies that lib/document-scan.ts rejects what it claims to reject.
 *
 * Run with: npm run test:scan
 *
 * These are the checks that stand between an anonymous CV upload and a member
 * of staff opening the file, so a regression here is a security regression.
 */
import { inspectDocument, MAX_DOCUMENT_BYTES } from "../lib/document-scan-checks";

type ZipEntry = { name: string; compressed?: number; uncompressed?: number };

const zip = (entries: ZipEntry[]) => {
  // Minimal ZIP with central-directory entries only (enough for the entry reader).
  const chunks = [Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0])];
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt32LE(e.compressed ?? 100, 20);
    head.writeUInt32LE(e.uncompressed ?? 200, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt16LE(0, 30);
    head.writeUInt16LE(0, 32);
    chunks.push(head, name);
  }
  return Buffer.concat(chunks);
};

const cases = [
  { name: "clean PDF", file: "cv.pdf", buf: Buffer.from("%PDF-1.7\nplain cv content\n%%EOF"), expect: true },
  { name: "PDF with JavaScript", file: "cv.pdf", buf: Buffer.from("%PDF-1.7\n/JavaScript (evil)\n%%EOF"), expect: false },
  { name: "PDF with OpenAction", file: "cv.pdf", buf: Buffer.from("%PDF-1.7\n/OpenAction 1 0 R\n%%EOF"), expect: false },
  { name: "PDF with Launch action", file: "cv.pdf", buf: Buffer.from("%PDF-1.7\n/Launch /F (cmd.exe)\n%%EOF"), expect: false },
  { name: "PDF with embedded file", file: "cv.pdf", buf: Buffer.from("%PDF-1.7\n/EmbeddedFile\n%%EOF"), expect: false },
  { name: "clean docx", file: "cv.docx", buf: zip([{ name: "word/document.xml" }, { name: "[Content_Types].xml" }]), expect: true },
  { name: "docx with macros", file: "cv.docx", buf: zip([{ name: "word/vbaProject.bin" }]), expect: false },
  { name: "docx with path traversal", file: "cv.docx", buf: zip([{ name: "../../etc/passwd" }]), expect: false },
  { name: "docx with embedded object", file: "cv.docx", buf: zip([{ name: "word/embeddings/oleObject1.bin" }]), expect: false },
  { name: "zip bomb ratio", file: "cv.docx", buf: zip([{ name: "word/document.xml", compressed: 100, uncompressed: 90000 }]), expect: false },
  { name: "windows executable", file: "cv.pdf", buf: Buffer.from("MZ\x90\x00this is a PE"), expect: false },
  { name: "linux executable", file: "cv.pdf", buf: Buffer.from("\x7fELF\x02\x01\x01"), expect: false },
  { name: "shell script", file: "cv.txt", buf: Buffer.from("#!/bin/sh\nrm -rf /"), expect: false },
  { name: "legacy .doc", file: "cv.doc", buf: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), expect: false },
  { name: "plain text CV", file: "cv.txt", buf: Buffer.from("Paul Iyangbe\nExperience: ...\n"), expect: true },
  { name: "text with NUL bytes", file: "cv.txt", buf: Buffer.from("hello\x00\x01binary"), expect: false },
  { name: "unrecognised type", file: "cv.pdf", buf: Buffer.from("GIF89a not a document"), expect: false },
  { name: "empty file", file: "cv.pdf", buf: Buffer.alloc(0), expect: false },
  { name: "oversize file", file: "cv.pdf", buf: Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(MAX_DOCUMENT_BYTES + 1)]), expect: false },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = inspectDocument(c.buf, c.file);
  const v = { accepted: r.reasons.length === 0, kind: r.kind, reasons: r.reasons };
  const ok = v.accepted === c.expect;
  if (ok) pass++; else fail++;
  console.log(
    `${ok ? "  PASS" : "  FAIL"}  ${c.name.padEnd(26)} accepted=${String(v.accepted).padEnd(5)} ` +
    `kind=${String(v.kind ?? "-").padEnd(5)} ${v.reasons[0] ? "| " + v.reasons[0].slice(0, 58) : ""}`
  );
}
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
