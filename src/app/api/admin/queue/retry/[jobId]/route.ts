import { NextRequest, NextResponse } from 'next/server';
import { retryFailedJob } from '@/lib/queue';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth';

/**
 * POST /api/admin/queue/retry/[jobId]
 * Retry a failed job
 */

const logger = createLogger({ endpoint: 'admin-retry-job' });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  // Authenticate admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.info('Retrying failed job', { jobId });

    await retryFailedJob(jobId);

    logger.info('Job retry initiated successfully', { jobId });

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} has been queued for retry`,
      jobId,
    });
  } catch (error: any) {
    logger.error('Failed to retry job', error, {
      jobId: (await context.params).jobId,
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      {
        error: 'Failed to retry job',
        message: error.message,
      },
      { status: statusCode }
    );
  }
}
