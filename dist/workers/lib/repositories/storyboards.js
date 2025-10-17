"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoryboard = createStoryboard;
exports.getStoryboard = getStoryboard;
exports.getStoryboardWithJobs = getStoryboardWithJobs;
exports.updateStoryboard = updateStoryboard;
exports.getUserStoryboards = getUserStoryboards;
exports.getStoryboards = getStoryboards;
exports.searchStoryboards = searchStoryboards;
exports.deleteStoryboard = deleteStoryboard;
exports.getStoryboardCount = getStoryboardCount;
exports.getRecentStoryboards = getRecentStoryboards;
exports.updateStoryboardScenes = updateStoryboardScenes;
exports.updateStoryboardCharacter = updateStoryboardCharacter;
exports.isStoryboardOwner = isStoryboardOwner;
const db_1 = require("@/lib/db");
/**
 * Create a new storyboard
 */
async function createStoryboard(input) {
    const storyboard = await db_1.prisma.storyboard.create({
        data: {
            id: input.id,
            userId: input.userId,
            name: input.name,
            presetKey: input.presetKey,
            character: input.character,
            scenes: input.scenes,
        },
    });
    return convertPrismaStoryboardToType(storyboard);
}
/**
 * Get a storyboard by ID
 */
async function getStoryboard(storyboardId) {
    const storyboard = await db_1.prisma.storyboard.findUnique({
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
async function getStoryboardWithJobs(storyboardId) {
    const storyboard = await db_1.prisma.storyboard.findUnique({
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
async function updateStoryboard(storyboardId, input) {
    const storyboard = await db_1.prisma.storyboard.update({
        where: { id: storyboardId },
        data: {
            name: input.name,
            presetKey: input.presetKey,
            character: input.character,
            scenes: input.scenes,
        },
    });
    return convertPrismaStoryboardToType(storyboard);
}
/**
 * Get user's storyboards
 */
async function getUserStoryboards(userId, limit = 50) {
    const storyboards = await db_1.prisma.storyboard.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return storyboards.map(convertPrismaStoryboardToType);
}
/**
 * Get all storyboards (with optional user filter)
 */
async function getStoryboards(options) {
    const storyboards = await db_1.prisma.storyboard.findMany({
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
async function searchStoryboards(query, userId) {
    const storyboards = await db_1.prisma.storyboard.findMany({
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
async function deleteStoryboard(storyboardId) {
    await db_1.prisma.storyboard.delete({
        where: { id: storyboardId },
    });
}
/**
 * Get storyboard count by user
 */
async function getStoryboardCount(userId) {
    return await db_1.prisma.storyboard.count({
        where: userId ? { userId } : undefined,
    });
}
/**
 * Get recent storyboards (for admin/monitoring)
 */
async function getRecentStoryboards(limit = 20) {
    const storyboards = await db_1.prisma.storyboard.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return storyboards.map(convertPrismaStoryboardToType);
}
/**
 * Update storyboard scenes only
 */
async function updateStoryboardScenes(storyboardId, scenes) {
    const storyboard = await db_1.prisma.storyboard.update({
        where: { id: storyboardId },
        data: {
            scenes: scenes,
        },
    });
    return convertPrismaStoryboardToType(storyboard);
}
/**
 * Update storyboard character only
 */
async function updateStoryboardCharacter(storyboardId, character) {
    const storyboard = await db_1.prisma.storyboard.update({
        where: { id: storyboardId },
        data: {
            character: character,
        },
    });
    return convertPrismaStoryboardToType(storyboard);
}
/**
 * Check if user owns storyboard
 */
async function isStoryboardOwner(storyboardId, userId) {
    const storyboard = await db_1.prisma.storyboard.findUnique({
        where: { id: storyboardId },
        select: { userId: true },
    });
    return storyboard?.userId === userId;
}
/**
 * Helper function to convert Prisma Storyboard to application Storyboard type
 */
function convertPrismaStoryboardToType(storyboard) {
    return {
        id: storyboard.id,
        presetKey: storyboard.presetKey,
        character: storyboard.character,
        scenes: storyboard.scenes,
    };
}
//# sourceMappingURL=storyboards.js.map