# Agent 3: Background Job Processing - Implementation Prompt

## Context
You are implementing background job processing for the Sora Video Generator application.

**Prerequisites Completed:**
- ✅ Agent 1: Security & Infrastructure (rate limiting, validation, encryption)
- ✅ Agent 2: Database & Persistence (Prisma, repositories, API routes)

**Current State:**
- Jobs are added to BullMQ queue in `lib/queue.ts`
- No workers are processing jobs
- Database has `video_jobs` table tracking job status
- API integrations exist in `lib/integrations/sora.ts` and `lib/integrations/veo.ts`

## Your Mission
Create BullMQ worker processes that consume jobs from the queue, call provider APIs, poll for completion, upload videos to storage, and update the database with results.

---

## Task 1: Create Worker Entry Point

### File: `workers/video-generation-worker.ts`
```typescript
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { generateSoraVideo, getSoraVideoStatus } from '../lib/integrations/sora';
import { generateVeoVideo, getVeoVideoStatus } from '../lib/integrations/veo';
import { updateVideoJob } from '../lib/repositories/videoJobs';
import { uploadVideo } from '../lib/storage';
import { env } from '../lib/env';

/**
 * Video Generation Worker
 * Processes video generation jobs from BullMQ queue
 */

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

interface VideoJobData {
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

const worker = new Worker(
  'video-generation',
  async (job: Job<VideoJobData>) => {
    const startTime = Date.now();
    console.log(`[Worker] Starting job ${job.id}`, {
      jobId: job.data.jobId,
      provider: job.data.provider,
      scene: job.data.sceneId,
    });

    try {
      const {
        jobId,
        provider,
        prompt,
        apiKey,
        model,
        size,
        resolution,
        duration,
      } = job.data;

      // Update job status to processing in database
      await updateVideoJob(jobId, {
        status: 'processing',
      });

      // Step 1: Submit video generation request to provider
      let providerJobId: string;
      let providerResponse: any;

      if (provider === 'sora') {
        console.log(`[Worker] Calling Sora API for job ${jobId}`);
        providerResponse = await generateSoraVideo(apiKey, {
          prompt,
          model: model as 'sora-2' | 'sora-2-pro',
          size: size || '1280x720',
          seconds: duration,
        });
        providerJobId = providerResponse.jobId;
      } else {
        console.log(`[Worker] Calling Veo API for job ${jobId}`);
        const projectId = env.GOOGLE_CLOUD_PROJECT_ID;
        if (!projectId) {
          throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
        }
        providerResponse = await generateVeoVideo(
          { projectId, apiKey },
          {
            prompt,
            model: model || 'veo-3.1',
            resolution: resolution || '720p',
            duration,
            fps: 24,
          }
        );
        providerJobId = providerResponse.jobId;
      }

      // Save provider job ID to database
      await updateVideoJob(jobId, {
        providerJobId,
      });

      console.log(`[Worker] Provider job started: ${providerJobId}`);

      // Step 2: Poll provider for completion
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5s intervals
      const pollInterval = 5000; // 5 seconds

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        attempts++;

        console.log(
          `[Worker] Polling attempt ${attempts}/${maxAttempts} for job ${jobId}`
        );

        let status: any;

        if (provider === 'sora') {
          status = await getSoraVideoStatus(apiKey, providerJobId);
        } else {
          const projectId = env.GOOGLE_CLOUD_PROJECT_ID!;
          status = await getVeoVideoStatus(
            { projectId, apiKey },
            providerJobId
          );
        }

        // Update progress in BullMQ job
        const progressPercent = Math.min((attempts / maxAttempts) * 90, 90);
        await job.updateProgress(progressPercent);

        // Check if completed
        if (status.status === 'completed' && status.videoUrl) {
          console.log(`[Worker] Video generation completed for job ${jobId}`);

          // Step 3: Download video from provider
          console.log(`[Worker] Downloading video from ${status.videoUrl}`);
          const videoResponse = await fetch(status.videoUrl);
          if (!videoResponse.ok) {
            throw new Error(
              `Failed to download video: ${videoResponse.statusText}`
            );
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

          // Step 4: Upload to our storage (Vercel Blob)
          console.log(`[Worker] Uploading video to storage for job ${jobId}`);
          const { url: finalVideoUrl } = await uploadVideo(videoBuffer, {
            filename: `${jobId}.mp4`,
            contentType: 'video/mp4',
          });

          // Step 5: Update database with final URL and completion
          await updateVideoJob(jobId, {
            status: 'completed',
            videoUrl: finalVideoUrl,
            thumbnailUrl: status.thumbnailUrl,
            completedAt: new Date(),
          });

          // Update final progress
          await job.updateProgress(100);

          const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(
            `[Worker] Job ${jobId} completed successfully in ${elapsedTime}s`
          );

          return {
            success: true,
            videoUrl: finalVideoUrl,
            elapsedTime: parseFloat(elapsedTime),
          };
        }

        // Check if failed
        if (status.status === 'failed') {
          const errorMsg = status.error || 'Provider generation failed';
          console.error(`[Worker] Provider failed for job ${jobId}:`, errorMsg);
          throw new Error(errorMsg);
        }

        // Continue polling
        console.log(
          `[Worker] Job ${jobId} status: ${status.status}, continuing to poll...`
        );
      }

      // Timeout
      throw new Error(
        `Timeout: Video generation did not complete within ${(maxAttempts * pollInterval) / 1000}s`
      );
    } catch (error: any) {
      console.error(`[Worker] Job ${job.data.jobId} failed:`, error);

      // Update database with failure
      await updateVideoJob(job.data.jobId, {
        status: 'failed',
        errorMessage: error.message || 'Unknown error occurred',
      });

      // Re-throw to mark job as failed in BullMQ
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10, // Max 10 jobs per minute
      duration: 60000,
    },
  }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(`✅ [Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ [Worker] Worker error:', err);
});

