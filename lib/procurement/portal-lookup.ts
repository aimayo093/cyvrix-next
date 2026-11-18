import "server-only";
import type { Prisma } from "@/generated/prisma";
import type { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export type PortalMatch<P> = { portal: P; ambiguous: false } | { portal: null; ambiguous: boolean };

/**
 * The supplier portal a package is addressed to: its destination is the
 * portal's address or its registration page. One lookup, shared by the
 * standing policy (requestApproval) and confirmed registrations
 * (recordExecutionOutcome), so the two cannot disagree.
 *
 * If two portals share that address, no portal is chosen: picking one could
 * apply the wrong portal's standing policy or record the account on the wrong
 * portal. `ambiguous` says so, for the audit log.
 */
export async function portalForDestination(tx: Db, destination: string) {
  const d = destination.trim();
  if (!d) return { portal: null, ambiguous: false } as const;
  const found = await tx.supplierPortal.findMany({ where: { OR: [{ url: d }, { registrationUrl: d }] }, take: 2 });
  if (found.length === 1) return { portal: found[0], ambiguous: false } as const;
  return { portal: null, ambiguous: found.length > 1 } as const;
}

/**
 * Another portal already using one of these addresses, if any. Portals are
 * kept unambiguous when saved, so a destination always names one portal.
 */
export async function portalSharingAddress(tx: Db, addresses: (string | null)[], exceptId: string | null) {
  const list = addresses.filter((a): a is string => !!a && a.trim() !== "").map((a) => a.trim());
  if (!list.length) return null;
  return tx.supplierPortal.findFirst({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      OR: [{ url: { in: list } }, { registrationUrl: { in: list } }],
    },
    select: { id: true, name: true },
  });
}
