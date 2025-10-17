"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVideoJob = createVideoJob;
exports.getVideoJob = getVideoJob;
exports.updateVideoJob = updateVideoJob;
exports.getJobsByStoryboard = getJobsByStoryboard;
exports.getJobsByStatus = getJobsByStatus;
exports.deleteVideoJob = deleteVideoJob;
exports.getFailedJobs = getFailedJobs;
exports.getPendingJobsCount = getPendingJobsCount;
exports.getProcessingJobsCount = getProcessingJobsCount;
exports.cleanupOldJobs = cleanupOldJobs;
const db_1 = require("../db");
const logger_1 = require("../logger");
/**
 * Database repository for video jobs
 * Handles CRUD operations for the video_jobs table using Prisma
 */
const logger = (0, logger_1.createLogger)({ module: 'videoJobs' });
/**
 * Create a new video job in the database
 */
async function createVideoJob(data) {
    try {
        const job = await db_1.prisma.videoJob.create({
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
    }
    catch (error) {
        logger.error('Failed to create video job', { error: error.message });
        throw new Error(`Failed to create video job: ${error.message}`);
    }
}
/**
 * Get a video job by ID
 */
async function getVideoJob(jobId) {
    try {
        const job = await db_1.prisma.videoJob.findUnique({
            where: { id: jobId },
        });
        return job ? mapDatabaseJobToVideoJob(job) : null;
    }
    catch (error) {
        logger.error('Failed to get video job', { jobId, error: error.message });
        throw new Error(`Failed to get video job: ${error.message}`);
    }
}
/**
 * Update a video job
 */
async function updateVideoJob(jobId, data) {
    try {
        const job = await db_1.prisma.videoJob.update({
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
    }
    catch (error) {
        logger.error('Failed to update video job', { jobId, error: error.message });
        throw new Error(`Failed to update video job: ${error.message}`);
    }
}
/**
 * Get all jobs for a storyboard
 */
async function getJobsByStoryboard(storyboardId) {
    try {
        const jobs = await db_1.prisma.videoJob.findMany({
            where: { storyboardId },
            orderBy: { createdAt: 'asc' },
        });
        return jobs.map(mapDatabaseJobToVideoJob);
    }
    catch (error) {
        logger.error('Failed to get jobs by storyboard', { storyboardId, error: error.message });
        throw new Error(`Failed to get jobs by storyboard: ${error.message}`);
    }
}
/**
 * Get jobs by status
 */
async function getJobsByStatus(status, limit = 100) {
    try {
        const jobs = await db_1.prisma.videoJob.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return jobs.map(mapDatabaseJobToVideoJob);
    }
    catch (error) {
        logger.error('Failed to get jobs by status', { status, error: error.message });
        throw new Error(`Failed to get jobs by status: ${error.message}`);
    }
}
/**
 * Delete a video job
 */
async function deleteVideoJob(jobId) {
    try {
        await db_1.prisma.videoJob.delete({
            where: { id: jobId },
        });
        logger.info('Video job deleted', { jobId });
    }
    catch (error) {
        logger.error('Failed to delete video job', { jobId, error: error.message });
        throw new Error(`Failed to delete video job: ${error.message}`);
    }
}
/**
 * Get failed jobs (for retry purposes)
 */
async function getFailedJobs(limit = 50) {
    return getJobsByStatus('failed', limit);
}
/**
 * Get pending jobs count
 */
async function getPendingJobsCount() {
    try {
        const count = await db_1.prisma.videoJob.count({
            where: { status: 'pending' },
        });
        return count;
    }
    catch (error) {
        logger.error('Failed to get pending jobs count', { error: error.message });
        throw new Error(`Failed to get pending jobs count: ${error.message}`);
    }
}
/**
 * Get processing jobs count
 */
async function getProcessingJobsCount() {
    try {
        const count = await db_1.prisma.videoJob.count({
            where: { status: 'processing' },
        });
        return count;
    }
    catch (error) {
        logger.error('Failed to get processing jobs count', { error: error.message });
        throw new Error(`Failed to get processing jobs count: ${error.message}`);
    }
}
/**
 * Map database job to VideoJob type
 */
function mapDatabaseJobToVideoJob(dbJob) {
    return {
        id: dbJob.id,
        storyboardId: dbJob.storyboardId,
        sceneId: dbJob.sceneId,
        provider: dbJob.provider,
        status: dbJob.status,
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
async function cleanupOldJobs(olderThanDays = 7) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        const result = await db_1.prisma.videoJob.deleteMany({
            where: {
                status: 'completed',
                completedAt: {
                    lt: cutoffDate,
                },
            },
        });
        logger.info('Cleaned up old jobs', { count: result.count, olderThanDays });
        return result.count;
    }
    catch (error) {
        logger.error('Failed to cleanup old jobs', { error: error.message });
        throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }
}
//# sourceMappingURL=videoJobs.js.map