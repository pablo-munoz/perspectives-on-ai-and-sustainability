import { kv } from "./kv";

/**
 * KV-backed sliding-window rate limiter for the public API.
 *
 *   60 anonymous requests per IP per 10 minutes (default).
 *
 * Falls back to the in-memory KV adapter when Upstash creds are missing —
 * still enforces the limit per process, just not across regions.
 */

interface Limit {
  count: number;
  windowMs: number;
}

const DEFAULT_LIMIT: Limit = { count: 60, windowMs: 10 * 60 * 1000 };

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export async function rateLimit(
  key: string,
  limit: Limit = DEFAULT_LIMIT
): Promise<RateResult> {
  const store = kv();
  const now = Date.now();
  const cacheKey = `rl:${key}`;
  const entry = await store.get<{ count: number; reset: number }>(cacheKey);

  if (!entry || entry.reset < now) {
    const reset = now + limit.windowMs;
    await store.set(
      cacheKey,
      { count: 1, reset },
      { ex: Math.ceil(limit.windowMs / 1000) }
    );
    return { ok: true, remaining: limit.count - 1, resetMs: reset };
  }

  if (entry.count >= limit.count) {
    return { ok: false, remaining: 0, resetMs: entry.reset };
  }

  const next = { count: entry.count + 1, reset: entry.reset };
  const ttl = Math.max(1, Math.ceil((entry.reset - now) / 1000));
  await store.set(cacheKey, next, { ex: ttl });
  return {
    ok: true,
    remaining: limit.count - next.count,
    resetMs: entry.reset,
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
