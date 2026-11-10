import type { UserRole } from "@/generated/prisma";
import { isAdminRole } from "@/lib/roles";

/**
 * The two rules a signed-in request is held to, kept pure so they are tested
 * directly (npm run test:appsec).
 */

/** A token stays valid only while the account's sessionVersion has not moved. Old tokens carry none: 0. */
export function sessionVersionMatches(tokenVersion: number | undefined, accountVersion: number): boolean {
  return (tokenVersion ?? 0) === accountVersion;
}

/** Staff accounts must have a second factor before they can use the admin. Clients are not required to. */
export function needsSecondFactor(role: UserRole, twoFactorEnrolledAt: Date | null): boolean {
  return isAdminRole(role) && !twoFactorEnrolledAt;
}