worker.on('stalled', (jobId) => {
  console.warn(`⚠️  [Worker] Job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log('🚀 Video generation worker started');
console.log(`   - Concurrency: 2`);
console.log(`   - Rate limit: 10 jobs/min`);
console.log(`   - Redis: ${env.REDIS_URL}`);
```

---

## Task 2: Update Queue Configuration

### Update: `lib/queue.ts`

Add retry configuration and job options:

```typescript
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Video generation queue
export const videoGenerationQueue = new Queue('video-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 500, // Keep last 500 failed jobs
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('video-generation', {
  connection,
});

// Listen to global events
queueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue] Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Job ${jobId} failed:`, failedReason);
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

export async function addVideoGenerationJob(data: VideoGenerationJobData) {
  const job = await videoGenerationQueue.add('generate-video', data, {
    jobId: data.jobId, // Use database job ID as BullMQ job ID
  });

  console.log(`[Queue] Added job ${job.id} to queue`);
  return job;
}

export async function getJobStatus(jobId: string) {
  const job = await videoGenerationQueue.getJob(jobId);
  return job;
}

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
    total: waiting + active + delayed,
  };
}

export async function getFailedJobs(limit = 10) {
  return await videoGenerationQueue.getFailed(0, limit);
}

export async function retryFailedJob(jobId: string) {
  const job = await videoGenerationQueue.getJob(jobId);
  if (job) {
    await job.retry();
    return true;
  }
  return false;
}

