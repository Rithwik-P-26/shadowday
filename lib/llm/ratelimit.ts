// In-memory sliding-window rate limit per client IP: 30 requests per 5 minutes.
// Over the limit the route serves scripted replies instead of calling an LLM; the student never sees an error.
// Memory is per server instance, which is fine for a free-tier deployment.

export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 5 * 60_000;
const MAX_TRACKED_KEYS = 5_000;

const hits = new Map<string, number[]>();

export function resetRateLimits(): void {
  hits.clear();
}

function prune(now: number): void {
  for (const [key, times] of hits) {
    if (times.length === 0 || times[times.length - 1] <= now - RATE_WINDOW_MS) hits.delete(key);
  }
}

/** Records a request for `key` and says whether it is within the limit. Rejected requests are not recorded. */
export function rateLimit(key: string, now: number = Date.now()): { allowed: boolean; remaining: number } {
  if (hits.size > MAX_TRACKED_KEYS) prune(now);
  const windowStart = now - RATE_WINDOW_MS;
  const times = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (times.length >= RATE_LIMIT) {
    hits.set(key, times);
    return { allowed: false, remaining: 0 };
  }
  times.push(now);
  hits.set(key, times);
  return { allowed: true, remaining: RATE_LIMIT - times.length };
}

/** First address in x-forwarded-for, then x-real-ip, else a shared bucket. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}
