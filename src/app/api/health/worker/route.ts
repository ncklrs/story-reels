import { NextRequest, NextResponse } from 'next/server';
import { performHealthCheck } from '../../../../../workers/health-check';
import { createLogger } from '@/lib/logger';

/**
 * GET /api/health/worker
 * Worker health check endpoint
 */

const logger = createLogger({ endpoint: 'health-worker' });

export async function GET(request: NextRequest) {
  try {
    const healthCheck = await performHealthCheck();

    const statusCode = healthCheck.healthy ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error: any) {
    logger.error('Health check failed', error);

    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}
