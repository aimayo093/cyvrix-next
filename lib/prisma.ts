import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

/**
 * Pool limits, because the database is reached through Supabase's session-mode
 * pooler on port 5432, which accepts 15 clients in total.
 *
 * Nothing here shares that budget sensibly on its own: a production build runs
 * fifteen static-generation workers, and each serverless instance opens its own
 * pool. Left unbounded, the sixteenth connection request does not fail, it
 * waits — which is how an admin page ends up hanging on a grey skeleton rather
 * than showing an error.
 *
 *   max                     each instance holds at most three connections
 *   connectionTimeoutMillis a starved request fails in ten seconds
 *   idleTimeoutMillis       connections go back to the pooler quickly
 *
 * The real fix is the transaction-mode pooler on port 6543 with
 * `?pgbouncer=true`, which is environment configuration rather than code.
 * These limits make the current setup fail fast instead of hanging.
 */
const adapter = new PrismaPg({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
});

function createClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // The audit log's hash-chain columns are the database's business: set by a
    // trigger, checked by audit_log_verify(). Leaving them out of every query
    // keeps a BigInt out of pages and caches that never asked for it.
    omit: { auditLog: { seq: true, prevHash: true, hash: true } },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
