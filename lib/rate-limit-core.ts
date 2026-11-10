/**
 * Rate-limit rules without storage or server dependencies, so they can be
 * tested directly. lib/rate-limit.ts supplies the shared database store.
 */

export type RateLimitOptions = { limit: number; windowMs: number };

/** One counting window: how many hits so far, and when it ends. */
export type Window = { count: number; resetAt: number };

/** Counts a hit and returns the window it landed in. */
export interface RateLimitStore {
  hit(key: string, windowMs: number, now: number): Promise<Window>;
  reset(key: string): Promise<void>;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment before trying again.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function normaliseKey(key: string) {
  return key.trim().slice(0, 512) || "unknown";
}

export function getClientAddress(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = headers.get("x-real-ip")?.trim() || headers.get("cf-connecting-ip")?.trim();
  return normaliseKey(forwarded || direct || "unknown");
}

/** Per-instance store: the fallback when the shared one cannot be reached. */
export class MemoryStore implements RateLimitStore {
  private readonly windows = new Map<string, Window>();
  constructor(private readonly maxKeys = 10_000) {}

  async hit(key: string, windowMs: number, now: number): Promise<Window> {
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      this.prune(now);
      const fresh = { count: 1, resetAt: now + windowMs };
      this.windows.set(key, fresh);
      return { ...fresh };
    }
    current.count += 1;
    return { ...current };
  }

  async reset(key: string) {
    this.windows.delete(key);
  }

  private prune(now: number) {
    if (this.windows.size < this.maxKeys) return;
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
    if (this.windows.size < this.maxKeys) return;
    const oldest = this.windows.keys().next().value;
    if (oldest) this.windows.delete(oldest);
  }
}

/**
 * Counts a hit against `store`, falling back to `fallback` if the store
 * fails. Throws RateLimitError once the window's count passes the limit.
 *
 * Failing over to a per-instance count rather than to "allow": a database
 * outage must not switch rate limiting off.
 */
export async function countHit(
  store: RateLimitStore,
  fallback: RateLimitStore,
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number,
  onStoreError: (error: unknown) => void = () => {},
) {
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeWindowMs = Math.max(1_000, Math.floor(windowMs));
  let window: Window;
  try {
    window = await store.hit(key, safeWindowMs, now);
  } catch (error) {
    onStoreError(error);
    window = await fallback.hit(key, safeWindowMs, now);
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1_000));
  if (window.count > safeLimit) throw new RateLimitError(retryAfterSeconds);
  return { remaining: safeLimit - window.count, retryAfterSeconds };
}
