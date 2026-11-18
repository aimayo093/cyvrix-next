import "server-only";
import type { Prisma } from "@/generated/prisma";
import type { prisma } from "@/lib/prisma";
import { addressVariants } from "./partnerships";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The supplier portal a package is addressed to: its destination is the
 * portal's address or its registration page, compared after normalising
 * (case of the host, a trailing slash). One lookup, shared by the standing
 * policy (requestApproval) and confirmed registrations
 * (recordExecutionOutcome), so the two cannot disagree.
 *
 * If two portals share that address, no portal is chosen: picking one could
 * apply the wrong portal's standing policy or record the account on the wrong
 * portal. `ambiguous` says so, for the audit log.
 *
 * Inside a transaction, the matched portal's row is locked and read again, so
 * a policy switched off or an address changed at the same moment is seen
 * before an approval or an account is written.
 */
export async function portalForDestination(tx: Db, destination: string, options: { lock?: boolean } = {}) {
  const variants = addressVariants(destination);
  if (!variants.length) return { portal: null, ambiguous: false } as const;
  const found = await tx.supplierPortal.findMany({ where: { OR: [{ url: { in: variants } }, { registrationUrl: { in: variants } }] }, select: { id: true }, take: 2 });
  if (found.length !== 1) return { portal: null, ambiguous: found.length > 1 } as const;
  if (options.lock) await tx.$queryRaw`SELECT 1 FROM "public"."SupplierPortal" WHERE "id" = ${found[0].id} FOR UPDATE`;
  const portal = await tx.supplierPortal.findUnique({ where: { id: found[0].id } });
  return portal ? ({ portal, ambiguous: false } as const) : ({ portal: null, ambiguous: false } as const);
}

/**
 * Another portal already using one of these addresses (in any of their
 * normalised forms), if any. Portals are kept unambiguous when saved, so a
 * destination always names one portal.
 */
export async function portalSharingAddress(tx: Db, addresses: (string | null)[], exceptId: string | null) {
  const list = addresses.flatMap((a) => (a ? addressVariants(a) : []));
  if (!list.length) return null;
  return tx.supplierPortal.findFirst({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      OR: [{ url: { in: list } }, { registrationUrl: { in: list } }],
    },
    select: { id: true, name: true },
  });
}
