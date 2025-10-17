import { Job } from 'bullmq';
import { createVideoGenerationWorker, VideoGenerationJobData } from '../lib/queue';
import { generateSoraVideo, getSoraVideoStatus, SoraVideoResponse } from '../lib/integrations/sora';
import { generateVeoVideo, getVeoVideoStatus, VeoVideoResponse } from '../lib/integrations/veo';
import { downloadVideo, uploadVideo } from '../lib/storage';
import { updateVideoJob } from '../lib/repositories/videoJobs';
import { createLogger } from '../lib/logger';
import { SoraGenerateRequest, VeoGenerateRequest } from '../lib/types';

/**
 * Video Generation Worker
 * Processes video generation jobs from BullMQ queue
 */

const logger = createLogger({ service: 'video-worker' });

// Configuration
const POLLING_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 120; // 10 minutes (120 * 5s = 600s)

/**
 * Main job processor
 */
async function processVideoJob(job: Job<VideoGenerationJobData>): Promise<void> {
  const jobLogger = logger.child({ jobId: job.data.jobId, provider: job.data.provider });

  jobLogger.info('Starting video generation job', {
    sceneId: job.data.sceneId,
    storyboardId: job.data.storyboardId,
    duration: job.data.duration,
  });

  try {
    // Update database status to processing
    await updateVideoJob(job.data.jobId, {
      status: 'processing',
    });

    // Step 1: Initialize video generation with provider
    jobLogger.info('Initiating video generation with provider');
    const providerJobId = await initiateVideoGeneration(job.data, jobLogger);

    // Update database with provider job ID
    await updateVideoJob(job.data.jobId, {
      providerJobId,
    });

    jobLogger.info('Provider job initiated', { providerJobId });

    // Step 2: Poll for completion
    jobLogger.info('Starting to poll for video completion');
    const videoResult = await pollForCompletion(
      job,
      providerJobId,
      job.data.provider,
      job.data.apiKey,
      jobLogger
    );

    if (!videoResult.videoUrl) {
      throw new Error('Video generation completed but no video URL returned');
    }

    jobLogger.info('Video generation completed', { videoUrl: videoResult.videoUrl });

    // Step 3: Download video from provider
    jobLogger.info('Downloading video from provider', { url: videoResult.videoUrl });
    const videoBuffer = await downloadVideo(videoResult.videoUrl);

    jobLogger.info('Video downloaded', { sizeBytes: videoBuffer.length });

    // Step 4: Upload to Vercel Blob Storage
    jobLogger.info('Uploading video to blob storage');
    const uploadResult = await uploadVideo(videoBuffer, {
      filename: `scene-${job.data.sceneId}.mp4`,
      contentType: 'video/mp4',
      addRandomSuffix: true,
    });

    jobLogger.info('Video uploaded to blob storage', { url: uploadResult.url });

    // Step 5: Update database with final results
    await updateVideoJob(job.data.jobId, {
      status: 'completed',
      videoUrl: uploadResult.url,
      thumbnailUrl: videoResult.thumbnailUrl,
      completedAt: new Date(),
    });

    // Update job progress to 100%
    await job.updateProgress(100);

    jobLogger.info('Job completed successfully');
  } catch (error: any) {
    jobLogger.error('Job failed', error, {
      errorMessage: error.message,
    });

    // Update database with error and full context
    await updateVideoJob(job.data.jobId, {
      status: 'failed',
      errorMessage: error.message,
      metadata: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          timestamp: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
          provider: job.data.provider,
        },
      },
      completedAt: new Date(),
    });

    // Re-throw error so BullMQ can handle retries
    throw error;
  }
}

/**
 * Initiate video generation with the appropriate provider
 */
async function initiateVideoGeneration(
  data: VideoGenerationJobData,
  logger: any
): Promise<string> {
  if (data.provider === 'sora') {
    const request: SoraGenerateRequest = {
      prompt: data.prompt,
      model: data.model as 'sora-2' | 'sora-2-pro',
      size: (data.size || '1280x720') as any,
      seconds: data.duration as 4 | 8 | 12,
    };

    const result = await generateSoraVideo(data.apiKey, request);
    return result.jobId;
  } else if (data.provider === 'veo') {
    // Extract project ID from API key or use environment variable
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';

    const request: VeoGenerateRequest = {
      prompt: data.prompt,
      model: data.model as any,
      resolution: (data.resolution || '720p') as '720p' | '1080p',
      duration: Math.min(data.duration, 8) as 4 | 6 | 8, // Veo max is 8 seconds
      fps: 24,
    };

    const result = await generateVeoVideo(
      { projectId, apiKey: data.apiKey },
      request
    );
    return result.jobId;
  } else {
    throw new Error(`Unknown provider: ${data.provider}`);
  }
}

/**
 * Poll provider for video completion with exponential backoff
 */
async function pollForCompletion(
  job: Job<VideoGenerationJobData>,
  providerJobId: string,
  provider: 'sora' | 'veo',
  apiKey: string,
  logger: any
): Promise<SoraVideoResponse | VeoVideoResponse> {
  let attempts = 0;

  while (attempts < MAX_POLLING_ATTEMPTS) {
    attempts++;

    try {
      // Check status with provider
      const status = await checkProviderStatus(provider, providerJobId, apiKey);

      // Calculate progress percentage
      const progress = Math.min(
        Math.floor((attempts / MAX_POLLING_ATTEMPTS) * 90),
        90
      );
      await job.updateProgress(progress);

      logger.debug('Polling attempt', {
        attempt: attempts,
        status: status.status,
        progress,
      });

      // Check if completed
      if (status.status === 'completed') {
        return status;
      }

      // Check if failed
      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await sleep(POLLING_INTERVAL_MS);
    } catch (error: any) {
      logger.warn('Polling error', {
        attempt: attempts,
        error: error.message,
      });

      // If it's a status check error and we haven't exceeded max attempts, continue
      if (attempts < MAX_POLLING_ATTEMPTS) {
        await sleep(POLLING_INTERVAL_MS);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Video generation timed out after ${MAX_POLLING_ATTEMPTS} attempts (${
      (MAX_POLLING_ATTEMPTS * POLLING_INTERVAL_MS) / 1000
    }s)`
  );
}

/**
 * Check video status with the appropriate provider
 */
async function checkProviderStatus(
  provider: 'sora' | 'veo',
  providerJobId: string,
  apiKey: string
): Promise<SoraVideoResponse | VeoVideoResponse> {
  if (provider === 'sora') {
    return await getSoraVideoStatus(apiKey, providerJobId);
  } else if (provider === 'veo') {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    return await getVeoVideoStatus({ projectId, apiKey }, providerJobId);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create and start the worker
 */
const worker = createVideoGenerationWorker(processVideoJob);

// Event handlers
worker.on('completed', (job) => {
  logger.info('Job completed', {
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', err, {
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    failedReason: job?.failedReason,
  });
});

worker.on('error', (err) => {
  logger.error('Worker error', err);
});

worker.on('stalled', (jobId) => {
  logger.warn('Job stalled', { jobId });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  try {
    await worker.close();
    logger.info('Worker closed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

logger.info('Video generation worker started', {
  concurrency: 2,
  maxPollingAttempts: MAX_POLLING_ATTEMPTS,
  pollingIntervalMs: POLLING_INTERVAL_MS,
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason as any, {
    promise: promise.toString(),
  });
});
