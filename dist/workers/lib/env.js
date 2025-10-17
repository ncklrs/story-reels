"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isDevelopment = exports.isProduction = exports.env = void 0;
const zod_1 = require("zod");
/**
 * Environment variable validation using Zod
 * This ensures all required environment variables are present and valid at runtime
 */
const envSchema = zod_1.z.object({
    // Required: Encryption key for API key storage (optional during build)
    ENCRYPTION_KEY: zod_1.z
        .string()
        .optional()
        .refine((key) => {
        // Skip validation during build if not provided
        if (!key && process.env.NEXT_PHASE === 'phase-production-build') {
            return true;
        }
        if (!key) {
            return false;
        }
        try {
            const decoded = Buffer.from(key, 'base64');
            return decoded.length === 32;
        }
        catch {
            return false;
        }
    }, {
        message: 'ENCRYPTION_KEY must be a valid base64-encoded 32-byte key',
    }),
    // Redis URL for job queue
    REDIS_URL: zod_1.z
        .string()
        .url('REDIS_URL must be a valid URL')
        .optional()
        .default('redis://localhost:6379'),
    // Database URL (optional, depends on implementation)
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL must be a valid URL').optional(),
    // Storage configuration (optional)
    BLOB_STORAGE_URL: zod_1.z.string().url().optional(),
    BLOB_READ_WRITE_TOKEN: zod_1.z.string().optional(),
    // Optional server-side API keys
    OPENAI_API_KEY: zod_1.z.string().optional(),
    GOOGLE_CLOUD_PROJECT_ID: zod_1.z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: zod_1.z.string().optional(),
    // Webhook configuration (optional)
    WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Admin API Key for admin endpoints (generate with: openssl rand -hex 32)
    ADMIN_API_KEY: zod_1.z.string().min(32).optional(),
    // App URL
    NEXT_PUBLIC_APP_URL: zod_1.z
        .string()
        .url('NEXT_PUBLIC_APP_URL must be a valid URL')
        .optional()
        .default('http://localhost:3000'),
    // Node environment
    NODE_ENV: zod_1.z
        .enum(['development', 'production', 'test'])
        .optional()
        .default('development'),
});
// Parse and validate environment variables
function validateEnv() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const issues = error.issues.map((issue) => {
                return `  - ${issue.path.join('.')}: ${issue.message}`;
            });
            console.error('Environment variable validation failed:');
            console.error(issues.join('\n'));
            throw new Error('Invalid environment variables. Check the console for details.');
        }
        throw error;
    }
}
/**
 * Validated environment variables
 * Access environment variables through this object to ensure type safety
 *
 * @example
 * import { env } from '@/lib/env';
 * const encryptionKey = env.ENCRYPTION_KEY;
 */
exports.env = validateEnv();
/**
 * Helper to check if we're in production
 */
exports.isProduction = exports.env.NODE_ENV === 'production';
/**
 * Helper to check if we're in development
 */
exports.isDevelopment = exports.env.NODE_ENV === 'development';
/**
 * Helper to check if we're in test mode
 */
exports.isTest = exports.env.NODE_ENV === 'test';
//# sourceMappingURL=env.js.map