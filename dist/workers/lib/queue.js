"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEvents = exports.videoGenerationQueue = void 0;
exports.addVideoGenerationJob = addVideoGenerationJob;
exports.getJobStatus = getJobStatus;
exports.cancelJob = cancelJob;
exports.getQueueStats = getQueueStats;
exports.getFailedJobs = getFailedJobs;
exports.retryFailedJob = retryFailedJob;
exports.removeJob = removeJob;
exports.cleanupOldJobs = cleanupOldJobs;
exports.createVideoGenerationWorker = createVideoGenerationWorker;
exports.getRedisConnection = getRedisConnection;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Job queue for async video generation using BullMQ
 */
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});
// Create video generation queue
exports.videoGenerationQueue = new bullmq_1.Queue('video-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep max 100 completed jobs
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
            count: 500, // Keep max 500 failed jobs
        }
    }
});
// Create queue events for monitoring
exports.queueEvents = new bullmq_1.QueueEvents('video-generation', { connection });
/**
 * Add a video generation job to the queue
 */
async function addVideoGenerationJob(data) {
    return await exports.videoGenerationQueue.add('generate-video', data, {
        jobId: data.jobId, // Use consistent job ID
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            age: 3600 // Keep for 1 hour
        },
        removeOnFail: {
            age: 86400 // Keep for 24 hours
        }
    });
}
/**
 * Get job status
 */
async function getJobStatus(jobId) {
    const job = await exports.videoGenerationQueue.getJob(jobId);
    if (!job) {
        return null;
    }
    const state = await job.getState();
    const progress = job.progress;
    return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason
    };
}
/**
 * Cancel a job
 */
async function cancelJob(jobId) {
    const job = await exports.videoGenerationQueue.getJob(jobId);
    if (job) {
        await job.remove();
    }
}
/**
 * Get queue statistics
 */
async function getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        exports.videoGenerationQueue.getWaitingCount(),
        exports.videoGenerationQueue.getActiveCount(),
        exports.videoGenerationQueue.getCompletedCount(),
        exports.videoGenerationQueue.getFailedCount(),
        exports.videoGenerationQueue.getDelayedCount(),
    ]);
    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
    };
}
/**
 * Get failed jobs
 */
async function getFailedJobs(start = 0, end = 10) {
    return await exports.videoGenerationQueue.getFailed(start, end);
}
/**
 * Retry a failed job
 */
async function retryFailedJob(jobId) {
    const job = await exports.videoGenerationQueue.getJob(jobId);
    if (!job) {
        throw new Error(`Job ${jobId} not found`);
    }
    const state = await job.getState();
    if (state !== 'failed') {
        throw new Error(`Job ${jobId} is not in failed state (current state: ${state})`);
    }
    await job.retry();
}
/**
 * Remove a job from the queue
 */
async function removeJob(jobId) {
    const job = await exports.videoGenerationQueue.getJob(jobId);
    if (job) {
        await job.remove();
    }
}
/**
 * Clean up old completed and failed jobs
 */
async function cleanupOldJobs(gracePeriodMs = 24 * 60 * 60 * 1000 // 24 hours
) {
    // Clean completed jobs older than grace period
    const completedCleaned = await exports.videoGenerationQueue.clean(gracePeriodMs, 100, 'completed');
    // Clean failed jobs older than grace period
    const failedCleaned = await exports.videoGenerationQueue.clean(gracePeriodMs, 100, 'failed');
    return {
        cleaned: completedCleaned.length + failedCleaned.length,
    };
}
/**
 * Process video generation jobs
 * This would typically run in a separate worker process
 */
function createVideoGenerationWorker(processor) {
    return new bullmq_1.Worker('video-generation', processor, {
        connection,
        concurrency: 2, // Process 2 videos at a time
        limiter: {
            max: 10, // Max 10 jobs
            duration: 60000, // Per minute
        }
    });
}
/**
 * Get Redis connection (for health checks)
 */
function getRedisConnection() {
    return connection;
}
//# sourceMappingURL=queue.js.map