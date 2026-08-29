/**
 * One way to send an email.
 *
 * There were four, and they disagreed. Security alerts, surveys and privacy
 * requests each tried SMTP and then fell back to Resend; email verification
 * accepted SMTP alone. So with a Resend key configured and no SMTP — which is
 * what this deployment has — alerts and surveys sent perfectly while
 * "Send me a confirmation link" reported *"No email transport is configured"*.
 *
 * The message was not a lie from where it stood. A transport was configured;
 * that path simply did not know about it, and the administrator was sent to a
 * Settings page that has no transport fields to fix it with.
 *
 * This is the shared decision. Callers say what to send, not how.
 */
import nodemailer from "nodemailer";
import { getEmailIdentity, getServerSmtpConfig } from "@/lib/email-config";

export type Transport = "smtp" | "resend";

export type SendResult =
  | { sent: true; transport: Transport }
  | { sent: false; reason: "no_transport" | "send_failed"; detail: string };

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  text: string;
  /** Overrides the configured identity. Rarely wanted. */
  from?: string;
};

/** Which transports are usable, most-preferred first. */
export function availableTransports(): Transport[] {
  const transports: Transport[] = [];
  // SMTP first where present: it sends from the organisation's own mail server,
  // which keeps delivery under the same DNS reputation as the rest of its mail.
  if (getServerSmtpConfig()) transports.push("smtp");
  if (process.env.RESEND_API_KEY) transports.push("resend");
  return transports;
}

/**
 * Send, trying each configured transport in turn.
 *
 * A failure on one is not the end: an SMTP server that is refusing connections
 * should not stop a verification link going out when an API transport is also
 * configured. The result names which one succeeded, so a log can say.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const transports = availableTransports();

  if (transports.length === 0) {
    return {
      sent: false,
      reason: "no_transport",
      // Names the variables and where they live. "Set this up in Settings" sent
      // an administrator to a page that cannot set any of them.
      detail:
        "No email transport is configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD, " +
        "or RESEND_API_KEY, in the deployment's environment variables.",
    };
  }

  const identity = await getEmailIdentity("CYVRIX");
  const from = email.from ?? identity.from;
  const recipients = Array.isArray(email.to) ? email.to : [email.to];
  const failures: string[] = [];

  for (const transport of transports) {
    try {
      if (transport === "smtp") {
        const smtp = getServerSmtpConfig()!;
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          // 465 is implicit TLS; 587 upgrades with STARTTLS. Sending in the
          // clear on 465 would fail rather than downgrade, which is right.
          secure: smtp.port === 465,
          auth: { user: smtp.user, pass: smtp.password },
        });
        await transporter.sendMail({ from, to: recipients.join(", "), subject: email.subject, text: email.text });
        return { sent: true, transport };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: recipients, subject: email.subject, text: email.text }),
      });

      if (response.ok) return { sent: true, transport };
      // The status, not the body. A provider error body can echo the recipient
      // address, and this detail reaches an administrator's screen.
      failures.push(`resend returned ${response.status}`);
    } catch (error) {
      failures.push(`${transport} failed (${error instanceof Error ? error.name : "unknown"})`);
    }
  }

  return {
    sent: false,
    reason: "send_failed",
    detail: `Tried ${transports.join(" then ")}: ${failures.join("; ")}.`,
  };
}
