/**
 * API Key Session Management
 *
 * Provides secure session token system to avoid storing API keys in job data.
 * This prevents API keys from being exposed in Redis or job queue storage.
 *
 * Security considerations:
 * - Session tokens are cryptographically secure random values
 * - API keys are stored in memory only (not persisted to Redis)
 * - Sessions auto-expire after 30 minutes
 * - Automatic cleanup of expired sessions
 */

import crypto from 'crypto';

interface ApiKeySession {
  apiKey: string;
  provider: 'sora' | 'veo';
  projectId?: string; // For Veo only
  createdAt: number;
  expiresAt: number;
}

/**
 * In-memory session storage
 * Maps session token -> API key data
 */
const sessions = new Map<string, ApiKeySession>();

/**
 * Session configuration
 */
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session and return the session token
 *
 * @param apiKey - The API key to store
 * @param provider - The provider ('sora' or 'veo')
 * @param projectId - The Google Cloud project ID (for Veo only)
 * @returns Session token to be stored in job data instead of API key
 */
export function createSession(
  apiKey: string,
  provider: 'sora' | 'veo',
  projectId?: string
): string {
  const token = generateSessionToken();
  const now = Date.now();

  sessions.set(token, {
    apiKey,
    provider,
    projectId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  console.log(`[ApiKeySession] Created session for ${provider}`, {
    token: token.substring(0, 8) + '...',
    expiresIn: `${SESSION_TTL_MS / 1000}s`
  });

  return token;
}

/**
 * Retrieve API key data from a session token
 *
 * @param token - The session token
 * @returns API key data if session is valid and not expired, null otherwise
 */
export function getSession(token: string): ApiKeySession | null {
  const session = sessions.get(token);

  if (!session) {
    console.warn('[ApiKeySession] Session not found', {
      token: token.substring(0, 8) + '...'
    });
    return null;
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    console.warn('[ApiKeySession] Session expired', {
      token: token.substring(0, 8) + '...',
      expiredAt: new Date(session.expiresAt).toISOString()
    });
    sessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Delete a session token
 * Should be called after job completion or failure
 *
 * @param token - The session token to delete
 */
export function deleteSession(token: string): void {
  const deleted = sessions.delete(token);
  if (deleted) {
    console.log('[ApiKeySession] Deleted session', {
      token: token.substring(0, 8) + '...'
    });
  }
}

/**
 * Clean up expired sessions
 * Removes all sessions that have passed their expiration time
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log('[ApiKeySession] Cleaned up expired sessions', {
      count: cleanedCount,
      remaining: sessions.size
    });
  }
}

/**
 * Get the number of active sessions (for monitoring)
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}

/**
 * Initialize cleanup interval
 * Should be called once when the server starts
 * Only runs in server environment (not during build)
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function initSessionCleanup(): void {
  // Don't start cleanup in build environment
  if (typeof window !== 'undefined') {
    return;
  }

  if (cleanupInterval) {
    console.log('[ApiKeySession] Cleanup already initialized');
    return;
  }

  cleanupInterval = setInterval(() => {
    cleanupExpiredSessions();
  }, CLEANUP_INTERVAL_MS);

  console.log('[ApiKeySession] Cleanup interval initialized', {
    intervalMs: CLEANUP_INTERVAL_MS
  });
}

/**
 * Stop the cleanup interval (for testing or shutdown)
 */
export function stopSessionCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[ApiKeySession] Cleanup interval stopped');
  }
}

// Auto-initialize cleanup on server startup
if (typeof window === 'undefined') {
  initSessionCleanup();
}
