/**
 * Reading the result of `audit_log_verify()`, the database function that walks
 * the audit log's hash chain (migration 20261111000000).
 *
 * Pure, so the wording can be tested without a database.
 */
import type { SecurityScanCheck } from "@/lib/security-scan";

export type AuditChainRow = {
  checked: bigint | number | null;
  firstBadSeq: bigint | number | null;
  problem: string | null;
  headSeq: bigint | number | null;
  headHash: string | null;
};

const num = (value: bigint | number | null | undefined) => (value === null || value === undefined ? null : Number(value));

export function auditChainCheck(row: AuditChainRow | null | undefined): SecurityScanCheck {
  const base = { id: "audit_chain", label: "Audit Log Integrity", category: "security" as const };
  if (!row) {
    return { ...base, status: "warn", assessed: false, detail: "The audit log's integrity check returned nothing, so the chain was not verified on this run." };
  }
  const checked = num(row.checked) ?? 0;
  const bad = num(row.firstBadSeq);
  if (row.problem || bad !== null) {
    const where = bad !== null ? ` at entry ${bad.toLocaleString("en-GB")}` : "";
    return {
      ...base,
      status: "fail",
      detail: `The audit log's hash chain is broken${where}: ${row.problem ?? "the entry does not match its hash"}. ` +
        `${checked.toLocaleString("en-GB")} earlier entries verified. Entries cannot be edited or deleted through the app, so this means someone changed the database directly.`,
    };
  }
  const head = row.headHash ? ` Latest fingerprint ${row.headHash.slice(0, 16)}.` : "";
  return {
    ...base,
    status: "pass",
    detail: `All ${checked.toLocaleString("en-GB")} audit entries verified against their hash chain; none was changed or removed after it was written.${head}`,
  };
}

/** The check when the verify function does not exist yet (migration not applied). */
export function auditChainNotSetUp(): SecurityScanCheck {
  return {
    id: "audit_chain",
    label: "Audit Log Integrity",
    category: "security",
    status: "warn",
    assessed: false,
    detail: "The audit log's hash chain is not set up in this database yet (migration 20261111000000_tamper_evident_audit_log), so integrity was not verified.",
  };
}
