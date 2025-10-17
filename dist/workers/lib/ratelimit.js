"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalLimiter = exports.sessionLimiter = exports.videoCompilationLimiter = exports.videoGenerationLimiter = void 0;
exports.getRateLimitIdentifier = getRateLimitIdentifier;
exports.checkRateLimit = checkRateLimit;
exports.createRateLimitHeaders = createRateLimitHeaders;
exports.applyRateLimit = applyRateLimit;
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("@upstash/redis");
/**
 * Rate limiting utilities using Upstash Redis
 * Prevents API abuse and manages cost overruns
 */
// Initialize Redis client (only if Upstash credentials are available)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new redis_1.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;
// Development mode flag - disables rate limiting if Upstash not configured
const DEV_MODE = !redis && process.env.NODE_ENV === 'development';
if (DEV_MODE) {
    console.warn('⚠️  Rate limiting disabled: Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env');
}
/**
 * Rate limiter for video generation endpoint
 * Limit: 10 requests per minute per IP
 */
exports.videoGenerationLimiter = redis
    ? new ratelimit_1.Ratelimit({
        redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(10, '60 s'),
        analytics: true,
        prefix: 'ratelimit:video-gen',
    })
    : null;
/**
 * Rate limiter for video compilation endpoint
 * Limit: 5 requests per minute per IP (more expensive operation)
 */
exports.videoCompilationLimiter = redis
    ? new ratelimit_1.Ratelimit({
        redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(5, '60 s'),
        analytics: true,
        prefix: 'ratelimit:video-compile',
    })
    : null;
/**
 * Rate limiter for auth/session endpoint
 * Limit: 20 requests per minute per IP
 */
exports.sessionLimiter = redis
    ? new ratelimit_1.Ratelimit({
        redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(20, '60 s'),
        analytics: true,
        prefix: 'ratelimit:session',
    })
    : null;
/**
 * Rate limiter for general API endpoints
 * Limit: 30 requests per minute per IP
 */
exports.generalLimiter = redis
    ? new ratelimit_1.Ratelimit({
        redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(30, '60 s'),
        analytics: true,
        prefix: 'ratelimit:general',
    })
    : null;
/**
 * Get identifier for rate limiting (IP address or user ID)
 */
function getRateLimitIdentifier(request) {
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
async function checkRateLimit(identifier, limiter) {
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
    }
    catch (error) {
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
function createRateLimitHeaders(result) {
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
async function applyRateLimit(request, limiter) {
    const identifier = getRateLimitIdentifier(request);
    const result = await checkRateLimit(identifier, limiter);
    if (!result.success) {
        const headers = createRateLimitHeaders(result);
        const resetTime = new Date(result.reset).toLocaleTimeString();
        return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again after ${resetTime}`,
            limit: result.limit,
            reset: result.reset,
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        });
    }
    return null;
}
//# sourceMappingURL=ratelimit.js.map