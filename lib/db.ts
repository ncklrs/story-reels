import { PrismaClient } from '@prisma/client';

/**
 * Database connection utility using Prisma ORM
 * Implements singleton pattern to prevent connection exhaustion
 */

declare global {
  // Allow global variable for Prisma client in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Connection pool configuration
const DATABASE_CONNECTION_LIMIT = parseInt(
  process.env.DATABASE_CONNECTION_LIMIT || '10',
  10
);

const DATABASE_POOL_TIMEOUT = parseInt(
  process.env.DATABASE_POOL_TIMEOUT || '20000',
  10
);

// Prisma client configuration
const prismaClientConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
} as const;

/**
 * Singleton Prisma client instance
 * In development, we use a global variable to preserve the instance across hot reloads
 * In production, we create a new instance
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    ...prismaClientConfig,
    log: prismaClientConfig.log as any,
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Health check function to verify database connectivity
 * @returns Promise that resolves to connection status
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to check connectivity
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    return {
      connected: true,
      latency,
    };
  } catch (error) {
    console.error('Database connection check failed:', error);

    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Safely disconnect from database
 * Call this during graceful shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
}

/**
 * Get database statistics
 * Useful for monitoring and debugging
 */
export async function getDatabaseStats(): Promise<{
  totalConnections?: number;
  activeConnections?: number;
  error?: string;
}> {
  try {
    // Query PostgreSQL to get connection stats
    const result = await prisma.$queryRaw<
      Array<{ total: bigint; active: bigint }>
    >`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'active') as active
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    if (result && result.length > 0) {
      return {
        totalConnections: Number(result[0].total),
        activeConnections: Number(result[0].active),
      };
    }

    return {};
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a transaction with automatic rollback on error
 * @param fn - Function to execute within transaction
 * @returns Result from the transaction function
 */
export async function executeTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await fn(tx as typeof prisma);
  });
}

/**
 * Batch operations helper
 * Useful for bulk inserts/updates
 */
export async function batchOperation<T>(
  operations: Array<Promise<T>>,
  batchSize: number = 10
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results;
}

// Export Prisma client type for use in other files
export type PrismaTransaction = typeof prisma;

// Log database URL for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Mask password in URL for security
    const maskedUrl = dbUrl.replace(
      /(?<=:\/\/[^:]+:)[^@]+(?=@)/,
      '****'
    );
    console.log('Database URL configured:', maskedUrl);
  } else {
    console.warn('⚠️  DATABASE_URL not configured in .env file');
  }
}
