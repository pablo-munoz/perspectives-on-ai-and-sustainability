/**
 * Thin wrapper around Upstash Redis (REST) used by Phases C/D/G:
 *
 *   Phase C — feature snapshots per zone (NDVI/LST/NDMI from GEE)
 *   Phase D — risk-score time series (snapshot every 30 min)
 *   Phase G — archived/dismissed alerts
 *
 * If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are missing the
 * wrapper falls back to an in-process Map. The fallback is non-persistent and
 * resets on every serverless cold start; it exists only so local dev and CI
 * can run the codepaths without Upstash.
 */

import { Redis } from "@upstash/redis";

interface KVAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, opts?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  /** RPUSH item; capped to `keep` newest entries when set. */
  push<T>(key: string, value: T, keep?: number): Promise<void>;
  /** LRANGE-style read of the most recent `count` items, newest first. */
  recent<T>(key: string, count: number): Promise<T[]>;
  /** Returns true when backed by Upstash, false for in-memory fallback. */
  isPersistent(): boolean;
}

function createUpstashAdapter(redis: Redis): KVAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      const v = await redis.get<T>(key);
      return v ?? null;
    },
    async set<T>(key: string, value: T, opts?: { ex?: number }) {
      if (opts?.ex) await redis.set(key, value, { ex: opts.ex });
      else await redis.set(key, value);
    },
    async del(key: string) {
      await redis.del(key);
    },
    async push<T>(key: string, value: T, keep?: number) {
      await redis.rpush(key, JSON.stringify(value));
      if (keep) await redis.ltrim(key, -keep, -1);
    },
    async recent<T>(key: string, count: number): Promise<T[]> {
      const raw = await redis.lrange(key, -count, -1);
      const parsed = raw
        .map((s) => {
          if (typeof s !== "string") return s as T;
          try {
            return JSON.parse(s) as T;
          } catch {
            return s as unknown as T;
          }
        })
        .reverse();
      return parsed;
    },
    isPersistent: () => true,
  };
}

function createMemoryAdapter(): KVAdapter {
  const store = new Map<string, { value: unknown; expiresAt?: number }>();
  const lists = new Map<string, unknown[]>();

  const isExpired = (entry: { expiresAt?: number }) =>
    entry.expiresAt != null && entry.expiresAt < Date.now();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, opts?: { ex?: number }) {
      store.set(key, {
        value,
        expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
      });
    },
    async del(key: string) {
      store.delete(key);
      lists.delete(key);
    },
    async push<T>(key: string, value: T, keep?: number) {
      const arr = lists.get(key) ?? [];
      arr.push(value);
      if (keep && arr.length > keep) arr.splice(0, arr.length - keep);
      lists.set(key, arr);
    },
    async recent<T>(key: string, count: number): Promise<T[]> {
      const arr = (lists.get(key) ?? []) as T[];
      return arr.slice(-count).reverse();
    },
    isPersistent: () => false,
  };
}

let _adapter: KVAdapter | null = null;

export function kv(): KVAdapter {
  if (_adapter) return _adapter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    _adapter = createUpstashAdapter(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[kv] Upstash credentials missing — falling back to in-process Map. " +
          "State will not survive serverless invocations."
      );
    }
    _adapter = createMemoryAdapter();
  }
  return _adapter;
}

/**
 * Reset adapter — only used by tests to swap in a fresh in-memory store.
 */
export function _resetKV(): void {
  _adapter = null;
}
