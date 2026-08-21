import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { companyFacts } from "@/lib/company-facts";
import { getEmailIdentity, getServerSmtpConfig } from "@/lib/email-config";

/**
 * Data subject rights requests under UK GDPR.
 *
 * A request has a statutory one-month deadline, so it must not depend on a
 * single delivery channel succeeding. Every request is written to the audit log
 * first; email to the Data Protection Officer is then attempted and its outcome
 * recorded. If email is unavailable the request is still on record and the
 * person is told it has been received rather than being asked to try again.
 *
 * Identity is deliberately NOT verified through this form. Asking an anonymous
 * submitter to upload identity documents would collect more personal data than
 * the request itself requires. Verification is handled separately, by replying
 * to the address given.
 */

export const PRIVACY_REQUEST_TYPES = [
  { value: "access", label: "Access a copy of my information", article: "Article 15" },
  { value: "rectification", label: "Correct information that is wrong or incomplete", article: "Article 16" },
  { value: "erasure", label: "Delete my information", article: "Article 17" },
  { value: "restriction", label: "Restrict how my information is used", article: "Article 18" },
  { value: "portability", label: "Transfer my information to another organisation", article: "Article 20" },
  { value: "objection", label: "Object to how my information is used", article: "Article 21" },
  { value: "withdraw-consent", label: "Withdraw consent I previously gave", article: "Article 7(3)" },
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number]["value"];

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return PRIVACY_REQUEST_TYPES.some((entry) => entry.value === value);
}

export function describeRequestType(value: string): string {
  const match = PRIVACY_REQUEST_TYPES.find((entry) => entry.value === value);
  return match ? `${match.label} (${match.article})` : value;
}

export type PrivacyRequestInput = {
  requestType: PrivacyRequestType;
  fullName: string;
  email: string;
  details: string;
  ipAddress: string;
};

export type PrivacyRequestOutcome = {
  reference: string;
  recorded: boolean;
  notified: boolean;
  notifyReason: string;
};

/** Short, human-quotable reference so a person can follow up on their request. */
function buildReference(): string {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `CYV-DSR-${stamp}-${random}`;
}

async function notifyDataProtectionOfficer(
  reference: string,
  input: PrivacyRequestInput
): Promise<{ sent: boolean; reason: string }> {
  const to = companyFacts.dataProtectionOfficerEmail;
  const identity = await getEmailIdentity("CYVRIX Privacy").catch(() => null);
  const from = identity?.from ?? null;

  const subject = `Data subject rights request ${reference}`;
  const text = [
    `A data subject rights request has been submitted through the CYVRIX website.`,
    ``,
    `Reference:     ${reference}`,
    `Request type:  ${describeRequestType(input.requestType)}`,
    `Name:          ${input.fullName}`,
    `Email:         ${input.email}`,
    `Received:      ${new Date().toISOString()}`,
    ``,
    `Details provided:`,
    input.details || "(none)",
    ``,
    `This request must be responded to within one month of receipt under UK GDPR.`,
    `Verify the requester's identity before disclosing any personal data.`,
  ].join("\n");

  const smtp = getServerSmtpConfig();
  if (smtp && from) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.password },
      });
      await transporter.sendMail({ from, to, subject, text });
      return { sent: true, reason: "Delivered by SMTP." };
    } catch (error) {
      console.warn("[privacy-request] SMTP delivery failed", error);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (response.ok) return { sent: true, reason: "Delivered by Resend." };
      return { sent: false, reason: "The email provider rejected the message." };
    } catch (error) {
      console.warn("[privacy-request] Resend delivery failed", error);
    }
  }

  return { sent: false, reason: "No email transport is configured." };
}

/**
 * Records a rights request and attempts to notify the Data Protection Officer.
 *
 * The audit-log entry is the authoritative record. Notification failure is
 * recorded rather than hidden, so an unnoticed transport outage cannot cause a
 * statutory deadline to be missed silently.
 */
export async function submitPrivacyRequest(
  input: PrivacyRequestInput
): Promise<PrivacyRequestOutcome> {
  const reference = buildReference();
  let recorded = false;

  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: null,
        action: "privacy.rights_request_received",
        entityType: "PrivacyRequest",
        entityId: reference,
        ipAddress: input.ipAddress.slice(0, 128),
        metadata: {
          reference,
          requestType: input.requestType,
          requestTypeLabel: describeRequestType(input.requestType),
          fullName: input.fullName,
          email: input.email,
          details: input.details.slice(0, 4000),
          receivedAt: new Date().toISOString(),
          statutoryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as never,
      },
    });
    recorded = true;
  } catch (error) {
    console.error("[privacy-request] failed to record request", error);
  }

  const delivery = await notifyDataProtectionOfficer(reference, input);

  if (recorded) {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: null,
          action: delivery.sent ? "privacy.rights_request_notified" : "privacy.rights_request_notify_failed",
          entityType: "PrivacyRequest",
          entityId: reference,
          ipAddress: input.ipAddress.slice(0, 128),
          metadata: { reference, reason: delivery.reason } as never,
        },
      });
    } catch {
      // The request itself is already on record; a missing delivery note is not fatal.
    }
  }

  return { reference, recorded, notified: delivery.sent, notifyReason: delivery.reason };
}
