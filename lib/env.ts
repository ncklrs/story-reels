import { z } from 'zod';

/**
 * Environment variable validation using Zod
 * This ensures all required environment variables are present and valid at runtime
 */

const envSchema = z.object({
  // Required: Encryption key for API key storage (optional during build)
  ENCRYPTION_KEY: z
    .string()
    .optional()
    .refine(
      (key) => {
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
        } catch {
          return false;
        }
      },
      {
        message: 'ENCRYPTION_KEY must be a valid base64-encoded 32-byte key',
      }
    ),

  // Redis URL for job queue
  REDIS_URL: z
    .string()
    .url('REDIS_URL must be a valid URL')
    .optional()
    .default('redis://localhost:6379'),

  // Database URL (optional during build, required at runtime)
  DATABASE_URL: z
    .string()
    .optional()
    .refine(
      (url) => {
        // Skip validation during build
        if (process.env.NEXT_PHASE === 'phase-production-build') {
          return true;
        }
        // If URL is provided, validate format
        if (url) {
          return url.startsWith('postgres://') || url.startsWith('postgresql://');
        }
        // Allow missing during build
        return true;
      },
      {
        message: 'DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://)',
      }
    ),

  // Storage configuration (required for video uploads)
  BLOB_STORAGE_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .min(1, 'BLOB_READ_WRITE_TOKEN is required for video storage')
    .optional(),

  // Optional server-side API keys
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Webhook configuration (optional)
  WEBHOOK_SECRET: z.string().optional(),

  // Admin API Key for admin endpoints (generate with: openssl rand -hex 32)
  ADMIN_API_KEY: z.string().min(32).optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .optional()
    .default('http://localhost:3000'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    const result = envSchema.parse(process.env);

    // Log warnings for mock modes
    if (process.env.SORA_MOCK_MODE === 'true') {
      console.warn('[Environment] SORA_MOCK_MODE is enabled - using mock responses for Sora API');
    }

    if (process.env.VEO_MOCK_MODE === 'true') {
      console.warn('[Environment] VEO_MOCK_MODE is enabled - using mock responses for Veo API');
    }

    // Log success
    console.log('[Environment] Environment validation passed');

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`;
      });

      console.error('[Environment] Environment variable validation failed:');
      console.error(issues.join('\n'));

      throw new Error(
        'Invalid environment variables. Check the console for details and ensure all required variables are set in .env.local'
      );
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
export const env = validateEnv();

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
