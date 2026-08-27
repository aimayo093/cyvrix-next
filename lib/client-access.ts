/**
 * Whether a signed-in person may reach a record belonging to a client company.
 *
 * One predicate, because the same mistake was made twice independently and both
 * times it looked correct:
 *
 *     if (!record || (record.clientCompanyId && record.clientCompanyId !== user.clientCompanyId))
 *
 * The `record.clientCompanyId &&` short-circuit skips the comparison entirely
 * when the record has no company — and records raised through the public forms
 * have none. A portal user without a company of their own then matched nothing
 * and was refused nothing. It guarded support tickets, and it guarded proposal
 * acceptance, where the consequence is a commercial commitment rather than a
 * message.
 *
 * The listing queries elsewhere got this right by writing
 * `clientCompanyId: user.clientCompanyId ?? "none"`, which is the same rule
 * expressed in a way that cannot short-circuit. This is that rule, once.
 *
 * No runtime imports beyond the role type, so it can be tested without a
 * database — the reason the previous version went unexercised.
 */
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@/generated/prisma";

export type ClientViewer = {
  id: string;
  role: UserRole;
  clientCompanyId: string | null;
};

/**
 * Staff may reach any client record. A client may reach one only when their
 * company and the record's company are **both set** and equal.
 */
export function canAccessClientRecord(
  viewer: ClientViewer,
  record: { clientCompanyId: string | null } | null | undefined
): boolean {
  if (!record) return false;
  if (isAdminRole(viewer.role)) return true;
  return Boolean(viewer.clientCompanyId) && record.clientCompanyId === viewer.clientCompanyId;
}
