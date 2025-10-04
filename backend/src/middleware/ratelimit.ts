/**
 * Simple in-memory token bucket rate limiter
 */

import { Context, Next } from 'hono';
import { RateLimitError } from '../lib/errors.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

// In-memory storage per colo (resets on worker restart)
const buckets = new Map<string, TokenBucket>();

interface RateLimitConfig {
  maxTokens: number; // Max tokens in bucket
  refillRate: number; // Tokens per second
  cost?: number; // Cost per request (default 1)
}

/**
 * Token bucket rate limiter middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxTokens, refillRate, cost = 1 } = config;

  return async (c: Context, next: Next) => {
    // Use IP address as bucket key
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `${clientIP}:${c.req.path}`;

    const now = Date.now() / 1000; // seconds
    let bucket = buckets.get(key);

    if (!bucket) {
      // Initialize new bucket
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
      };
      buckets.set(key, bucket);
    } else {
      // Refill tokens based on elapsed time
      const elapsed = now - bucket.lastRefill;
      const tokensToAdd = elapsed * refillRate;
      bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if enough tokens available
    if (bucket.tokens < cost) {
      const retryAfter = Math.ceil((cost - bucket.tokens) / refillRate);
      throw new RateLimitError(retryAfter);
    }

    // Consume tokens
    bucket.tokens -= cost;

    await next();
  };
}

/**
 * Cleanup old buckets periodically (optional optimization)
 */
export function cleanupBuckets(maxAge: number = 3600): void {
  const now = Date.now() / 1000;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}

