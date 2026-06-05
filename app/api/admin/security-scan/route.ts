import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startTime = Date.now();
  const checks: { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }[] = [];

  // ── 1. Database connectivity ───────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ id: "db", label: "Database Connectivity", status: "pass", detail: "Supabase/Postgres is reachable." });
  } catch {
    checks.push({ id: "db", label: "Database Connectivity", status: "fail", detail: "Cannot reach the database." });
  }

  // ── 2. Audit log health ────────────────────────────────────────────────────
  try {
    const logCount = await prisma.auditLog.count();
    checks.push({
      id: "audit",
      label: "Audit Logging",
      status: "pass",
      detail: `Audit log active — ${logCount.toLocaleString()} entries recorded.`,
    });
  } catch {
    checks.push({ id: "audit", label: "Audit Logging", status: "warn", detail: "Unable to query audit log." });
  }

  // ── 3. Open support tickets ────────────────────────────────────────────────
  try {
    const openTickets = await prisma.ticket.count({ where: { status: { not: "CLOSED" } } });
    checks.push({
      id: "tickets",
      label: "Open Support Tickets",
      status: openTickets > 20 ? "warn" : "pass",
      detail: openTickets === 0 ? "No open tickets." : `${openTickets} open ticket${openTickets > 1 ? "s" : ""} in the queue.`,
    });
  } catch {
    checks.push({ id: "tickets", label: "Open Support Tickets", status: "warn", detail: "Could not fetch ticket data." });
  }

  // ── 4. Compliance cards visibility check ──────────────────────────────────
  try {
    const hidden = await prisma.complianceCard.count({ where: { isVisible: false } });
    const total = await prisma.complianceCard.count();
    checks.push({
      id: "compliance",
      label: "Compliance Cards",
      status: total === 0 ? "warn" : "pass",
      detail:
        total === 0
          ? "No compliance cards configured."
          : `${total - hidden} of ${total} compliance card${total > 1 ? "s" : ""} are visible.`,
    });
  } catch {
    checks.push({ id: "compliance", label: "Compliance Cards", status: "warn", detail: "Could not query compliance cards." });
  }

  // ── 5. Media assets orphan check ──────────────────────────────────────────
  try {
    const assets = await prisma.mediaAsset.count();
    checks.push({
      id: "media",
      label: "Media Asset Store",
      status: "pass",
      detail: `${assets.toLocaleString()} asset${assets !== 1 ? "s" : ""} stored in the CMS media library.`,
    });
  } catch {
    checks.push({ id: "media", label: "Media Asset Store", status: "warn", detail: "Could not query media assets." });
  }

  // ── 6. Environment variables ───────────────────────────────────────────────
  const requiredEnv = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXT_PUBLIC_SUPABASE_URL"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  checks.push({
    id: "env",
    label: "Environment Variables",
    status: missingEnv.length === 0 ? "pass" : "fail",
    detail: missingEnv.length === 0 ? "All required environment variables are set." : `Missing: ${missingEnv.join(", ")}`,
  });

  // ── 7. Newsletter subscribers ─────────────────────────────────────────────
  try {
    const subs = await prisma.newsletterSubscriber.count({ where: { status: "subscribed" } });
    checks.push({
      id: "newsletter",
      label: "Newsletter Subscribers",
      status: "pass",
      detail: `${subs.toLocaleString()} active subscriber${subs !== 1 ? "s" : ""}.`,
    });
  } catch {
    checks.push({ id: "newsletter", label: "Newsletter Subscribers", status: "warn", detail: "Could not fetch subscriber count." });
  }

  // ── Compute overall score ──────────────────────────────────────────────────
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const score = Math.round((passCount / checks.length) * 100);

  const overallStatus: "pass" | "warn" | "fail" =
    failCount > 0 ? "fail" : score < 80 ? "warn" : "pass";

  // ── Write scan result to audit log ────────────────────────────────────────
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: "SECURITY_SCAN_RUN",
        entityType: "System",
        entityId: "dashboard",
        metadata: JSON.stringify({ score, checks: checks.length, passCount, failCount }),
      },
    });
  } catch {
    /* Non-critical — don't block result */
  }

  return NextResponse.json({
    score,
    overallStatus,
    checks,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
}
