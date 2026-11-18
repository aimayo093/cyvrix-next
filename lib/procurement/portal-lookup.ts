import "server-only";
import type { Prisma } from "@/generated/prisma";
import type { prisma } from "@/lib/prisma";

/**
 * The supplier portal a package is addressed to: its destination is the
 * portal's address or its registration page. One lookup, shared by the
 * standing policy (requestApproval) and confirmed registrations
 * (recordExecutionOutcome), so the two cannot disagree.
 */
export async function portalForDestination(tx: Prisma.TransactionClient | typeof prisma, destination: string) {
  const d = destination.trim();
  if (!d) return null;
  return tx.supplierPortal.findFirst({ where: { OR: [{ url: d }, { registrationUrl: d }] } });
}