export async function removeJob(jobId: string) {
  const job = await videoGenerationQueue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

// Cleanup old jobs periodically
export async function cleanupOldJobs() {
  await videoGenerationQueue.clean(3600 * 1000, 100, 'completed'); // Clean completed jobs older than 1 hour
  await videoGenerationQueue.clean(86400 * 1000, 500, 'failed'); // Clean failed jobs older than 24 hours
}
```

---

## Task 3: Add Worker Management Scripts

### Update: `package.json`

Add worker scripts:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "worker:dev": "tsx watch workers/video-generation-worker.ts",
    "worker:start": "node dist/workers/video-generation-worker.js",
    "worker:build": "tsc workers/**/*.ts --outDir dist/workers --esModuleInterop --moduleResolution node --module commonjs --target es2020",
    "dev:all": "concurrently \"npm run dev\" \"npm run worker:dev\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "next lint",
    "generate-key": "node scripts/generate-encryption-key.js"
  }
}
```

Install concurrently for parallel execution:
```bash
npm install -D concurrently tsx
```

---

## Task 4: Create Admin/Monitoring Endpoints

### File: `src/app/api/admin/queue/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats, getFailedJobs } from '@/lib/queue';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

/**
 * GET /api/admin/queue
 * Get queue statistics and health
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const stats = await getQueueStats();
    const recentFailures = await getFailedJobs(5);

    return NextResponse.json({
      stats,
      recentFailures: recentFailures.map((job) => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      })),
      healthy: stats.active > 0 || stats.waiting > 0,
    });
  } catch (error: any) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/admin/queue/retry/[jobId]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { retryFailedJob } from '@/lib/queue';
import { validateRequest, jobIdParamsSchema } from '@/lib/validation';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

/**
 * POST /api/admin/queue/retry/[jobId]
 * Retry a failed job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const awaitedParams = await params;
    const validation = validateRequest(jobIdParamsSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { jobId } = validation.data;
    const retried = await retryFailedJob(jobId);

    if (!retried) {
      return NextResponse.json(
        { error: 'Job not found or cannot be retried' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
    });
  } catch (error: any) {
    console.error('Retry job error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry job' },
      { status: 500 }
    );
  }
}
```

---

## Task 5: Add Worker Health Checks

### File: `workers/health-check.ts`
```typescript
import IORedis from 'ioredis';
import { env } from '../lib/env';

/**
 * Worker health check utility
 * Can be called by monitoring systems
 */

const redis = new IORedis(env.REDIS_URL);

export async function checkWorkerHealth() {
  try {
    // Check Redis connection
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    // Check if workers are active
    const workerKeys = await redis.keys('bull:video-generation:*:active');
    const hasActiveWorkers = workerKeys.length > 0;

    await redis.quit();

    return {
      healthy: true,
      redis: 'connected',
      activeWorkers: hasActiveWorkers,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// CLI health check
if (require.main === module) {
  checkWorkerHealth()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.healthy ? 0 : 1);
    })
    .catch((error) => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}
```

### File: `src/app/api/health/worker/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { checkWorkerHealth } from '@/workers/health-check';

/**
 * GET /api/health/worker
 * Worker health check endpoint
 */
export async function GET() {
  const health = await checkWorkerHealth();

  return NextResponse.json(health, {
    status: health.healthy ? 200 : 503,
  });
}
```

---

## Task 6: Production Deployment Setup

### Create: `Dockerfile.worker`
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build worker
RUN npm run worker:build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/workers ./dist/workers
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/package.json ./package.json

# Run the worker
CMD ["npm", "run", "worker:start"]
```

### Create: `docker-compose.worker.yml`
```yaml
version: '3.8'

services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
      - DATABASE_URL=${DATABASE_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - BLOB_READ_WRITE_TOKEN=${BLOB_READ_WRITE_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
    restart: unless-stopped
    depends_on:
      - redis
    deploy:
      replicas: 2 # Run 2 worker instances

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Create: `scripts/start-worker.sh`
```bash
#!/bin/bash

# Worker startup script for production
# Usage: ./scripts/start-worker.sh

set -e

echo "Starting video generation worker..."

# Check environment variables
required_vars=("REDIS_URL" "DATABASE_URL" "ENCRYPTION_KEY" "BLOB_READ_WRITE_TOKEN")

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

# Build worker if needed
if [ ! -d "dist/workers" ]; then
  echo "Building worker..."
  npm run worker:build
fi

# Start worker
echo "Worker starting..."
npm run worker:start
```

Make executable:
```bash
chmod +x scripts/start-worker.sh
```

---

## Task 7: Add Monitoring and Logging

### Create: `lib/logger.ts`
```typescript
/**
 * Structured logging utility for workers
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  jobId?: string;
  provider?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

Update worker to use logger:
```typescript
import { logger } from '../lib/logger';

// Replace console.log with:
logger.info('Video generation worker started', {
  concurrency: 2,
  rateLimit: '10/min',
});

logger.info('Job started', {
  jobId: job.data.jobId,
  provider: job.data.provider,
  action: 'video-generation',
});
```

---

## Task 8: Testing

### Create: `test/workers/video-generation.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { videoGenerationQueue, addVideoGenerationJob } from '@/lib/queue';
import { prisma } from '@/lib/db';
import { createVideoJob } from '@/lib/repositories/videoJobs';

describe('Video Generation Worker', () => {
  beforeAll(async () => {
    // Clean test data
    await prisma.videoJob.deleteMany({
      where: { storyboardId: 'test-storyboard' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await videoGenerationQueue.close();
  });

  it('should process video generation job', async () => {
    // Create job in database
    const dbJob = await createVideoJob({
      storyboardId: 'test-storyboard',
      sceneId: 'test-scene',
      provider: 'sora',
      prompt: 'Test prompt',
      cost: 0.8,
    });

    // Add to queue
    await addVideoGenerationJob({
      jobId: dbJob.id,
      storyboardId: 'test-storyboard',
      sceneId: 'test-scene',
      provider: 'sora',
      prompt: 'Test prompt',
      apiKey: 'test-key',
      model: 'sora-2',
      duration: 8,
    });

    // Wait for processing (in real test, mock the API calls)
    // This is a placeholder - actual test needs worker running
    const job = await videoGenerationQueue.getJob(dbJob.id);
    expect(job).toBeTruthy();
    expect(job?.data.jobId).toBe(dbJob.id);
  }, 30000);
});
```

---

## Success Criteria

✅ **Checklist:**
- [ ] Worker file created and compiles
- [ ] BullMQ queue configured with retry logic
- [ ] Worker processes jobs from queue
- [ ] Database updated with job status
- [ ] Videos uploaded to storage
- [ ] Error handling and retry logic working
- [ ] Admin endpoints for monitoring
- [ ] Health check endpoint working
- [ ] Structured logging implemented
- [ ] Docker setup for production
- [ ] Tests written

✅ **Manual Testing:**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Next.js dev server
npm run dev

# Terminal 3: Start worker
npm run worker:dev

# Terminal 4: Trigger job
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: api_key_sora=..." \
  -d '{
    "storyboardId": "...",
    "provider": "sora",
    "model": "sora-2",
    "scene": {...},
    "character": {...},
    "presetKey": "cinematic"
  }'

# Check queue stats
curl http://localhost:3000/api/admin/queue

# Check worker health
curl http://localhost:3000/api/health/worker
```

✅ **Production Deployment:**
```bash
# Build worker
npm run worker:build

# Deploy with Docker
docker-compose -f docker-compose.worker.yml up -d

# Or deploy to cloud
# - Railway: Create worker service pointing to Dockerfile.worker
# - Heroku: Create worker dyno with npm run worker:start
# - Render: Create background worker pointing to worker:start
```

---

## Files to Create/Modify

**Create:**
- `workers/video-generation-worker.ts`
- `workers/health-check.ts`
- `src/app/api/admin/queue/route.ts`
- `src/app/api/admin/queue/retry/[jobId]/route.ts`
- `src/app/api/health/worker/route.ts`
- `lib/logger.ts`
- `Dockerfile.worker`
- `docker-compose.worker.yml`
- `scripts/start-worker.sh`
- `test/workers/video-generation.test.ts`

**Modify:**
- `lib/queue.ts` (add retry config, cleanup functions)
- `package.json` (add worker scripts)

---

## Important Notes

1. **Worker Scaling**: In production, run multiple worker instances (2-4) for redundancy
2. **Rate Limiting**: Worker has built-in rate limiting (10 jobs/min) to avoid API overload
3. **Retry Logic**: Jobs retry 3 times with exponential backoff (5s, 10s, 20s)
4. **Memory**: Each worker uses ~50-100MB. Monitor and adjust concurrency based on available memory
5. **Logging**: All worker logs are JSON structured for easy parsing by log aggregators
6. **Graceful Shutdown**: Worker handles SIGTERM/SIGINT for safe shutdowns

## Common Issues & Solutions

**Worker not picking up jobs:**
- Check Redis connection
- Verify queue name matches ('video-generation')
- Check worker is running: `npm run worker:dev`

**Jobs failing immediately:**
- Check API keys are valid
- Verify provider APIs are accessible
- Check error messages in database

**Memory issues:**
- Reduce concurrency from 2 to 1
- Implement job chunking for large videos
- Monitor with `process.memoryUsage()`

## After Completion

When Agent 3 is complete, the application will:
- ✅ Process video generation jobs in background
- ✅ Handle failures with automatic retries
- ✅ Update database with real-time status
- ✅ Upload completed videos to storage
- ✅ Provide monitoring and health checks
- ✅ Scale horizontally with multiple workers
- ✅ Be production-ready for video generation

Next: Agent 4 (Real API Integrations) or Agent 5 (UI Enhancements)
