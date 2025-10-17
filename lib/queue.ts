import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Job queue for async video generation using BullMQ
 */

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

export interface VideoGenerationJobData {
  jobId: string;
  storyboardId: string;
  sceneId: string;
  provider: 'sora' | 'veo';
  prompt: string;
  apiKey: string;
  model: string;
  size?: string;
  resolution?: string;
  duration: number;
}

// Create video generation queue
export const videoGenerationQueue = new Queue('video-generation', {
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
export const queueEvents = new QueueEvents('video-generation', { connection });

/**
 * Add a video generation job to the queue
 */
export async function addVideoGenerationJob(
  data: VideoGenerationJobData
): Promise<Job<VideoGenerationJobData>> {
  return await videoGenerationQueue.add('generate-video', data, {
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
export async function getJobStatus(jobId: string) {
  const job = await videoGenerationQueue.getJob(jobId);

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
export async function cancelJob(jobId: string): Promise<void> {
  const job = await videoGenerationQueue.getJob(jobId);

  if (job) {
    await job.remove();
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    videoGenerationQueue.getWaitingCount(),
    videoGenerationQueue.getActiveCount(),
    videoGenerationQueue.getCompletedCount(),
    videoGenerationQueue.getFailedCount(),
    videoGenerationQueue.getDelayedCount(),
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
export async function getFailedJobs(start = 0, end = 10): Promise<Job<VideoGenerationJobData>[]> {
  return await videoGenerationQueue.getFailed(start, end);
}

/**
 * Retry a failed job
 */
export async function retryFailedJob(jobId: string): Promise<void> {
  const job = await videoGenerationQueue.getJob(jobId);

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
export async function removeJob(jobId: string): Promise<void> {
  const job = await videoGenerationQueue.getJob(jobId);

  if (job) {
    await job.remove();
  }
}

/**
 * Clean up old completed and failed jobs
 */
export async function cleanupOldJobs(
  gracePeriodMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<{ cleaned: number }> {
  // Clean completed jobs older than grace period
  const completedCleaned = await videoGenerationQueue.clean(
    gracePeriodMs,
    100,
    'completed'
  );

  // Clean failed jobs older than grace period
  const failedCleaned = await videoGenerationQueue.clean(
    gracePeriodMs,
    100,
    'failed'
  );

  return {
    cleaned: completedCleaned.length + failedCleaned.length,
  };
}

/**
 * Process video generation jobs
 * This would typically run in a separate worker process
 */
export function createVideoGenerationWorker(
  processor: (job: Job<VideoGenerationJobData>) => Promise<any>
) {
  return new Worker('video-generation', processor, {
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
export function getRedisConnection(): IORedis {
  return connection;
}
