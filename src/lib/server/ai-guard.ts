import "server-only";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "./rate-limit";

// In development mode, disable aggressive throttling so local browsing and card rendering
// does not block user actions. In production, 30 calls per minute per IP caps abuse.
const AI_LIMIT = 30;
const AI_WINDOW_MS = 60_000;

/**
 * Returns a 429 response if the caller is over the AI rate limit, otherwise
 * null (proceed). Usage at the top of a route handler:
 *   const limited = aiRateLimit(req); if (limited) return limited;
 */
export function aiRateLimit(req: Request): NextResponse | null {
  // Never throttle in local development mode
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const rl = rateLimit(`ai:${clientIp(req)}`, AI_LIMIT, AI_WINDOW_MS);
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Too many AI requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
  );
}
