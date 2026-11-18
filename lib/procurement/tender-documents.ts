/**
 * Phase 4: tender documents published with a notice (OCDS tender.documents).
 * Pure, so it is tested without network or database
 * (npm run test:procurement-tender).
 *
 * The site downloads a copy only from the official notice services listed in
 * ALLOWED_DOCUMENT_HOSTS, over HTTPS, following at most three redirects that
 * stay on that list. Buyers' own e-tendering portals usually need a sign-in
 * (D7: the site never holds portal passwords; D8: people use portals by hand),
 * so those links are listed for the founder to open and download, then upload.
 * Adding a host is a code change, reviewed like any other.
 */

export const ALLOWED_DOCUMENT_HOSTS = [
  "www.find-tender.service.gov.uk",
  "www.contractsfinder.service.gov.uk",
  "www.publiccontractsscotland.gov.uk",
  "www.sell2wales.gov.wales",
  "etendersni.gov.uk",
  "www.etendersni.gov.uk",
] as const;

/** The document scanner's own limit (lib/document-scan-checks.ts); a larger file would be refused anyway. */
export const MAX_FETCH_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT = "CYVRIX procurement documents (+https://cyvrix.co.uk)";
export const MAX_REDIRECTS = 3;
export const MAX_DOCUMENTS_PER_NOTICE = 50;

export type NoticeDocument = { url: string; title: string; documentType: string | null; format: string | null };

/** Why a link cannot be fetched by the site, or null when it can. */
export function fetchRefusal(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "That is not a valid address.";
  }
  if (url.protocol !== "https:") return "Only HTTPS links are fetched.";
  if (url.username || url.password) return "Links with sign-in details are not fetched.";
  if (url.port && url.port !== "443") return "Links on a non-standard port are not fetched.";
  if (!(ALLOWED_DOCUMENT_HOSTS as readonly string[]).includes(url.hostname.toLowerCase())) {
    return `${url.hostname} is not an official notice service. Open the link, download the file yourself and upload it.`;
  }
  return null;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * The documents listed across a notice's releases, newest release first, one
 * per address. Only absolute HTTPS or HTTP links are kept (HTTP ones are
 * listed but refused for fetching).
 */
export function noticeDocuments(releases: unknown[]): NoticeDocument[] {
  const seen = new Set<string>();
  const out: NoticeDocument[] = [];
  for (const release of releases) {
    const docs = (release as { tender?: { documents?: unknown } })?.tender?.documents;
    if (!Array.isArray(docs)) continue;
    for (const d of docs) {
      const url = str((d as { url?: unknown })?.url, 2000);
      if (!url || !/^https?:\/\//i.test(url)) continue;
      let key: string;
      try {
        key = new URL(url).toString();
      } catch {
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        url: key,
        title: str((d as { title?: unknown }).title, 300) ?? str((d as { description?: unknown }).description, 300) ?? "Tender document",
        documentType: str((d as { documentType?: unknown }).documentType, 80),
        format: str((d as { format?: unknown }).format, 120),
      });
      if (out.length >= MAX_DOCUMENTS_PER_NOTICE) return out;
    }
  }
  return out;
}

export type Fetched = { ok: true; buffer: Buffer; finalUrl: string; filename: string } | { ok: false; reason: string };
type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** A filename from Content-Disposition or the address, made safe to store. */
export function safeFilename(disposition: string | null, url: string): string {
  const fromHeader = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  let name = fromHeader ? decodeURIComponentSafe(fromHeader) : decodeURIComponentSafe(new URL(url).pathname.split("/").pop() ?? "");
  name = name.replace(/[^\w.\- ]+/g, "_").replace(/^[.\s]+/, "").slice(0, 120);
  return name || "tender-document";
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const TYPE_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "text/plain": "txt",
};

/**
 * A filename with no extension gets one from the response's content type, so
 * the scanner (which decides plain text by its .txt name) can recognise it.
 * A name that already has an extension is left as it is.
 */
export function withTypeExtension(filename: string, contentType: string | null): string {
  if (/\.[a-z0-9]{2,5}$/i.test(filename)) return filename;
  const ext = TYPE_EXTENSION[(contentType ?? "").split(";")[0].trim().toLowerCase()];
  return ext ? `${filename}.${ext}`.slice(0, 125) : filename;
}

/**
 * Downloads one public document. Every hop (the first address and each
 * redirect) must pass fetchRefusal, so a redirect cannot lead the server to
 * another host. The body is read up to MAX_FETCH_BYTES and no further.
 * `fetchImpl` is injectable for tests.
 */
export async function fetchPublicDocument(url: string, fetchImpl: FetchLike = fetch): Promise<Fetched> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const refusal = fetchRefusal(current);
    if (refusal) return { ok: false, reason: hop === 0 ? refusal : `The link redirects elsewhere: ${refusal}` };
    let res: Response;
    try {
      res = await fetchImpl(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      });
    } catch {
      return { ok: false, reason: "The site did not answer in time. Try again later or download it yourself." };
    }
    // A response whose body is not read is cancelled, so refused downloads and
    // redirects do not hold connections open.
    const discard = () => res.body?.cancel().catch(() => undefined);
    if (res.status >= 300 && res.status < 400) {
      await discard();
      const location = res.headers.get("location");
      if (!location) return { ok: false, reason: "The site redirected without saying where." };
      try {
        current = new URL(location, current).toString();
      } catch {
        return { ok: false, reason: "The site redirected to an invalid address." };
      }
      continue;
    }
    if (!res.ok) {
      await discard();
      return { ok: false, reason: `The site answered ${res.status}. It may need a sign-in: download it yourself and upload it.` };
    }
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_FETCH_BYTES) {
      await discard();
      return { ok: false, reason: "The file is larger than 5 MB. Download it yourself and upload the parts you need." };
    }
    if (!res.body) return { ok: false, reason: "The site sent an empty answer." };
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_FETCH_BYTES) {
          await reader.cancel().catch(() => undefined);
          return { ok: false, reason: "The file is larger than 5 MB. Download it yourself and upload the parts you need." };
        }
        chunks.push(value);
      }
    } catch {
      // The site dropped the connection or the timeout fired mid-download.
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "The download was cut off before it finished. Try again later or download it yourself." };
    }
    if (total === 0) return { ok: false, reason: "The site sent an empty file." };
    const filename = withTypeExtension(safeFilename(res.headers.get("content-disposition"), current), res.headers.get("content-type"));
    return { ok: true, buffer: Buffer.concat(chunks), finalUrl: current, filename };
  }
  return { ok: false, reason: "The link redirects too many times." };
}
