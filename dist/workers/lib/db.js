"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.disconnectDatabase = disconnectDatabase;
exports.getDatabaseStats = getDatabaseStats;
exports.executeTransaction = executeTransaction;
exports.batchOperation = batchOperation;
const client_1 = require("@prisma/client");
// Connection pool configuration
const DATABASE_CONNECTION_LIMIT = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);
const DATABASE_POOL_TIMEOUT = parseInt(process.env.DATABASE_POOL_TIMEOUT || '20000', 10);
// Prisma client configuration
const prismaClientConfig = {
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
};
/**
 * Singleton Prisma client instance
 * In development, we use a global variable to preserve the instance across hot reloads
 * In production, we create a new instance
 */
exports.prisma = global.prisma ||
    new client_1.PrismaClient({
        ...prismaClientConfig,
        log: prismaClientConfig.log,
    });
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
/**
 * Health check function to verify database connectivity
 * @returns Promise that resolves to connection status
 */
async function checkDatabaseConnection() {
    const startTime = Date.now();
    try {
        // Simple query to check connectivity
        await exports.prisma.$queryRaw `SELECT 1`;
        const latency = Date.now() - startTime;
        return {
            connected: true,
            latency,
        };
    }
    catch (error) {
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
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log('Database disconnected successfully');
    }
    catch (error) {
        console.error('Error disconnecting from database:', error);
        throw error;
    }
}
/**
 * Get database statistics
 * Useful for monitoring and debugging
 */
async function getDatabaseStats() {
    try {
        // Query PostgreSQL to get connection stats
        const result = await exports.prisma.$queryRaw `
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
    }
    catch (error) {
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
async function executeTransaction(fn) {
    return await exports.prisma.$transaction(async (tx) => {
        return await fn(tx);
    });
}
/**
 * Batch operations helper
 * Useful for bulk inserts/updates
 */
async function batchOperation(operations, batchSize = 10) {
    const results = [];
    for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }
    return results;
}
// Log database URL for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        // Mask password in URL for security
        const maskedUrl = dbUrl.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/, '****');
        console.log('Database URL configured:', maskedUrl);
    }
    else {
        console.warn('⚠️  DATABASE_URL not configured in .env file');
    }
}
//# sourceMappingURL=db.js.map