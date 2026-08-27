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
import { canAccessClientRecord, type ClientViewer } from "@/lib/client-access";

/** A ticket is a client-owned record like any other; the viewer shape is shared. */
export type ThreadViewer = ClientViewer;

/**
 * Whether this person may see this ticket at all.
 *
 * The general rule lives in `client-access.ts` because the same guard governs
 * proposal acceptance, and the same mistake had been made in both.
 */
export const canAccessTicket = canAccessClientRecord;

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
