import { prisma } from '@/lib/db';
import { Storyboard, CharacterProfile, Scene } from '@/lib/types';

/**
 * Repository for Storyboard CRUD operations
 * Implements data access layer for storyboards
 */

export interface CreateStoryboardInput {
  id?: string;
  userId?: string;
  name: string;
  presetKey: string;
  character: CharacterProfile;
  scenes: Scene[];
}

export interface UpdateStoryboardInput {
  name?: string;
  presetKey?: string;
  character?: CharacterProfile;
  scenes?: Scene[];
}

export interface StoryboardWithJobs extends Storyboard {
  videoJobs?: Array<{
    id: string;
    sceneId: string;
    status: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    cost?: number;
    errorMessage?: string;
    createdAt: Date;
    completedAt?: Date;
  }>;
}

/**
 * Create a new storyboard
 */
export async function createStoryboard(
  input: CreateStoryboardInput
): Promise<Storyboard> {
  const storyboard = await prisma.storyboard.create({
    data: {
      id: input.id,
      userId: input.userId,
      name: input.name,
      presetKey: input.presetKey,
      character: input.character as any,
      scenes: input.scenes as any,
    },
  });

  return convertPrismaStoryboardToType(storyboard);
}

/**
 * Get a storyboard by ID
 */
export async function getStoryboard(
  storyboardId: string
): Promise<Storyboard | null> {
  const storyboard = await prisma.storyboard.findUnique({
    where: { id: storyboardId },
  });

  if (!storyboard) {
    return null;
  }

  return convertPrismaStoryboardToType(storyboard);
}

/**
 * Get storyboard with video jobs
 */
export async function getStoryboardWithJobs(
  storyboardId: string
): Promise<StoryboardWithJobs | null> {
  const storyboard = await prisma.storyboard.findUnique({
    where: { id: storyboardId },
    include: {
      videoJobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!storyboard) {
    return null;
  }

  return {
    ...convertPrismaStoryboardToType(storyboard),
    videoJobs: storyboard.videoJobs.map((job) => ({
      id: job.id,
      sceneId: job.sceneId,
      status: job.status,
      videoUrl: job.videoUrl || undefined,
      thumbnailUrl: job.thumbnailUrl || undefined,
      cost: job.cost ? Number(job.cost) : undefined,
      errorMessage: job.errorMessage || undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt || undefined,
    })),
  };
}

/**
 * Update a storyboard
 */
export async function updateStoryboard(
  storyboardId: string,
  input: UpdateStoryboardInput
): Promise<Storyboard> {
  const storyboard = await prisma.storyboard.update({
    where: { id: storyboardId },
    data: {
      name: input.name,
      presetKey: input.presetKey,
      character: input.character as any,
      scenes: input.scenes as any,
    },
  });

  return convertPrismaStoryboardToType(storyboard);
}

/**
 * Get user's storyboards
 */
export async function getUserStoryboards(
  userId: string,
  limit: number = 50
): Promise<Storyboard[]> {
  const storyboards = await prisma.storyboard.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return storyboards.map(convertPrismaStoryboardToType);
}

/**
 * Get all storyboards (with optional user filter)
 */
export async function getStoryboards(options?: {
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<Storyboard[]> {
  const storyboards = await prisma.storyboard.findMany({
    where: options?.userId ? { userId: options.userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });

  return storyboards.map(convertPrismaStoryboardToType);
}

/**
 * Search storyboards by name
 */
export async function searchStoryboards(
  query: string,
  userId?: string
): Promise<Storyboard[]> {
  const storyboards = await prisma.storyboard.findMany({
    where: {
      ...(userId && { userId }),
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return storyboards.map(convertPrismaStoryboardToType);
}

/**
 * Delete a storyboard (and cascade delete video jobs)
 */
export async function deleteStoryboard(storyboardId: string): Promise<void> {
  await prisma.storyboard.delete({
    where: { id: storyboardId },
  });
}

/**
 * Get storyboard count by user
 */
export async function getStoryboardCount(userId?: string): Promise<number> {
  return await prisma.storyboard.count({
    where: userId ? { userId } : undefined,
  });
}

/**
 * Get recent storyboards (for admin/monitoring)
 */
export async function getRecentStoryboards(
  limit: number = 20
): Promise<Storyboard[]> {
  const storyboards = await prisma.storyboard.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return storyboards.map(convertPrismaStoryboardToType);
}

/**
 * Update storyboard scenes only
 */
export async function updateStoryboardScenes(
  storyboardId: string,
  scenes: Scene[]
): Promise<Storyboard> {
  const storyboard = await prisma.storyboard.update({
    where: { id: storyboardId },
    data: {
      scenes: scenes as any,
    },
  });

  return convertPrismaStoryboardToType(storyboard);
}

/**
 * Update storyboard character only
 */
export async function updateStoryboardCharacter(
  storyboardId: string,
  character: CharacterProfile
): Promise<Storyboard> {
  const storyboard = await prisma.storyboard.update({
    where: { id: storyboardId },
    data: {
      character: character as any,
    },
  });

  return convertPrismaStoryboardToType(storyboard);
}

/**
 * Check if user owns storyboard
 */
export async function isStoryboardOwner(
  storyboardId: string,
  userId: string
): Promise<boolean> {
  const storyboard = await prisma.storyboard.findUnique({
    where: { id: storyboardId },
    select: { userId: true },
  });

  return storyboard?.userId === userId;
}

/**
 * Helper function to convert Prisma Storyboard to application Storyboard type
 */
function convertPrismaStoryboardToType(storyboard: any): Storyboard {
  return {
    id: storyboard.id,
    presetKey: storyboard.presetKey,
    character: storyboard.character as CharacterProfile,
    scenes: storyboard.scenes as Scene[],
  };
}
