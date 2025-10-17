import { prisma } from '../db';
import { VideoJob, VideoJobStatus, VideoProvider } from '../types';
import { createLogger } from '../logger';
import { Prisma } from '@prisma/client';

/**
 * Database repository for video jobs
 * Handles CRUD operations for the video_jobs table using Prisma
 */

const logger = createLogger({ module: 'videoJobs' });

/**
 * Helper function to handle Prisma errors with user-friendly messages
 */
function handlePrismaError(error: any, context: string): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      logger.error(`Duplicate entry in ${context}`, { error: error.message });
      return new Error('A job with this ID already exists');
    }
    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      logger.error(`Invalid reference in ${context}`, { error: error.message });
      return new Error('Invalid storyboard ID');
    }
    // P2025: Record not found
    if (error.code === 'P2025') {
      logger.error(`Record not found in ${context}`, { error: error.message });
      return new Error('Job not found');
    }
  }

  // Generic error for unknown cases
  logger.error(`Failed: ${context}`, { error: error instanceof Error ? error.message : 'Unknown error' });
  return new Error('Database operation failed. Please try again.');
}

export interface CreateVideoJobData {
  id?: string;
  storyboardId: string;
  sceneId: string;
  provider: VideoProvider;
  prompt: string;
  cost?: number;
  providerJobId?: string;
}

export interface UpdateVideoJobData {
  status?: VideoJobStatus;
  providerJobId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  cost?: number;
  errorMessage?: string;
  completedAt?: Date;
  metadata?: any;
}

/**
 * Create a new video job in the database
 */
export async function createVideoJob(data: CreateVideoJobData): Promise<VideoJob> {
  try {
    const job = await prisma.videoJob.create({
      data: {
        id: data.id,
        storyboardId: data.storyboardId,
        sceneId: data.sceneId,
        provider: data.provider,
        status: 'pending',
        prompt: data.prompt,
        cost: data.cost,
        providerJobId: data.providerJobId,
        createdAt: new Date(),
      },
    });

    logger.info('Video job created', { jobId: job.id, provider: job.provider });
    return mapDatabaseJobToVideoJob(job);
  } catch (error: any) {
    throw handlePrismaError(error, 'createVideoJob');
  }
}

/**
 * Get a video job by ID
 */
export async function getVideoJob(jobId: string): Promise<VideoJob | null> {
  try {
    const job = await prisma.videoJob.findUnique({
      where: { id: jobId },
    });

    return job ? mapDatabaseJobToVideoJob(job) : null;
  } catch (error: any) {
    throw handlePrismaError(error, 'getVideoJob');
  }
}

/**
 * Update a video job
 */
export async function updateVideoJob(
  jobId: string,
  data: UpdateVideoJobData
): Promise<VideoJob> {
  try {
    const job = await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.providerJobId !== undefined && { providerJobId: data.providerJobId }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    logger.info('Video job updated', { jobId, status: data.status });
    return mapDatabaseJobToVideoJob(job);
  } catch (error: any) {
    logger.error('Failed to update video job', { jobId, error: error.message });
    throw new Error(`Failed to update video job: ${error.message}`);
  }
}

/**
 * Get all jobs for a storyboard
 */
export async function getJobsByStoryboard(storyboardId: string): Promise<VideoJob[]> {
  try {
    const jobs = await prisma.videoJob.findMany({
      where: { storyboardId },
      orderBy: { createdAt: 'asc' },
    });

    return jobs.map(mapDatabaseJobToVideoJob);
  } catch (error: any) {
    logger.error('Failed to get jobs by storyboard', { storyboardId, error: error.message });
    throw new Error(`Failed to get jobs by storyboard: ${error.message}`);
  }
}

/**
 * Get jobs by status
 */
export async function getJobsByStatus(
  status: VideoJobStatus,
  limit: number = 100
): Promise<VideoJob[]> {
  try {
    const jobs = await prisma.videoJob.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map(mapDatabaseJobToVideoJob);
  } catch (error: any) {
    logger.error('Failed to get jobs by status', { status, error: error.message });
    throw new Error(`Failed to get jobs by status: ${error.message}`);
  }
}

/**
 * Delete a video job
 */
export async function deleteVideoJob(jobId: string): Promise<void> {
  try {
    await prisma.videoJob.delete({
      where: { id: jobId },
    });

    logger.info('Video job deleted', { jobId });
  } catch (error: any) {
    logger.error('Failed to delete video job', { jobId, error: error.message });
    throw new Error(`Failed to delete video job: ${error.message}`);
  }
}

/**
 * Get failed jobs (for retry purposes)
 */
export async function getFailedJobs(limit: number = 50): Promise<VideoJob[]> {
  return getJobsByStatus('failed', limit);
}

/**
 * Get pending jobs count
 */
export async function getPendingJobsCount(): Promise<number> {
  try {
    const count = await prisma.videoJob.count({
      where: { status: 'pending' },
    });

    return count;
  } catch (error: any) {
    logger.error('Failed to get pending jobs count', { error: error.message });
    throw new Error(`Failed to get pending jobs count: ${error.message}`);
  }
}

/**
 * Get processing jobs count
 */
export async function getProcessingJobsCount(): Promise<number> {
  try {
    const count = await prisma.videoJob.count({
      where: { status: 'processing' },
    });

    return count;
  } catch (error: any) {
    logger.error('Failed to get processing jobs count', { error: error.message });
    throw new Error(`Failed to get processing jobs count: ${error.message}`);
  }
}

/**
 * Map database job to VideoJob type
 */
function mapDatabaseJobToVideoJob(dbJob: any): VideoJob {
  return {
    id: dbJob.id,
    storyboardId: dbJob.storyboardId,
    sceneId: dbJob.sceneId,
    provider: dbJob.provider as VideoProvider,
    status: dbJob.status as VideoJobStatus,
    prompt: dbJob.prompt,
    providerJobId: dbJob.providerJobId,
    videoUrl: dbJob.videoUrl,
    thumbnailUrl: dbJob.thumbnailUrl,
    cost: dbJob.cost ? parseFloat(dbJob.cost.toString()) : undefined,
    errorMessage: dbJob.errorMessage,
    metadata: dbJob.metadata,
    createdAt: dbJob.createdAt,
    completedAt: dbJob.completedAt,
  };
}

/**
 * Clean up old completed jobs (for maintenance)
 */
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.videoJob.deleteMany({
      where: {
        status: 'completed',
        completedAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Cleaned up old jobs', { count: result.count, olderThanDays });
    return result.count;
  } catch (error: any) {
    logger.error('Failed to cleanup old jobs', { error: error.message });
    throw new Error(`Failed to cleanup old jobs: ${error.message}`);
  }
}
