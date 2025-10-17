import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';

/**
 * Simple admin authentication using bearer token
 * In production, replace with proper auth (JWT, session, etc.)
 */
export async function authenticateAdmin(request: NextRequest): Promise<boolean> {
  // Check for Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return false;
  }

  // Expected format: "Bearer YOUR_ADMIN_TOKEN"
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return false;
  }

  // Compare with environment variable
  // In production, use proper secret management
  const adminToken = env.ADMIN_API_KEY || process.env.ADMIN_API_KEY;

  if (!adminToken) {
    console.warn('ADMIN_API_KEY not set - admin endpoints are insecure!');
    return false;
  }

  return token === adminToken;
}

/**
 * Middleware to require admin authentication
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const isAuthenticated = await authenticateAdmin(request);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin authentication required.' },
      { status: 401 }
    );
  }

  return null; // null means authenticated, continue
}
