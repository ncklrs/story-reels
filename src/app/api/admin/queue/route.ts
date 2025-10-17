import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats, getFailedJobs } from '@/lib/queue';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/queue
 * Get queue statistics and health
 */

const logger = createLogger({ endpoint: 'admin-queue' });

export async function GET(request: NextRequest) {
  // Authenticate admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    logger.info('Fetching queue statistics');

    // Get queue stats
    const stats = await getQueueStats();

    // Get sample of failed jobs
    const failedJobs = await getFailedJobs(0, 5);

    // Calculate health status
    const health = calculateQueueHealth(stats);

    const response = {
      stats,
      health,
      failedJobs: failedJobs.map((job) => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Failed to get queue stats', error);

    return NextResponse.json(
      {
        error: 'Failed to get queue statistics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate queue health status
 */
function calculateQueueHealth(stats: any): {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
} {
  const issues: string[] = [];

  // Check for high failure rate
  const totalJobs = stats.completed + stats.failed;
  if (totalJobs > 0) {
    const failureRate = stats.failed / totalJobs;
    if (failureRate > 0.5) {
      issues.push('High failure rate (>50%)');
    } else if (failureRate > 0.2) {
      issues.push('Elevated failure rate (>20%)');
    }
  }

  // Check for stuck jobs
  if (stats.active > 10) {
    issues.push(`High number of active jobs (${stats.active})`);
  }

  // Check for queue backlog
  if (stats.waiting > 100) {
    issues.push(`Large backlog of waiting jobs (${stats.waiting})`);
  }

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'critical';
  if (issues.length === 0) {
    status = 'healthy';
  } else if (issues.length <= 1) {
    status = 'degraded';
  } else {
    status = 'critical';
  }

  return { status, issues };
}
