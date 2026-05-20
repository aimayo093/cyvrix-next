/**
 * Edge-compatible session verification.
 * Uses the Web Crypto API (no Node.js built-ins) so it can run in
 * the Next.js proxy (Edge runtime) without the `server-only` restriction.
 *
 * The token format mirrors lib/auth.ts so both runtimes share the same cookies.
 * Format:  base64url(JSON payload) . base64url(HMAC-SHA256 signature)
 */

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SUPPORT_AGENT"
  | "SALES_CRM_USER"
  | "CONTENT_MANAGER"
  | "FINANCE_VIEWER"
  | "CLIENT_ADMIN"
  | "CLIENT_USER";

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
};

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "development-only-change-me"
  );
}

function base64urlDecode(str: string): Uint8Array {
  // Pad to multiple of 4
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function verifyHmac(
  key: CryptoKey,
  signature: Uint8Array,
  data: string
): Promise<boolean> {
  const enc = new TextEncoder();
  return crypto.subtle.verify("HMAC", key, signature as any, enc.encode(data));
}

/**
 * Verify a session token from a cookie value.
 * Returns the decoded payload on success, or null if invalid / expired.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, encodedSig] = token.split(".");
  if (!encodedPayload || !encodedSig) return null;

  try {
    const key = await importKey(getSecret());
    const signature = base64urlDecode(encodedSig);
    const valid = await verifyHmac(key, signature, encodedPayload);
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(
      base64urlDecode(encodedPayload)
    );
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
