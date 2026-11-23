/**
 * The compliance matrix (Phase 5): the requirements checklist as a
 * spreadsheet, one row per requirement with where it came from, its status and
 * the evidence that answers it. Built from what is recorded; nothing is
 * inferred. Pure, so it is tested without a database.
 */

export type MatrixRow = {
  ref: string | null;
  kind: string;
  text: string;
  status: string;
  source: string | null;
  location: string | null;
  evidence: string | null;
  evidenceCurrent: boolean | null;
  notes: string | null;
};

const HEADER = ["Reference", "Kind", "Requirement", "Status", "Source document", "Where in the source", "Evidence", "Evidence current", "Notes"];

/**
 * A CSV cell, quoted, with spreadsheet formula characters neutralised: a cell
 * starting with = + - @ (or a tab or carriage return) would run as a formula
 * when the file is opened, and requirement text is copied from buyers'
 * documents.
 */
export function csvCell(value: string | null | undefined): string {
  let v = (value ?? "").replace(/\r\n?/g, "\n");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function complianceMatrixCsv(rows: MatrixRow[]): string {
  const lines = [HEADER.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.ref,
        r.kind,
        r.text,
        r.status.replace(/_/g, " "),
        r.source,
        r.location,
        r.evidence,
        r.evidenceCurrent === null ? "" : r.evidenceCurrent ? "yes" : "no (lapsed or superseded)",
        r.notes,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  // A byte-order mark so spreadsheet programs read the text as UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}
