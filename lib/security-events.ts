import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Authentication events the Security Centre reports on. */
export const AUTH_EVENT_ACTIONS = [
  "auth.sign_in_failed",
  "auth.sign_in_succeeded",
  "auth.sign_in_throttled",
] as const;

export type AuthEventAction = (typeof AUTH_EVENT_ACTIONS)[number];

type AuthEventInput = {
  action: AuthEventAction;
  userId: string | null;
  ipAddress: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an authentication event to the audit log.
 *
 * Deliberately never throws: sign-in must not fail because telemetry could not
 * be written. Never records a password, password hash or session token — only
 * a coarse reason code, the account role where known, and the source address.
 */
export async function recordAuthEvent(event: AuthEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: event.userId,
        action: event.action,
        entityType: "Auth",
        entityId: event.userId,
        ipAddress: event.ipAddress.slice(0, 128),
        metadata: (event.metadata ?? {}) as never,
      },
    });
  } catch (error) {
    console.warn("[security-events] failed to record auth event", error);
  }
}

export type AuthActivitySummary = {
  /** True when the audit log could be read. Everything below is meaningless if false. */
  available: boolean;
  windowHours: number;
  failedSignIns: number;
  throttledSignIns: number;
  successfulSignIns: number;
  /** Distinct source addresses responsible for failed attempts. */
  distinctFailureSources: number;
  /** Highest number of failures from any single source address. */
  topSourceFailures: number;
};

/**
 * Reads real authentication activity from the audit log. Returns
 * `available: false` rather than zeros when the log cannot be queried, so the
 * Security Centre never presents an absence of data as an absence of risk.
 */
export async function getAuthActivity(windowHours = 24): Promise<AuthActivitySummary> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const empty: AuthActivitySummary = {
    available: false,
    windowHours,
    failedSignIns: 0,
    throttledSignIns: 0,
    successfulSignIns: 0,
    distinctFailureSources: 0,
    topSourceFailures: 0,
  };

  try {
    const events = await prisma.auditLog.findMany({
      where: {
        action: { in: [...AUTH_EVENT_ACTIONS] },
        createdAt: { gte: since },
      },
      select: { action: true, ipAddress: true },
      take: 5000,
    });

    const failureCounts = new Map<string, number>();
    let failed = 0;
    let throttled = 0;
    let succeeded = 0;

    for (const event of events) {
      if (event.action === "auth.sign_in_failed") {
        failed += 1;
        const source = event.ipAddress ?? "unknown";
        failureCounts.set(source, (failureCounts.get(source) ?? 0) + 1);
      } else if (event.action === "auth.sign_in_throttled") {
        throttled += 1;
      } else if (event.action === "auth.sign_in_succeeded") {
        succeeded += 1;
      }
    }

    return {
      available: true,
      windowHours,
      failedSignIns: failed,
      throttledSignIns: throttled,
      successfulSignIns: succeeded,
      distinctFailureSources: failureCounts.size,
      topSourceFailures: failureCounts.size ? Math.max(...failureCounts.values()) : 0,
    };
  } catch (error) {
    console.warn("[security-events] failed to read auth activity", error);
    return empty;
  }
}
