/**
 * Who may read a support ticket, and how much of it.
 *
 * Separated from `ticket-thread.ts` so it can be tested without a database
 * connection — the same reason `secret-box.ts` and `recovery-codes.ts` are
 * importable outside a request. These two functions are the whole access rule
 * for support conversations, and a rule that cannot be exercised in isolation
 * is a rule nobody exercises.
 */
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@/generated/prisma";

export type ThreadViewer = {
  id: string;
  role: UserRole;
  clientCompanyId: string | null;
};

/**
 * Whether this person may see this ticket at all.
 *
 * Staff may see any ticket. A client may see one only when their company and
 * the ticket's company are **both set** and equal.
 *
 * "Both set" is the part that was missing. The previous check read
 * `ticket.clientCompanyId && ticket.clientCompanyId !== user.clientCompanyId`,
 * which skips the comparison entirely for a ticket with no company — and every
 * ticket raised through the public contact form has none. A portal user without
 * a company of their own could read those, and post replies into them.
 */
export function canAccessTicket(
  viewer: ThreadViewer,
  ticket: { clientCompanyId: string | null } | null
): boolean {
  if (!ticket) return false;
  if (isAdminRole(viewer.role)) return true;
  return Boolean(viewer.clientCompanyId) && ticket.clientCompanyId === viewer.clientCompanyId;
}

/**
 * Staff see internal notes. Clients see only what was addressed to them.
 *
 * The portal listed every message on a ticket with no filter at all, while the
 * admin's note form has a selector for exactly this distinction and defaults to
 * "Internal note" — so a private remark reaching the customer was the default
 * outcome rather than an unlucky one.
 */
export function visibilityFilterFor(viewer: ThreadViewer): { visibility?: string } {
  return isAdminRole(viewer.role) ? {} : { visibility: "client" };
}
