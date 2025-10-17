import { NextRequest, NextResponse } from 'next/server';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';
import { validateRequest, sessionCreateRequestSchema, sessionProviderQuerySchema } from '@/lib/validation';
import { env } from '@/lib/env';
import { applyRateLimit, sessionLimiter, createRateLimitHeaders, getRateLimitIdentifier, checkRateLimit } from '@/lib/ratelimit';

/**
 * Secure session management for API keys
 * Stores encrypted API keys in HTTP-only cookies instead of client-side storage
 */

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // Cannot be accessed by client-side JavaScript
  secure: env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

/**
 * POST /api/auth/session
 * Create a new session and store encrypted API key in HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (20 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, sessionLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(sessionCreateRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { provider, apiKey } = validation.data;

    // Basic API key format validation
    if (provider === 'sora' && !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format. Must start with "sk-"' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = await encryptApiKey(apiKey);

    // Get rate limit info for headers
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, sessionLimiter);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    // Create response with encrypted key in HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        provider,
        message: 'Session created successfully',
      },
      {
        headers: rateLimitHeaders,
      }
    );

    // Set the encrypted API key in an HTTP-only cookie
    response.cookies.set(`api_key_${provider}`, encryptedKey, COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session?provider=sora
 * Check if a session exists for a provider (does not return the actual key)
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting (20 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, sessionLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Validate query parameters
    const validation = validateRequest(sessionProviderQuerySchema, { provider });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const validatedProvider = validation.data.provider;

    // Check if cookie exists
    const encryptedKey = request.cookies.get(`api_key_${validatedProvider}`)?.value;

    if (!encryptedKey) {
      return NextResponse.json(
        { exists: false, provider: validatedProvider },
        { status: 200 }
      );
    }

    // Verify the encrypted key can be decrypted (validates integrity)
    try {
      await decryptApiKey(encryptedKey);
      return NextResponse.json({
        exists: true,
        provider: validatedProvider,
      });
    } catch (error) {
      // Cookie exists but is invalid - remove it
      const response = NextResponse.json(
        { exists: false, provider: validatedProvider },
        { status: 200 }
      );
      response.cookies.delete(`api_key_${validatedProvider}`);
      return response;
    }
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session?provider=sora
 * Delete a session (remove the API key cookie)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting (20 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, sessionLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Validate query parameters
    const validation = validateRequest(sessionProviderQuerySchema, { provider });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const validatedProvider = validation.data.provider;

    // Create response and delete the cookie
    const response = NextResponse.json({
      success: true,
      provider: validatedProvider,
      message: 'Session deleted successfully',
    });

    response.cookies.delete(`api_key_${validatedProvider}`);

    return response;
  } catch (error: any) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete session' },
      { status: 500 }
    );
  }
}

/**
 * Server-side helper to get API key from session
 * This should only be called from other API routes
 */
export async function getApiKeyFromSession(
  request: NextRequest,
  provider: 'sora' | 'veo'
): Promise<string | null> {
  try {
    const encryptedKey = request.cookies.get(`api_key_${provider}`)?.value;

    if (!encryptedKey) {
      return null;
    }

    const apiKey = await decryptApiKey(encryptedKey);
    return apiKey;
  } catch (error) {
    console.error('Error retrieving API key from session:', error);
    return null;
  }
}
