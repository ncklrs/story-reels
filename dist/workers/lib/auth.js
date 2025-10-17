"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdmin = authenticateAdmin;
exports.requireAdmin = requireAdmin;
const server_1 = require("next/server");
const env_1 = require("./env");
/**
 * Simple admin authentication using bearer token
 * In production, replace with proper auth (JWT, session, etc.)
 */
async function authenticateAdmin(request) {
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
    const adminToken = env_1.env.ADMIN_API_KEY || process.env.ADMIN_API_KEY;
    if (!adminToken) {
        console.warn('ADMIN_API_KEY not set - admin endpoints are insecure!');
        return false;
    }
    return token === adminToken;
}
/**
 * Middleware to require admin authentication
 */
async function requireAdmin(request) {
    const isAuthenticated = await authenticateAdmin(request);
    if (!isAuthenticated) {
        return server_1.NextResponse.json({ error: 'Unauthorized. Admin authentication required.' }, { status: 401 });
    }
    return null; // null means authenticated, continue
}
//# sourceMappingURL=auth.js.map