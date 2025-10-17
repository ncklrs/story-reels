"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHealthCheck = performHealthCheck;
exports.healthCheckCLI = healthCheckCLI;
const queue_1 = require("../lib/queue");
const queue_2 = require("../lib/queue");
/**
 * Perform health check
 */
async function performHealthCheck() {
    const timestamp = new Date().toISOString();
    const checks = {
        redis: await checkRedis(),
        queue: await checkQueue(),
    };
    const healthy = checks.redis.connected && checks.queue.accessible;
    return {
        healthy,
        timestamp,
        checks,
    };
}
/**
 * Check Redis connection
 */
async function checkRedis() {
    try {
        const redis = (0, queue_1.getRedisConnection)();
        const start = Date.now();
        // Try to ping Redis
        await redis.ping();
        const latencyMs = Date.now() - start;
        return {
            connected: true,
            latencyMs,
        };
    }
    catch (error) {
        return {
            connected: false,
            error: error.message,
        };
    }
}
/**
 * Check queue accessibility
 */
async function checkQueue() {
    try {
        // Try to get queue stats as a health check
        const workers = await queue_2.videoGenerationQueue.getWorkers();
        return {
            accessible: true,
            activeWorkers: workers.length,
        };
    }
    catch (error) {
        return {
            accessible: false,
            error: error.message,
        };
    }
}
/**
 * Run health check and exit with appropriate code
 * Useful for orchestration systems like Kubernetes
 */
async function healthCheckCLI() {
    try {
        const result = await performHealthCheck();
        console.log(JSON.stringify(result, null, 2));
        if (result.healthy) {
            process.exit(0);
        }
        else {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(JSON.stringify({
            healthy: false,
            timestamp: new Date().toISOString(),
            error: error.message,
        }));
        process.exit(1);
    }
}
// If run directly, execute health check
if (require.main === module) {
    healthCheckCLI();
}
//# sourceMappingURL=health-check.js.map