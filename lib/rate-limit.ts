import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type PublicSubmissionLimitOptions = {
  emailLimit: number;
  ipLimit: number;
  windowMs?: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
const DEFAULT_WINDOW_MS = 60_000;

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment before trying again.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size < MAX_BUCKETS) return;

  const oldestKey = buckets.keys().next().value;
  if (oldestKey) buckets.delete(oldestKey);
}

function normaliseKey(key: string) {
  return key.trim().slice(0, 512) || "unknown";
}

export function getClientAddress(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = headers.get("x-real-ip")?.trim() || headers.get("cf-connecting-ip")?.trim();
  return normaliseKey(forwarded || direct || "unknown");
}

export function enforceRateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const safeKey = normaliseKey(key);
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeWindowMs = Math.max(1_000, Math.floor(windowMs));
  const bucket = buckets.get(safeKey);

  if (!bucket || bucket.resetAt <= now) {
    pruneExpiredBuckets(now);
    buckets.set(safeKey, { count: 1, resetAt: now + safeWindowMs });
    return { remaining: safeLimit - 1, retryAfterSeconds: Math.ceil(safeWindowMs / 1_000) };
  }

  if (bucket.count >= safeLimit) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)));
  }

  bucket.count += 1;
  return { remaining: safeLimit - bucket.count, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)) };
}

export function resetRateLimit(key: string) {
  buckets.delete(normaliseKey(key));
}

export function enforcePublicSubmissionRateLimit(
  channel: string,
  email: string,
  headers: Headers,
  { emailLimit, ipLimit, windowMs = DEFAULT_WINDOW_MS }: PublicSubmissionLimitOptions,
) {
  const ip = getClientAddress(headers);
  enforceRateLimit(`${channel}:ip:${ip}`, { limit: ipLimit, windowMs });
  enforceRateLimit(`${channel}:email:${email.toLowerCase().trim()}`, { limit: emailLimit, windowMs });
}
