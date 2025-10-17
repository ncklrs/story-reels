import { prisma } from '@/lib/db';
import { CompiledVideo } from '@/lib/types';

/**
 * Repository for CompiledVideo CRUD operations
 * Implements data access layer for compiled multi-scene videos
 */

export type CompiledVideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateCompiledVideoInput {
  id?: string;
  storyboardId: string;
  scenesOrder: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCompiledVideoInput {
  status?: CompiledVideoStatus;
  finalVideoUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  errorMessage?: string;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Create a new compiled video record
 */
export async function createCompiledVideo(
  input: CreateCompiledVideoInput
): Promise<CompiledVideo> {
  const compiledVideo = await prisma.compiledVideo.create({
    data: {
      id: input.id,
      storyboardId: input.storyboardId,
      scenesOrder: input.scenesOrder as any,
      status: 'pending',
      metadata: input.metadata,
    },
  });

  return convertPrismaCompiledVideoToType(compiledVideo);
}

/**
 * Get a compiled video by ID
 */
export async function getCompiledVideo(
  compiledVideoId: string
): Promise<CompiledVideo | null> {
  const compiledVideo = await prisma.compiledVideo.findUnique({
    where: { id: compiledVideoId },
  });

  if (!compiledVideo) {
    return null;
  }

  return convertPrismaCompiledVideoToType(compiledVideo);
}

/**
 * Update a compiled video
 */
export async function updateCompiledVideo(
  compiledVideoId: string,
  input: UpdateCompiledVideoInput
): Promise<CompiledVideo> {
  const compiledVideo = await prisma.compiledVideo.update({
    where: { id: compiledVideoId },
    data: {
      status: input.status,
      finalVideoUrl: input.finalVideoUrl,
      durationSeconds: input.durationSeconds,
      fileSizeBytes: input.fileSizeBytes ? BigInt(input.fileSizeBytes) : undefined,
      errorMessage: input.errorMessage,
      completedAt: input.completedAt,
      metadata: input.metadata,
    },
  });

  return convertPrismaCompiledVideoToType(compiledVideo);
}

/**
 * Get all compiled videos for a storyboard
 */
export async function getCompiledVideosByStoryboard(
  storyboardId: string
): Promise<CompiledVideo[]> {
  const compiledVideos = await prisma.compiledVideo.findMany({
    where: { storyboardId },
    orderBy: { createdAt: 'desc' },
  });

  return compiledVideos.map(convertPrismaCompiledVideoToType);
}

/**
 * Get most recent compiled video for a storyboard
 */
export async function getLatestCompiledVideo(
  storyboardId: string
): Promise<CompiledVideo | null> {
  const compiledVideo = await prisma.compiledVideo.findFirst({
    where: { storyboardId },
    orderBy: { createdAt: 'desc' },
  });

  if (!compiledVideo) {
    return null;
  }

  return convertPrismaCompiledVideoToType(compiledVideo);
}

/**
 * Get compiled videos by status
 */
export async function getCompiledVideosByStatus(
  status: CompiledVideoStatus,
  limit: number = 50
): Promise<CompiledVideo[]> {
  const compiledVideos = await prisma.compiledVideo.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return compiledVideos.map(convertPrismaCompiledVideoToType);
}

/**
 * Delete a compiled video
 */
export async function deleteCompiledVideo(compiledVideoId: string): Promise<void> {
  await prisma.compiledVideo.delete({
    where: { id: compiledVideoId },
  });
}

/**
 * Delete all compiled videos for a storyboard
 */
export async function deleteCompiledVideosByStoryboard(
  storyboardId: string
): Promise<number> {
  const result = await prisma.compiledVideo.deleteMany({
    where: { storyboardId },
  });

  return result.count;
}

/**
 * Mark compiled video as processing
 */
export async function markCompiledVideoAsProcessing(
  compiledVideoId: string
): Promise<CompiledVideo> {
  return updateCompiledVideo(compiledVideoId, {
    status: 'processing',
  });
}

/**
 * Mark compiled video as completed
 */
export async function markCompiledVideoAsCompleted(
  compiledVideoId: string,
  finalVideoUrl: string,
  options?: {
    durationSeconds?: number;
    fileSizeBytes?: number;
  }
): Promise<CompiledVideo> {
  return updateCompiledVideo(compiledVideoId, {
    status: 'completed',
    finalVideoUrl,
    durationSeconds: options?.durationSeconds,
    fileSizeBytes: options?.fileSizeBytes,
    completedAt: new Date(),
  });
}

/**
 * Mark compiled video as failed
 */
export async function markCompiledVideoAsFailed(
  compiledVideoId: string,
  errorMessage: string
): Promise<CompiledVideo> {
  return updateCompiledVideo(compiledVideoId, {
    status: 'failed',
    errorMessage,
    completedAt: new Date(),
  });
}

/**
 * Get compiled video statistics
 */
export async function getCompiledVideoStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalSizeBytes: bigint;
  totalDurationSeconds: number;
}> {
  const [total, pending, processing, completed, failed, sizeAgg, durationAgg] =
    await Promise.all([
      prisma.compiledVideo.count(),
      prisma.compiledVideo.count({ where: { status: 'pending' } }),
      prisma.compiledVideo.count({ where: { status: 'processing' } }),
      prisma.compiledVideo.count({ where: { status: 'completed' } }),
      prisma.compiledVideo.count({ where: { status: 'failed' } }),
      prisma.compiledVideo.aggregate({
        where: { status: 'completed' },
        _sum: { fileSizeBytes: true },
      }),
      prisma.compiledVideo.aggregate({
        where: { status: 'completed' },
        _sum: { durationSeconds: true },
      }),
    ]);

  return {
    total,
    pending,
    processing,
    completed,
    failed,
    totalSizeBytes: sizeAgg._sum.fileSizeBytes || BigInt(0),
    totalDurationSeconds: durationAgg._sum.durationSeconds || 0,
  };
}

/**
 * Get recent compiled videos (for admin/monitoring)
 */
export async function getRecentCompiledVideos(
  limit: number = 20
): Promise<CompiledVideo[]> {
  const compiledVideos = await prisma.compiledVideo.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return compiledVideos.map(convertPrismaCompiledVideoToType);
}

/**
 * Clean up old failed compilations
 */
export async function cleanupFailedCompilations(
  daysOld: number = 7
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.compiledVideo.deleteMany({
    where: {
      status: 'failed',
      completedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Helper function to convert Prisma CompiledVideo to application CompiledVideo type
 */
function convertPrismaCompiledVideoToType(video: any): CompiledVideo {
  return {
    id: video.id,
    storyboardId: video.storyboardId,
    scenesOrder: video.scenesOrder as string[],
    finalVideoUrl: video.finalVideoUrl || undefined,
    durationSeconds: video.durationSeconds || undefined,
    fileSizeBytes: video.fileSizeBytes ? Number(video.fileSizeBytes) : undefined,
    createdAt: video.createdAt,
  };
}
