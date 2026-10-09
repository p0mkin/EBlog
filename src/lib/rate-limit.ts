/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: In-memory state means limits are per-serverless-instance, not
 * global. Good enough to blunt casual abuse (upload spam, login brute
 * force) on a personal-scale app. For multi-instance guarantees, swap
 * this for an Upstash/Redis-backed limiter — the interface stays the same.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (existing.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Pulls a best-effort client identifier from standard proxy headers. */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return req.headers.get("x-real-ip") || "unknown";
}

// Periodic cleanup so the Map doesn't grow unbounded on long-lived instances.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}, 5 * 60 * 1000);
