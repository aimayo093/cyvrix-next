import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getEmailIdentity, getServerSmtpConfig } from "@/lib/email-config";
import type { SecurityScanResult, SecurityCenterSettings } from "@/lib/security-scan";

function buildScanSummary(result: SecurityScanResult) {
  const failures = result.checks.filter((check) => check.status === "fail");
  const warnings = result.checks.filter((check) => check.status === "warn");
  const lines = [
    `CYVRIX Security Center completed an automatic background scan.`,
    "",
    `Overall status: ${result.overallStatus.toUpperCase()}`,
    `Security score: ${result.score}%`,
    `Duration: ${result.durationMs}ms`,
    `Timestamp: ${result.timestamp}`,
    "",
  ];

  if (failures.length) {
    lines.push("Failures:");
    for (const check of failures) {
      lines.push(`- ${check.label}: ${check.detail}`);
    }
    lines.push("");
  }

  if (warnings.length) {
    lines.push("Warnings:");
    for (const check of warnings) {
      lines.push(`- ${check.label}: ${check.detail}`);
    }
    lines.push("");
  }

  lines.push("Open the admin Security Center to review and re-run the scan.");
  return lines.join("\n");
}

async function getAdminRecipients(settings: SecurityCenterSettings, fallbackRecipients: string) {
  const configured = settings.adminAlertEmail;
  if (configured) return configured;

  if (fallbackRecipients) return fallbackRecipients;

  const admin = await prisma.user.findFirst({
    where: {
      active: true,
      role: { in: ["SUPER_ADMIN", "ADMIN"] },
    },
    orderBy: { createdAt: "asc" },
  }).catch(() => null);

  return admin?.email ?? "";
}

export async function createSecurityNotifications(result: SecurityScanResult) {
  const admins = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["SUPER_ADMIN", "ADMIN"] },
    },
    select: { id: true },
  }).catch(() => []);

  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: admin.id,
          title: result.overallStatus === "fail" ? "Security scan found issues" : "Security scan found warnings",
          body: `Security Center score ${result.score}%. Review the latest scan report.`,
        },
      }).catch(() => null),
    ),
  );
}

export async function sendSecurityAlertEmail(result: SecurityScanResult, settings: SecurityCenterSettings) {
  const identity = await getEmailIdentity("CYVRIX Security Center");
  const to = await getAdminRecipients(settings, identity.adminNotificationEmail);
  if (!to) {
    return { sent: false, reason: "No admin alert email configured." };
  }

  const smtp = getServerSmtpConfig();
  const subject = result.overallStatus === "fail"
    ? `CYVRIX Security Alert: scan failed (${result.score}%)`
    : `CYVRIX Security Warning: scan needs review (${result.score}%)`;
  const text = buildScanSummary(result);

  if (smtp) {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    });
    const from = identity.from || smtp.user;
    await transporter.sendMail({ from, to, subject, text });
    return { sent: true, reason: "SMTP alert sent." };
  }

  if (process.env.RESEND_API_KEY) {
    const from = process.env.MAIL_FROM ?? "CYVRIX Security Center <noreply@cyvrix.co.uk>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!response.ok) {
      return { sent: false, reason: `Resend returned ${response.status}.` };
    }
    return { sent: true, reason: "Resend alert sent." };
  }

  return { sent: false, reason: "No SMTP or Resend email transport configured." };
}

export async function recordSecurityAlertDelivery(result: SecurityScanResult, delivery: { sent: boolean; reason: string }) {
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      action: delivery.sent ? "SECURITY_SCAN_ALERT_SENT" : "SECURITY_SCAN_ALERT_SKIPPED",
      entityType: "SecurityCenter",
      entityId: result.trigger,
      metadata: {
        score: result.score,
        overallStatus: result.overallStatus,
        sent: delivery.sent,
        reason: delivery.reason,
      },
    },
  }).catch(() => null);
}
