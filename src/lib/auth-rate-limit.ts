/** Lightweight per-instance rate limiting for public auth endpoints. */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: `Too many attempts. Try again in ${retryAfterSec} seconds.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/** Apply IP-based rate limit; returns a Response when blocked. */
export function enforceAuthRateLimit(req: Request, scope: string, limit: number, windowMs: number) {
  const ip = clientIp(req);
  const result = checkRateLimit(`${scope}:${ip}`, limit, windowMs);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}
