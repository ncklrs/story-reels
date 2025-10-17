"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompiledVideo = createCompiledVideo;
exports.getCompiledVideo = getCompiledVideo;
exports.updateCompiledVideo = updateCompiledVideo;
exports.getCompiledVideosByStoryboard = getCompiledVideosByStoryboard;
exports.getLatestCompiledVideo = getLatestCompiledVideo;
exports.getCompiledVideosByStatus = getCompiledVideosByStatus;
exports.deleteCompiledVideo = deleteCompiledVideo;
exports.deleteCompiledVideosByStoryboard = deleteCompiledVideosByStoryboard;
exports.markCompiledVideoAsProcessing = markCompiledVideoAsProcessing;
exports.markCompiledVideoAsCompleted = markCompiledVideoAsCompleted;
exports.markCompiledVideoAsFailed = markCompiledVideoAsFailed;
exports.getCompiledVideoStats = getCompiledVideoStats;
exports.getRecentCompiledVideos = getRecentCompiledVideos;
exports.cleanupFailedCompilations = cleanupFailedCompilations;
const db_1 = require("@/lib/db");
/**
 * Create a new compiled video record
 */
async function createCompiledVideo(input) {
    const compiledVideo = await db_1.prisma.compiledVideo.create({
        data: {
            id: input.id,
            storyboardId: input.storyboardId,
            scenesOrder: input.scenesOrder,
            status: 'pending',
            metadata: input.metadata,
        },
    });
    return convertPrismaCompiledVideoToType(compiledVideo);
}
/**
 * Get a compiled video by ID
 */
async function getCompiledVideo(compiledVideoId) {
    const compiledVideo = await db_1.prisma.compiledVideo.findUnique({
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
async function updateCompiledVideo(compiledVideoId, input) {
    const compiledVideo = await db_1.prisma.compiledVideo.update({
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
async function getCompiledVideosByStoryboard(storyboardId) {
    const compiledVideos = await db_1.prisma.compiledVideo.findMany({
        where: { storyboardId },
        orderBy: { createdAt: 'desc' },
    });
    return compiledVideos.map(convertPrismaCompiledVideoToType);
}
/**
 * Get most recent compiled video for a storyboard
 */
async function getLatestCompiledVideo(storyboardId) {
    const compiledVideo = await db_1.prisma.compiledVideo.findFirst({
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
async function getCompiledVideosByStatus(status, limit = 50) {
    const compiledVideos = await db_1.prisma.compiledVideo.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return compiledVideos.map(convertPrismaCompiledVideoToType);
}
/**
 * Delete a compiled video
 */
async function deleteCompiledVideo(compiledVideoId) {
    await db_1.prisma.compiledVideo.delete({
        where: { id: compiledVideoId },
    });
}
/**
 * Delete all compiled videos for a storyboard
 */
async function deleteCompiledVideosByStoryboard(storyboardId) {
    const result = await db_1.prisma.compiledVideo.deleteMany({
        where: { storyboardId },
    });
    return result.count;
}
/**
 * Mark compiled video as processing
 */
async function markCompiledVideoAsProcessing(compiledVideoId) {
    return updateCompiledVideo(compiledVideoId, {
        status: 'processing',
    });
}
/**
 * Mark compiled video as completed
 */
async function markCompiledVideoAsCompleted(compiledVideoId, finalVideoUrl, options) {
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
async function markCompiledVideoAsFailed(compiledVideoId, errorMessage) {
    return updateCompiledVideo(compiledVideoId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
    });
}
/**
 * Get compiled video statistics
 */
async function getCompiledVideoStats() {
    const [total, pending, processing, completed, failed, sizeAgg, durationAgg] = await Promise.all([
        db_1.prisma.compiledVideo.count(),
        db_1.prisma.compiledVideo.count({ where: { status: 'pending' } }),
        db_1.prisma.compiledVideo.count({ where: { status: 'processing' } }),
        db_1.prisma.compiledVideo.count({ where: { status: 'completed' } }),
        db_1.prisma.compiledVideo.count({ where: { status: 'failed' } }),
        db_1.prisma.compiledVideo.aggregate({
            where: { status: 'completed' },
            _sum: { fileSizeBytes: true },
        }),
        db_1.prisma.compiledVideo.aggregate({
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
async function getRecentCompiledVideos(limit = 20) {
    const compiledVideos = await db_1.prisma.compiledVideo.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return compiledVideos.map(convertPrismaCompiledVideoToType);
}
/**
 * Clean up old failed compilations
 */
async function cleanupFailedCompilations(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const result = await db_1.prisma.compiledVideo.deleteMany({
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
function convertPrismaCompiledVideoToType(video) {
    return {
        id: video.id,
        storyboardId: video.storyboardId,
        scenesOrder: video.scenesOrder,
        finalVideoUrl: video.finalVideoUrl || undefined,
        durationSeconds: video.durationSeconds || undefined,
        fileSizeBytes: video.fileSizeBytes ? Number(video.fileSizeBytes) : undefined,
        createdAt: video.createdAt,
    };
}
//# sourceMappingURL=compiledVideos.js.map