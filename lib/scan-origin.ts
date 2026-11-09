/**
 * The base URL a security scan probes.
 *
 * The configured site URL wins, so the destination of the scan's outbound
 * requests is chosen by whoever deploys the site rather than by the Host header
 * of whoever triggers it. The request's own origin is only a fallback for a
 * deployment with no site URL configured (local development, previews).
 */
export function scanOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) {
    const trimmed = configured.replace(/\/+$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
