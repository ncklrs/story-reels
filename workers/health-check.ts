import { getRedisConnection } from '../lib/queue';
import { videoGenerationQueue } from '../lib/queue';

/**
 * Health check utility for worker monitoring
 */

export interface HealthCheckResult {
  healthy: boolean;
  timestamp: string;
  checks: {
    redis: {
      connected: boolean;
      latencyMs?: number;
      error?: string;
    };
    queue: {
      accessible: boolean;
      activeWorkers?: number;
      error?: string;
    };
  };
}

/**
 * Perform health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
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
async function checkRedis(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  try {
    const redis = getRedisConnection();
    const start = Date.now();

    // Try to ping Redis
    await redis.ping();

    const latencyMs = Date.now() - start;

    return {
      connected: true,
      latencyMs,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Check queue accessibility
 */
async function checkQueue(): Promise<{
  accessible: boolean;
  activeWorkers?: number;
  error?: string;
}> {
  try {
    // Try to get queue stats as a health check
    const workers = await videoGenerationQueue.getWorkers();

    return {
      accessible: true,
      activeWorkers: workers.length,
    };
  } catch (error: any) {
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
export async function healthCheckCLI(): Promise<void> {
  try {
    const result = await performHealthCheck();

    console.log(JSON.stringify(result, null, 2));

    if (result.healthy) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error: any) {
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
