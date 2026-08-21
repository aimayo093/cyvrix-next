import "server-only";

import { prisma } from "@/lib/prisma";

type StoredEmailConfig = Record<string, unknown>;

export type StoredEmailIdentity = {
  defaultFromName: string;
  defaultFromEmail: string;
  adminNotificationEmail: string;
};

export type EmailIdentity = {
  from: string;
  adminNotificationEmail: string;
};

export type ServerSmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
};

const DEFAULT_FROM = "CYVRIX Technologies <noreply@cyvrix.co.uk>";
const EMAIL_ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function text(value: unknown, maxLength = 320) {
  return typeof value === "string"
    ? value.replace(/[\r\n]/g, " ").trim().slice(0, maxLength)
    : "";
}

function firstEnvironmentValue(...keys: string[]) {
  for (const key of keys) {
    const value = text(process.env[key], 2_000);
    if (value) return value;
  }
  return "";
}

function safeAddress(value: unknown) {
  const address = text(value);
  return EMAIL_ADDRESS.test(address) ? address : "";
}

export function normaliseEmailRecipients(value: unknown) {
  return text(value, 2_000)
    .split(/[;,]/)
    .map((recipient) => safeAddress(recipient))
    .filter(Boolean)
    .join(", ");
}

function fromAddress(name: string, address: string) {
  if (!address) return "";
  if (!name) return address;

  const escapedName = name.replace(/["\\]/g, "\\$&");
  return `"${escapedName}" <${address}>`;
}

export async function getStoredEmailIdentity(): Promise<StoredEmailIdentity> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "emailConfig" } }).catch(() => null);
  const config = (setting?.value && typeof setting.value === "object" ? setting.value : {}) as StoredEmailConfig;

  return {
    defaultFromName: text(config.defaultFromName, 160),
    defaultFromEmail: safeAddress(config.defaultFromEmail),
    adminNotificationEmail: normaliseEmailRecipients(config.adminNotificationEmail),
  };
}

export async function getEmailIdentity(fallbackName = "CYVRIX Support"): Promise<EmailIdentity> {
  const stored = await getStoredEmailIdentity();
  const configuredFrom = fromAddress(stored.defaultFromName || fallbackName, stored.defaultFromEmail);

  return {
    from: configuredFrom || firstEnvironmentValue("MAIL_FROM") || DEFAULT_FROM,
    adminNotificationEmail:
      stored.adminNotificationEmail || normaliseEmailRecipients(process.env.ADMIN_NOTIFICATION_EMAIL),
  };
}

export function getServerSmtpConfig(): ServerSmtpConfig | null {
  const host = firstEnvironmentValue("SMTP_HOST", "MAIL_HOST");
  const user = firstEnvironmentValue("SMTP_USER", "MAIL_USERNAME");
  const password = firstEnvironmentValue("SMTP_PASSWORD", "MAIL_PASSWORD");
  const suppliedPort = firstEnvironmentValue("SMTP_PORT", "MAIL_PORT") || "587";
  const port = Number.parseInt(suppliedPort, 10);

  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65_535) {
    return null;
  }

  return { host, port, user, password };
}
