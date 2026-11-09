/**
 * Which roles are internal, in one place.
 *
 * This list was written out twice — once in `lib/auth.ts` and once in
 * `middleware.ts`, the second carrying the comment "Must mirror ADMIN_ROLES in
 * lib/auth.ts". A mirror maintained by hand is a mirror that eventually
 * disagrees, and the two things it decides are who reaches `/admin` and who
 * sees a customer's internal notes. Neither is a good place to find out.
 *
 * Deliberately free of imports beyond the role type: `lib/auth.ts` is
 * `server-only` and pulls in Prisma, and both the edge middleware and the
 * access tests need this without either.
 */
import type { UserRole } from "@/generated/prisma";

export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT_AGENT",
  "SALES_CRM_USER",
  "CONTENT_MANAGER",
  "FINANCE_VIEWER",
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Who may open the Security Centre, run scans, and see the security posture
 * anywhere in the admin — including the Today dashboard's security card.
 */
export function canManageSecurityCenter(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
