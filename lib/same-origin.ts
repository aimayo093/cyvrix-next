/**
 * Refusing a state-changing request that came from somebody else's page.
 *
 * The session cookie is `SameSite=Lax`, which already stops a browser attaching
 * it to a cross-site POST — so the authenticated routes were not exploitable.
 * That is a mitigation held one layer away from the route, though, and it
 * covers only the cookie: it says nothing about a public form endpoint, and it
 * would quietly stop covering anything if the cookie policy ever changed.
 *
 * This is the check at the route, where it can be read.
 *
 * `Sec-Fetch-Site` is the one that actually holds. Browsers set it and script
 * cannot forge it, so a request that says `cross-site` is telling the truth
 * about itself. `Origin` is the fallback for clients that do not send it, and
 * both are absent for a server-to-server call — which is why a missing header
 * is allowed rather than refused. Refusing it would break every legitimate
 * non-browser caller to stop an attack that needs a browser.
 */

export type OriginVerdict = { ok: true } | { ok: false; reason: string };

export function checkSameOrigin(request: Request): OriginVerdict {
  const site = request.headers.get("sec-fetch-site");

  // "none" is a direct navigation — the user typed it or opened a bookmark.
  // "same-origin" and "same-site" are our own pages.
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    return { ok: false, reason: `Request originated ${site}.` };
  }

  const origin = request.headers.get("origin");
  if (!origin) return { ok: true };

  const host = request.headers.get("host");
  if (!host) return { ok: false, reason: "The request carried an Origin but no Host." };

  try {
    if (new URL(origin).host !== host) {
      return { ok: false, reason: "The Origin header does not match the host." };
    }
  } catch {
    return { ok: false, reason: "The Origin header is not a URL." };
  }

  return { ok: true };
}

/** A 403 shaped like the rest of the API's errors, or null when the request is fine. */
export function rejectCrossOrigin(request: Request): Response | null {
  const verdict = checkSameOrigin(request);
  if (verdict.ok) return null;

  return new Response(
    JSON.stringify({
      error: "This request was not made from a CYVRIX page and was refused.",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}
