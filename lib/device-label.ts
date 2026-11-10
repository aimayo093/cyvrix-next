/**
 * A short, readable name for a device from its user-agent string, such as
 * "Chrome on Windows" or "Safari on iPhone". Deliberately coarse: enough to
 * recognise your own laptop, not a fingerprint. Unknown parts read "Unknown".
 */
export function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;

  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser\//.test(ua) ? "Samsung Internet"
    : /Firefox\/|FxiOS\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) && /Version\//.test(ua) ? "Safari"
    : /curl\/|python-requests|node-fetch|undici/i.test(ua) ? "Script"
    : "Unknown browser";

  const system =
    /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Windows NT/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Linux/.test(ua) ? "Linux"
    : "unknown system";

  return `${browser} on ${system}`;
}
