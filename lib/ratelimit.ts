import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

/**
 * Rate limiting utilities using Upstash Redis
 * Prevents API abuse and manages cost overruns
 */

// Initialize Redis client (only if Upstash credentials are available)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Development mode flag - disables rate limiting if Upstash not configured
const DEV_MODE = !redis && process.env.NODE_ENV === 'development';

if (DEV_MODE) {
  console.warn(
    '⚠️  Rate limiting disabled: Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env'
  );
}

/**
 * Rate limiter for video generation endpoint
 * Limit: 10 requests per minute per IP
 */
export const videoGenerationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:video-gen',
    })
  : null;

/**
 * Rate limiter for video compilation endpoint
 * Limit: 5 requests per minute per IP (more expensive operation)
 */
export const videoCompilationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: 'ratelimit:video-compile',
    })
  : null;

/**
 * Rate limiter for auth/session endpoint
 * Limit: 20 requests per minute per IP
 */
export const sessionLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
      prefix: 'ratelimit:session',
    })
  : null;

/**
 * Rate limiter for general API endpoints
 * Limit: 30 requests per minute per IP
 */
export const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: true,
      prefix: 'ratelimit:general',
    })
  : null;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Get identifier for rate limiting (IP address or user ID)
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get IP from headers (works with most proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // Use first IP from x-forwarded-for, or x-real-ip, or fallback to 'anonymous'
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : realIp || 'anonymous';

  // In production, you might want to use user ID if authenticated
  // For now, we'll use IP address
  return ip;
}

/**
 * Check rate limit for a request
 * @param identifier - Unique identifier (usually IP address)
 * @param limiter - The rate limiter to use
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  // Skip rate limiting in development mode if Upstash not configured
  if (DEV_MODE || !limiter) {
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limit check fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Create rate limit headers for response
 * Following standard RateLimit header spec
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}

/**
 * Helper to apply rate limiting to an API route
 * Returns null if rate limit passed, or a 429 response if exceeded
 */
export async function applyRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(request);
  const result = await checkRateLimit(identifier, limiter);

  if (!result.success) {
    const headers = createRateLimitHeaders(result);
    const resetTime = new Date(result.reset).toLocaleTimeString();

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${resetTime}`,
        limit: result.limit,
        reset: result.reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );
  }

  return null;
}
