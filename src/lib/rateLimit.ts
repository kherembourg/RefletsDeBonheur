/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter using fixed window algorithm.
 * For production with multiple instances, replace with Redis-based solution.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (cleared on server restart)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Max entries before forced eviction
const MAX_STORE_SIZE = 100_000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Key prefix for namespace separation */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Check rate limit for a given identifier (typically IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowSeconds, prefix = 'default' } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Lazy cleanup of expired entries
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, record] of rateLimitStore.entries()) {
      if (record.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // Evict oldest entries if store is too large
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const entriesToDelete = rateLimitStore.size - MAX_STORE_SIZE + 1000;
    let deleted = 0;
    for (const k of rateLimitStore.keys()) {
      if (deleted >= entriesToDelete) break;
      rateLimitStore.delete(k);
      deleted++;
    }
  }

  let record = rateLimitStore.get(key);

  // Create new record or reset if window expired
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
      retryAfterSeconds,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: new Date(record.resetAt),
  };
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Cloudflare header (trusted, cannot be spoofed by client)
  const cfConnecting = request.headers.get('cf-connecting-ip');
  if (cfConnecting) return cfConnecting;

  // Proxy headers (less trusted, can be spoofed)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;

  // Fallback - use a default for local development
  return '127.0.0.1';
}

/**
 * Create a rate-limited API response (429 Too Many Requests)
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds ?? 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  );
}

/**
 * Check rate limit for a specific wedding
 * Used to prevent distributed abuse across multiple IPs
 */
export function checkWeddingRateLimit(
  weddingId: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `wedding:${weddingId}`;
  return checkRateLimit(key, config);
}

/**
 * Reset internal state for testing purposes only.
 * Exported so tests can control cleanup timing and store size.
 */
export function _resetForTesting() {
  rateLimitStore.clear();
  lastCleanup = Date.now();
}

/** Expose internal store size for testing */
export function _getStoreSize(): number {
  return rateLimitStore.size;
}

/** Expose constants for testing */
export { MAX_STORE_SIZE, CLEANUP_INTERVAL_MS };

/**
 * Directly set lastCleanup for testing lazy cleanup behavior.
 */
export function _setLastCleanup(timestamp: number) {
  lastCleanup = timestamp;
}

/**
 * Directly insert entries into the rate limit store for testing.
 */
export function _setStoreEntry(key: string, record: { count: number; resetAt: number }) {
  rateLimitStore.set(key, record);
}

// Predefined rate limit configs for common endpoints
export const RATE_LIMITS = {
  /** Signup: 5 attempts per IP per hour */
  signup: {
    limit: 5,
    windowSeconds: 3600,
    prefix: 'signup',
  },
  /** Slug check: 30 requests per IP per minute */
  slugCheck: {
    limit: 30,
    windowSeconds: 60,
    prefix: 'slug-check',
  },
  /** General API: 100 requests per IP per minute */
  general: {
    limit: 100,
    windowSeconds: 60,
    prefix: 'general',
  },
  /** Upload presign: 20 requests per IP per minute */
  upload: {
    limit: 20,
    windowSeconds: 60,
    prefix: 'upload',
  },
  /** Upload per wedding: 50 uploads per wedding per minute */
  uploadPerWedding: {
    limit: 50,
    windowSeconds: 60,
    prefix: 'upload-wedding',
  },
  /** Verify payment: 10 attempts per IP per hour (prevents brute-forcing session IDs) */
  verifyPayment: {
    limit: 10,
    windowSeconds: 3600,
    prefix: 'verify-payment',
  },
  /** Stripe checkout: 5 attempts per IP per hour (prevents checkout spam) */
  stripeCheckout: {
    limit: 5,
    windowSeconds: 3600,
    prefix: 'stripe-checkout',
  },
} as const;
