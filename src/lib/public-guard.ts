import "server-only";
import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * A5: fixed-window rate limiter backed by a Postgres table (no Redis —
 * free-stack requirement, see prisma/schema.prisma#RateLimitBucket).
 * One row per (ip, route, windowStart) bucket. Fails CLOSED: if the
 * rate-limit check itself errors (e.g. DB hiccup), the caller treats
 * it as not allowed rather than silently letting the request through.
 */
export async function checkRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { ip_route_windowStart: { ip, route, windowStart } },
    update: { count: { increment: 1 } },
    create: { ip, route, windowStart, count: 1 },
  });

  // Opportunistic cleanup so the table doesn't grow unbounded — never
  // blocks the response, and a failure here is harmless (just means
  // cleanup happens on a later request instead).
  void prisma.rateLimitBucket
    .deleteMany({ where: { windowStart: { lt: new Date(now - windowMs * 4) } } })
    .catch(() => {});

  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/** Best-effort client IP extraction behind a reverse proxy (Docker/Nginx/etc). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse() {
  return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Honeypot check for public forms: a hidden field real users never
 * fill in, styled off-screen in the form (not display:none, which
 * some bots skip — see components using this). If it's non-empty,
 * the submission is treated as a bot and given a fake success
 * response without touching the database, rather than a rejection
 * that would tell the bot its approach failed.
 */
export function honeypotFilled(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const value = (body as Record<string, unknown>).website;
  return typeof value === "string" && value.trim().length > 0;
}
