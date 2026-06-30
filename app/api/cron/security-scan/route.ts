import { NextResponse } from "next/server";
import {
  getSecurityCenterSettings,
  runSecurityScan,
  shouldNotifyForScan,
} from "@/lib/security-scan";
import {
  createSecurityNotifications,
  recordSecurityAlertDelivery,
  sendSecurityAlertEmail,
} from "@/lib/security-alerts";

function isAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getRequestOrigin(req: Request) {
  const url = new URL(req.url);
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) {
    return configured.startsWith("http") ? configured.replace(/\/+$/, "") : `https://${configured.replace(/\/+$/, "")}`;
  }
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSecurityCenterSettings();
  if (!settings.automaticScanEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Automatic scans are disabled." });
  }

  const result = await runSecurityScan({
    requestOrigin: getRequestOrigin(req),
    trigger: "background",
    settings,
  });

  let alertDelivery = { sent: false, reason: "No alert required." };
  if (shouldNotifyForScan(result, settings)) {
    await createSecurityNotifications(result);
    alertDelivery = await sendSecurityAlertEmail(result, settings);
    await recordSecurityAlertDelivery(result, alertDelivery);
  }

  return NextResponse.json({
    ok: true,
    score: result.score,
    overallStatus: result.overallStatus,
    checks: result.checks.length,
    alert: alertDelivery,
  });
}
