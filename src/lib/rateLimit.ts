// In-memory rate limiter. Works per process instance.
// For multi-instance (Vercel serverless), this provides best-effort protection.

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  return { allowed: entry.count <= MAX_ATTEMPTS, remaining, resetAt: entry.resetAt };
}
