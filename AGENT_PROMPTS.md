# Agent Prompts for Completing Sora Video Generator

This document contains detailed prompts for completing the remaining work on the Sora Video Generator project. Each prompt is designed to be run by a separate agent and can work independently.

---

## Agent 1: Security & Infrastructure Fixes (CRITICAL - Run First)

**Priority**: 🔴 CRITICAL - Blocking Production
**Estimated Time**: 2-3 days
**Dependencies**: None (can start immediately)

### Objective

Fix critical security vulnerabilities and infrastructure issues that are blocking production deployment.

### Context

Review these files to understand current implementation:

- `IMPLEMENTATION_CHECKLIST.md` - See sections on Critical Blockers
- `src/app/api/auth/session/route.ts` - Session management implementation
- `lib/validation.ts` - Zod schemas for validation
- `lib/env.ts` - Environment validation

### Tasks

#### 1. Fix API Key Security Vulnerability (CRITICAL)

**Problem**: API keys are currently stored in client-side state and localStorage, making them vulnerable to theft.

**Current Code Location**:

- `src/app/api/auth/session/route.ts` - Already has session implementation
- API key components use session correctly

**What to Verify**:

```typescript
// Check that these are implemented correctly:
- HTTP-only cookies (already done in session/route.ts)
- Server-side session management (already done)
- Encrypted storage (already done)
- No client-side key exposure (verify in components)
```

**Action Items**:

- [ ] Verify `/api/auth/session` is working correctly
- [ ] Test cookie is HTTP-only and secure
- [ ] Verify keys are never sent to client
- [ ] Test key retrieval in `/api/video/generate`
- [ ] Remove any remaining client-side key storage

#### 2. Add Comprehensive Input Validation

**Problem**: API routes accept user input without Zod validation despite schemas being defined.

**Files to Update**:

- `src/app/api/video/generate/route.ts` - Already has validation
- `src/app/api/video/status/[jobId]/route.ts` - Needs validation
- `src/app/api/auth/session/route.ts` - Needs validation

**Action Items**:

- [ ] Add Zod validation to `/api/video/status/[jobId]`
- [ ] Add Zod validation to `/api/auth/session`
- [ ] Create additional validation schemas in `lib/validation.ts`:

  ```typescript
  export const sessionRequestSchema = z.object({
    provider: z.enum(["sora", "veo"]),
    apiKey: z.string().min(10).max(500),
    projectId: z.string().optional(),
  });

  export const jobStatusSchema = z.object({
    jobId: z.string().uuid(),
  });
  ```

- [ ] Test all validation with invalid inputs
- [ ] Return proper 400 errors with details

#### 3. Implement Rate Limiting

**Problem**: No rate limiting allows API abuse and cost overruns.

**Implementation**:

```bash
# Install rate limiting package
npm install @upstash/ratelimit @upstash/redis
```

**Files to Create**:

- `lib/ratelimit.ts` - Rate limiting utilities

**Files to Update**:

- `src/app/api/video/generate/route.ts` - Add rate limiting
- `src/app/api/video/compile/route.ts` - Add rate limiting
- `src/app/api/auth/session/route.ts` - Add rate limiting

**Action Items**:

- [ ] Create rate limiting middleware in `lib/ratelimit.ts`
- [ ] Add to video generation endpoint (10 requests/min)
- [ ] Add to compilation endpoint (5 requests/min)
- [ ] Add to session endpoint (20 requests/min)
- [ ] Return proper 429 responses with headers
- [ ] Test rate limiting works

**Example Implementation**:

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const videoGenerationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "ratelimit:video-gen",
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
```

#### 4. Fix Memory Leaks in Polling (ALREADY DONE)

**Status**: ✅ Already implemented via `usePolling` hook

**Verify**:

- [ ] Check `src/app/hooks/usePolling.ts` has proper cleanup
- [ ] Verify AbortController usage in `StoryboardEditor.tsx`
- [ ] Test unmounting during active polling
- [ ] Verify no setTimeout leaks

#### 5. Environment Variable Security

**Problem**: Need to ensure production environment variables are properly secured.

**Action Items**:

- [ ] Update `.env.example` with all required variables
- [ ] Document required vs optional variables
- [ ] Add validation warnings for missing production vars
- [ ] Create deployment checklist

### Success Criteria

- [ ] All API keys stored in HTTP-only cookies only
- [ ] All API routes have Zod validation
- [ ] Rate limiting active on all critical endpoints
- [ ] No memory leaks in polling
- [ ] Environment variables documented
- [ ] Security review passes

### Testing Checklist

```bash
# Test API key security
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"provider":"sora","apiKey":"test-key"}'
# Should set HTTP-only cookie

# Test rate limiting
for i in {1..15}; do
  curl http://localhost:3000/api/video/generate
done
# Should see 429 after 10 requests

# Test validation
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'
# Should return 400 with validation errors
```

---

## Agent 2: Database & Persistence Layer

**Priority**: 🔴 CRITICAL
**Estimated Time**: 2-3 days
**Dependencies**: None (can run in parallel with Agent 1)

### Objective

Connect PostgreSQL database, implement ORM, and create data persistence layer.

### Context

- Database schema already exists in `database/schema.sql`
- Need to choose between Prisma or Drizzle ORM
- All data currently stored in localStorage only

### Tasks

#### 1. Choose and Set Up ORM

**Recommendation**: Use Prisma (better TypeScript support, great dev experience)

**Installation**:

```bash
npm install prisma @prisma/client
npm install -D prisma
npx prisma init
```

**Action Items**:

- [ ] Initialize Prisma
- [ ] Create `prisma/schema.prisma` based on `database/schema.sql`
- [ ] Set up database connection in `.env`
- [ ] Generate Prisma Client
- [ ] Create database connection utility in `lib/db.ts`

**Example Prisma Schema**:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model VideoJob {
  id              String   @id @default(uuid())
  storyboardId    String
  sceneId         String
  provider        String
  status          String
  prompt          String   @db.Text
  providerJobId   String?
  videoUrl        String?  @db.Text
  thumbnailUrl    String?  @db.Text
  cost            Decimal? @db.Decimal(10, 4)
  errorMessage    String?  @db.Text
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  metadata        Json?

  @@index([storyboardId])
  @@index([status])
  @@index([createdAt])
}

model UserApiKey {
  id            String   @id @default(uuid())
  userId        String
  provider      String
  encryptedKey  String   @db.Text
  keyHash       String
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime?

  @@unique([userId, provider])
  @@index([userId])
}

model CompiledVideo {
  id              String   @id @default(uuid())
  storyboardId    String
  scenesOrder     Json
  finalVideoUrl   String?  @db.Text
  durationSeconds Int?
  fileSizeBytes   BigInt?
  createdAt       DateTime @default(now())
  metadata        Json?
}

model Storyboard {
  id          String   @id @default(uuid())
  userId      String?
  name        String
  presetKey   String
  character   Json
  scenes      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([createdAt])
}
```

#### 2. Create Database Utilities

**Files to Create**:

- `lib/db.ts` - Database connection and utilities
- `lib/repositories/videoJobs.ts` - Video job operations
- `lib/repositories/storyboards.ts` - Storyboard operations
- `lib/repositories/apiKeys.ts` - API key operations

**Action Items**:

- [ ] Create singleton Prisma client
- [ ] Create repository pattern for each model
- [ ] Add TypeScript types for queries
- [ ] Add error handling
- [ ] Add connection pooling

**Example Implementation**:

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// lib/repositories/videoJobs.ts
import { prisma } from "../db";
import { VideoJob, Prisma } from "@prisma/client";

export async function createVideoJob(data: {
  storyboardId: string;
  sceneId: string;
  provider: string;
  prompt: string;
  providerJobId?: string;
}) {
  return await prisma.videoJob.create({
    data: {
      ...data,
      status: "pending",
    },
  });
}

export async function updateVideoJob(id: string, data: Partial<VideoJob>) {
  return await prisma.videoJob.update({
    where: { id },
    data,
  });
}

export async function getVideoJobsByStoryboard(storyboardId: string) {
  return await prisma.videoJob.findMany({
    where: { storyboardId },
    orderBy: { createdAt: "asc" },
  });
}

// ... more CRUD operations
```

#### 3. Implement Data Migrations

**Files to Create**:

- `prisma/migrations/` - Migration files

**Action Items**:

- [ ] Run initial migration: `npx prisma migrate dev --name init`
- [ ] Create migration for existing localStorage data
- [ ] Test migrations on local database
- [ ] Create rollback strategy
- [ ] Document migration process

#### 4. Update API Routes to Use Database

**Files to Update**:

- `src/app/api/video/generate/route.ts` - Save jobs to DB
- `src/app/api/video/status/[jobId]/route.ts` - Query jobs from DB
- `src/app/api/auth/session/route.ts` - Save API keys to DB
- New: `src/app/api/storyboards/route.ts` - CRUD for storyboards

**Action Items**:

- [ ] Replace in-memory storage with DB queries
- [ ] Add transaction support where needed
- [ ] Add proper error handling
- [ ] Test all CRUD operations

**Example Update**:

```typescript
// src/app/api/video/generate/route.ts - UPDATE
import { createVideoJob } from "@/lib/repositories/videoJobs";

export async function POST(request: NextRequest) {
  // ... existing validation ...

  // Create job in database instead of in-memory
  const videoJob = await createVideoJob({
    storyboardId,
    sceneId: scene.id,
    provider,
    prompt,
    providerJobId: data.jobId,
  });

  // Add to BullMQ queue
  await addVideoGenerationJob({
    jobId: videoJob.id,
    // ... other params
  });

  return NextResponse.json({
    success: true,
    jobId: videoJob.id,
    // ...
  });
}
```

#### 5. Create Storyboard Persistence

**Files to Create**:

- `src/app/api/storyboards/route.ts` - List and create
- `src/app/api/storyboards/[id]/route.ts` - Get, update, delete

**Action Items**:

- [ ] Create CRUD API routes for storyboards
- [ ] Update StoryboardEditor to save/load from API
- [ ] Add auto-save functionality
- [ ] Migrate localStorage data to DB
- [ ] Add version control for storyboards

#### 6. Set Up Database for Development

**Action Items**:

- [ ] Create local PostgreSQL database
- [ ] Add database connection to `.env.local`
- [ ] Run migrations
- [ ] Seed test data
- [ ] Document setup process

**Setup Script**:

```bash
# scripts/setup-db.sh
#!/bin/bash

# Create database
createdb sora_video_generator_dev

# Run migrations
npx prisma migrate dev

# Seed data (optional)
npx prisma db seed
```

### Success Criteria

- [ ] Prisma set up and connected
- [ ] All database models created
- [ ] Migration system working
- [ ] Repository pattern implemented
- [ ] All API routes use database
- [ ] Storyboard persistence working
- [ ] LocalStorage migration path exists
- [ ] Tests pass

### Testing Checklist

```bash
# Test database connection
npx prisma db pull

# Test migrations
npx prisma migrate dev

# Test queries
npx prisma studio

# Run integration tests
npm test -- repositories
```

---

## Agent 3: Background Job Processing (BullMQ Workers)

**Priority**: 🔴 CRITICAL
**Estimated Time**: 2-3 days
**Dependencies**: Agent 2 (Database) should be complete first

### Objective

Implement BullMQ worker processes for background video generation.

### Context

- BullMQ already configured in `lib/queue.ts`
- Jobs are added to queue but no workers process them
- Need separate worker process from Next.js server

### Tasks

#### 1. Create Worker Process

**Files to Create**:

- `workers/video-generation-worker.ts` - Main worker file
- `workers/utils/videoProcessor.ts` - Video processing logic
- `workers/utils/providerClients.ts` - API client wrappers

**Action Items**:

- [ ] Create worker entry point
- [ ] Set up worker process management
- [ ] Add logging and monitoring
- [ ] Add error handling and retries
- [ ] Test worker independently

**Example Worker**:

```typescript
// workers/video-generation-worker.ts
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import {
  generateSoraVideo,
  getSoraVideoStatus,
} from "../lib/integrations/sora";
import { generateVeoVideo, getVeoVideoStatus } from "../lib/integrations/veo";
import { updateVideoJob } from "../lib/repositories/videoJobs";
import { uploadVideo } from "../lib/storage";

const connection = new IORedis(process.env.REDIS_URL!);

const worker = new Worker(
  "video-generation",
  async (job: Job) => {
    console.log(`Processing job ${job.id}`, job.data);

    const { jobId, provider, prompt, apiKey, model, duration } = job.data;

    try {
      // Update job status to processing
      await updateVideoJob(jobId, { status: "processing" });

      // Call provider API
      let providerJobId: string;
      if (provider === "sora") {
        const result = await generateSoraVideo(apiKey, {
          prompt,
          model,
          size: "1280x720",
          seconds: duration,
        });
        providerJobId = result.jobId;
      } else {
        const result = await generateVeoVideo(
          { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!, apiKey },
          {
            prompt,
            model,
            resolution: "720p",
            duration,
            fps: 24,
          }
        );
        providerJobId = result.jobId;
      }

      // Save provider job ID
      await updateVideoJob(jobId, { providerJobId });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const status =
          provider === "sora"
            ? await getSoraVideoStatus(apiKey, providerJobId)
            : await getVeoVideoStatus(
                { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!, apiKey },
                providerJobId
              );

        if (status.status === "completed" && status.videoUrl) {
          // Download video from provider
          const videoResponse = await fetch(status.videoUrl);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

          // Upload to our storage
          const { url } = await uploadVideo(videoBuffer, {
            filename: `${jobId}.mp4`,
            contentType: "video/mp4",
          });

          // Update job with final URL
          await updateVideoJob(jobId, {
            status: "completed",
            videoUrl: url,
            thumbnailUrl: status.thumbnailUrl,
            completedAt: new Date(),
          });

          return { success: true, videoUrl: url };
        }

        if (status.status === "failed") {
          throw new Error(status.error || "Provider generation failed");
        }

        attempts++;
        await job.updateProgress(Math.min((attempts / maxAttempts) * 100, 90));
      }

      throw new Error("Timeout waiting for video generation");
    } catch (error: any) {
      console.error(`Job ${jobId} failed:`, error);
      await updateVideoJob(jobId, {
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Video generation worker started");
```

#### 2. Add Worker Management

**Files to Create**:

- `package.json` - Add worker scripts
- `workers/start.ts` - Worker startup script
- `ecosystem.config.js` - PM2 configuration (optional)

**Action Items**:

- [ ] Add npm scripts for worker
- [ ] Create development worker runner
- [ ] Create production worker setup
- [ ] Add worker health checks
- [ ] Document worker deployment

**Update package.json**:

```json
{
  "scripts": {
    "worker:dev": "tsx watch workers/video-generation-worker.ts",
    "worker:start": "node dist/workers/video-generation-worker.js",
    "worker:build": "tsc workers/**/*.ts --outDir dist/workers"
  }
}
```

#### 3. Implement Job Retry Logic

**Action Items**:

- [ ] Configure retry attempts (3 attempts)
- [ ] Implement exponential backoff
- [ ] Add dead letter queue
- [ ] Handle rate limit errors specially
- [ ] Log retry attempts

**Example Configuration**:

```typescript
// In addVideoGenerationJob (lib/queue.ts)
export async function addVideoGenerationJob(data: VideoGenerationJobData) {
  return await videoGenerationQueue.add("generate-video", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // 24 hours
    },
  });
}
```

#### 4. Add Job Monitoring

**Files to Create**:

- `src/app/api/admin/jobs/route.ts` - Job monitoring API
- `lib/queue/monitoring.ts` - Queue metrics

**Action Items**:

- [ ] Create admin dashboard endpoint
- [ ] Add job statistics
- [ ] Monitor queue health
- [ ] Add alerts for failures
- [ ] Create cleanup tasks

**Example Monitoring**:

```typescript
// lib/queue/monitoring.ts
import { videoGenerationQueue } from "./index";

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    videoGenerationQueue.getWaitingCount(),
    videoGenerationQueue.getActiveCount(),
    videoGenerationQueue.getCompletedCount(),
    videoGenerationQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function getFailedJobs(limit = 10) {
  return await videoGenerationQueue.getFailed(0, limit);
}

export async function retryFailedJob(jobId: string) {
  const job = await videoGenerationQueue.getJob(jobId);
  if (job) {
    await job.retry();
  }
}
```

#### 5. Set Up Worker for Production

**Action Items**:

- [ ] Create Dockerfile for worker
- [ ] Set up worker deployment
- [ ] Configure environment variables
- [ ] Add logging to external service
- [ ] Set up monitoring/alerting

**Example Dockerfile**:

```dockerfile
# Dockerfile.worker
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run worker:build

CMD ["npm", "run", "worker:start"]
```

### Success Criteria

- [ ] Worker processes jobs from queue
- [ ] Retry logic works correctly
- [ ] Failed jobs are handled properly
- [ ] Job progress updates work
- [ ] Monitoring dashboard functional
- [ ] Production deployment ready

### Testing Checklist

```bash
# Start worker locally
npm run worker:dev

# Add test job
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check job status
curl http://localhost:3000/api/admin/jobs

# Test retry
curl -X POST http://localhost:3000/api/admin/jobs/retry/[jobId]
```

---

## Agent 4: Real API Integrations (Sora & Veo)

**Priority**: 🟡 HIGH (Blocked by API availability)
**Estimated Time**: 5-7 days
**Dependencies**: Agent 1 (Security) and Agent 3 (Workers) should be complete

### Objective

Implement real Sora 2 and Veo 3.1 API integrations when APIs become available.

### Context

- Current implementations in `lib/integrations/sora.ts` and `lib/integrations/veo.ts` are placeholders
- Sora 2 API [docs here](https://platform.openai.com/docs/guides/video-generation#sora-2-pro)
- Veo 3.1 API details need verification

### Tasks

#### 1. Research Current API Status

**Action Items**:

- [ ] Check OpenAI documentation for Sora API status
- [ ] Check Google AI documentation for Veo status
- [ ] Determine if APIs are available
- [ ] Get API access/credentials
- [ ] Review pricing and quotas

#### 2. Implement Sora 2 Integration

**Current File**: `lib/integrations/sora.ts`

**Action Items**:

- [ ] Research actual Sora API endpoint structure
- [ ] Update authentication method
- [ ] Implement video generation call
- [ ] Implement status polling
- [ ] Handle all error cases
- [ ] Add comprehensive logging
- [ ] Test with real API

**Known Challenges**:

- API structure is unknown (placeholder currently uses chat completion format)
- May need webhooks instead of polling
- Error handling for rate limits, content policy, etc.

**If API Not Available - Create Mock**:

```typescript
// lib/integrations/sora.ts
export async function generateSoraVideo(
  apiKey: string,
  request: SoraGenerateRequest
): Promise<{ jobId: string }> {
  // Check if we're in mock mode
  if (process.env.SORA_MOCK_MODE === "true") {
    return mockSoraGeneration(request);
  }

  // Real implementation when API available
  // TODO: Update when OpenAI releases Sora API
  throw new Error("Sora API not yet available");
}

async function mockSoraGeneration(request: SoraGenerateRequest) {
  // Generate mock job that completes after delay
  const jobId = `mock_${Date.now()}`;

  // Store in-memory for mock polling
  mockJobs.set(jobId, {
    status: "processing",
    createdAt: Date.now(),
    request,
  });

  // Simulate completion after 10 seconds
  setTimeout(() => {
    mockJobs.set(jobId, {
      status: "completed",
      videoUrl: `https://example.com/mock-video-${jobId}.mp4`,
      createdAt: Date.now(),
      request,
    });
  }, 10000);

  return { jobId };
}
```

#### 3. Implement Veo 3.1 Integration

**Current File**: `lib/integrations/veo.ts`

**Action Items**:

- [ ] Verify Vertex AI video generation API
- [ ] Set up Google Cloud authentication
- [ ] Implement video generation call
- [ ] Implement status polling
- [ ] Handle all error cases
- [ ] Test with real API

**Reference**: https://ai.google.dev/gemini-api/docs/video

**If API Not Available - Create Mock** (similar to Sora)

#### 4. Add Comprehensive Error Handling

**Error Cases to Handle**:

- Invalid API key
- Rate limiting (429)
- Content policy violations
- Insufficient credits
- Invalid prompts
- Timeout
- Network errors

**Action Items**:

- [ ] Create error type system
- [ ] Add specific error messages
- [ ] Implement retry logic for transient errors
- [ ] Log all errors
- [ ] Return user-friendly messages

**Example Error Handling**:

```typescript
// lib/integrations/errors.ts
export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "VideoGenerationError";
  }
}

export function handleSoraError(error: any): VideoGenerationError {
  if (error.status === 401) {
    return new VideoGenerationError(
      "Invalid API key",
      "INVALID_API_KEY",
      false
    );
  }
  if (error.status === 429) {
    return new VideoGenerationError(
      "Rate limit exceeded. Please try again later.",
      "RATE_LIMIT",
      true
    );
  }
  if (error.status === 400) {
    return new VideoGenerationError(
      `Invalid request: ${error.message}`,
      "INVALID_REQUEST",
      false
    );
  }

  return new VideoGenerationError(
    "An unexpected error occurred",
    "UNKNOWN_ERROR",
    true
  );
}
```

#### 5. Implement Webhook Support (if available)

**Action Items**:

- [ ] Research if providers support webhooks
- [ ] Create webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Update worker to use webhooks instead of polling
- [ ] Test webhook reliability

**Files to Create**:

- `src/app/api/webhooks/sora/route.ts`
- `src/app/api/webhooks/veo/route.ts`

#### 6. Add API Client Testing

**Action Items**:

- [ ] Create integration tests with mock APIs
- [ ] Test error scenarios
- [ ] Test timeout handling
- [ ] Test retry logic
- [ ] Document API behavior

### Success Criteria

- [ ] Sora API functional (or mock ready)
- [ ] Veo API functional (or mock ready)
- [ ] All error cases handled
- [ ] Comprehensive logging
- [ ] Tests pass
- [ ] Documentation complete

### Testing Checklist

```bash
# Test with mock mode
SORA_MOCK_MODE=true npm run worker:dev

# Test error handling
# (trigger various error scenarios)

# Test real API (when available)
SORA_MOCK_MODE=false npm run worker:dev
```

---

## Agent 5: UI Enhancement & Missing Components

**Priority**: 🟡 MEDIUM
**Estimated Time**: 3-4 days
**Dependencies**: Can run in parallel with other agents

### Objective

Create missing UI components and enhance existing ones for better UX.

### Context

Based on the system reminders, many components are already created:

- ✅ StoryboardEditor.tsx (updated)
- ✅ VideoCompiler.tsx
- ✅ DraggableSceneList.tsx
- ✅ CostTracker.tsx
- ✅ CollapsibleCard.tsx
- ✅ ActionBar.tsx
- ✅ VideoGenerationPanel.tsx
- ✅ ApiKeySettings.tsx
- ✅ GuestBanner.tsx
- ✅ LoadModal.tsx
- ✅ SceneTemplateSelector.tsx
- ✅ ToastContext.tsx

Need to verify all are implemented and working correctly.

### Tasks

#### 1. Verify All Components Exist

**Action Items**:

- [ ] Check all components mentioned in StoryboardEditor.tsx exist
- [ ] Test each component renders correctly
- [ ] Fix any import errors
- [ ] Ensure TypeScript types are correct

**Components to Verify**:

```typescript
// From StoryboardEditor.tsx imports:
import CharacterEditor from "./CharacterEditor"; // ✅ Exists
import PresetSelector from "./PresetSelector"; // ✅ Exists
import VideoCompiler from "./VideoCompiler"; // Verify
import DraggableSceneList from "./DraggableSceneList"; // Verify
import CostTracker from "./CostTracker"; // Verify
import CollapsibleCard from "./CollapsibleCard"; // Verify
import ActionBar from "./ActionBar"; // Verify
import VideoGenerationPanel from "./VideoGenerationPanel"; // Verify
import ApiKeySettings from "./ApiKeySettings"; // Verify
import GuestBanner from "./GuestBanner"; // Verify
import LoadModal from "./LoadModal"; // Verify
import SceneTemplateSelector from "./SceneTemplateSelector"; // Verify
```

#### 2. Enhance VideoPreview Component

**File**: `src/app/components/VideoPreview.tsx`

**Enhancements Needed**:

- [ ] Add better loading states
- [ ] Add download button (already has based on system reminder)
- [ ] Add share functionality
- [ ] Add fullscreen mode
- [ ] Add playback speed control
- [ ] Add keyboard shortcuts

#### 3. Add Missing Authentication UI

**Current State**: GuestBanner exists, need full auth flow

**Files to Create**:

- `src/app/components/AuthModal.tsx` - Sign in/up modal
- `src/app/components/UserMenu.tsx` - User dropdown menu

**Action Items**:

- [ ] Create sign-in modal
- [ ] Create sign-up modal
- [ ] Add user menu in ActionBar
- [ ] Add logout functionality
- [ ] Integrate with auth provider (NextAuth, Clerk, etc.)

#### 4. Improve Mobile Responsiveness

**Action Items**:

- [ ] Test on mobile devices
- [ ] Fix layout issues on small screens
- [ ] Make drag-and-drop work on touch devices
- [ ] Optimize video preview for mobile
- [ ] Test all modals on mobile

#### 5. Add Accessibility Features

**Action Items**:

- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Add focus indicators
- [ ] Test with screen readers
- [ ] Add skip links
- [ ] Ensure color contrast meets WCAG AA

**Example Improvements**:

```typescript
// CharacterEditor.tsx - Add ARIA labels
<input
  id="character-name"
  type="text"
  value={character.name}
  onChange={(e) => handleInputChange('name', e.target.value)}
  className="w-full px-3 py-2 border rounded-md"
  placeholder="Sarah Chen"
  aria-label="Character name"
  aria-required="true"
  aria-describedby="character-name-hint"
/>
<span id="character-name-hint" className="sr-only">
  Enter the character's full name for identity consistency
</span>
```

#### 6. Add Loading Skeletons

**Files to Create**:

- `src/app/components/Skeletons.tsx` - Loading skeleton components

**Action Items**:

- [ ] Create skeleton for scene cards
- [ ] Create skeleton for video preview
- [ ] Create skeleton for storyboard list
- [ ] Use skeletons during loading states

#### 7. Improve Error States

**Action Items**:

- [ ] Add better error messages
- [ ] Add error recovery suggestions
- [ ] Add retry buttons
- [ ] Add error reporting
- [ ] Test all error scenarios

### Success Criteria

- [ ] All components exist and render
- [ ] Mobile responsive
- [ ] Accessible (WCAG AA)
- [ ] Loading states smooth
- [ ] Error states helpful
- [ ] Keyboard navigation works

---

## Agent 6: Testing & Quality Assurance

**Priority**: 🟡 MEDIUM
**Estimated Time**: 3-4 days
**Dependencies**: Should run after other agents complete their work

### Objective

Create comprehensive test suite covering unit, integration, and E2E tests.

### Context

- Vitest already configured
- Minimal tests exist in `test/soraPrompt.test.ts`
- Need comprehensive coverage

### Tasks

#### 1. Set Up Testing Infrastructure

**Action Items**:

- [ ] Configure Vitest properly
- [ ] Set up test database
- [ ] Configure test coverage reporting
- [ ] Set up CI pipeline for tests
- [ ] Document testing approach

**Update vitest.config.ts**:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "**/*.test.ts", "**/*.test.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./lib"),
    },
  },
});
```

#### 2. Write Unit Tests

**Files to Create**:

- `test/lib/presets.test.ts`
- `test/lib/encryption.test.ts`
- `test/lib/validation.test.ts`
- `test/lib/soraPrompt.test.ts` (enhance existing)
- `test/lib/storage.test.ts`

**Action Items**:

- [ ] Test prompt generation
- [ ] Test encryption/decryption
- [ ] Test validation schemas
- [ ] Test preset utilities
- [ ] Test storage utilities
- [ ] Aim for 80%+ coverage

**Example Tests**:

```typescript
// test/lib/encryption.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { encryptApiKey, decryptApiKey, hashApiKey } from "@/lib/encryption";

describe("encryption", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = Buffer.from("a".repeat(32)).toString("base64");
  });

  it("should encrypt and decrypt API key correctly", async () => {
    const originalKey = "sk-test-key-123456789";
    const encrypted = await encryptApiKey(originalKey);

    expect(encrypted).not.toBe(originalKey);
    expect(encrypted).toBeTruthy();

    const decrypted = await decryptApiKey(encrypted);
    expect(decrypted).toBe(originalKey);
  });

  it("should create consistent hashes", () => {
    const key = "test-key-123";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it("should throw error if encryption key not set", async () => {
    delete process.env.ENCRYPTION_KEY;

    await expect(encryptApiKey("test")).rejects.toThrow("ENCRYPTION_KEY");
  });
});
```

#### 3. Write Integration Tests

**Files to Create**:

- `test/api/video-generate.test.ts`
- `test/api/video-status.test.ts`
- `test/api/auth-session.test.ts`
- `test/repositories/videoJobs.test.ts`

**Action Items**:

- [ ] Test API routes end-to-end
- [ ] Test database operations
- [ ] Test queue operations
- [ ] Mock external APIs
- [ ] Test error scenarios

**Example Integration Test**:

```typescript
// test/api/video-generate.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";

describe("POST /api/video/generate", () => {
  beforeEach(async () => {
    // Clear test database
    await prisma.videoJob.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it("should create video generation job", async () => {
    const response = await fetch("http://localhost:3000/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyboardId: "test-123",
        scene: {
          id: "scene-1",
          subject: "A woman",
          action: "walking",
          duration: 8,
        },
        character: {
          id: "char-1",
          name: "Sarah",
        },
        presetKey: "cinematic",
        provider: "sora",
        model: "sora-2",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.jobId).toBeTruthy();
    expect(data.success).toBe(true);

    // Verify job in database
    const job = await prisma.videoJob.findUnique({
      where: { id: data.jobId },
    });
    expect(job).toBeTruthy();
    expect(job?.status).toBe("pending");
  });

  it("should return 400 for invalid input", async () => {
    const response = await fetch("http://localhost:3000/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });
});
```

#### 4. Write Component Tests

**Files to Create**:

- `test/components/CharacterEditor.test.tsx`
- `test/components/SceneEditor.test.tsx`
- `test/components/VideoPreview.test.tsx`

**Action Items**:

- [ ] Test component rendering
- [ ] Test user interactions
- [ ] Test prop changes
- [ ] Test callbacks
- [ ] Use React Testing Library

**Example Component Test**:

```typescript
// test/components/CharacterEditor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterEditor from "@/app/components/CharacterEditor";

describe("CharacterEditor", () => {
  const mockCharacter = {
    id: "1",
    name: "Sarah",
    age: 28,
  };

  it("should render character name", () => {
    const onChange = vi.fn();
    render(<CharacterEditor character={mockCharacter} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Sarah Chen");
    expect(input).toHaveValue("Sarah");
  });

  it("should call onChange when name changes", () => {
    const onChange = vi.fn();
    render(<CharacterEditor character={mockCharacter} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Sarah Chen");
    fireEvent.change(input, { target: { value: "John" } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "John" })
    );
  });

  it("should generate identity tag when name changes", () => {
    const onChange = vi.fn();
    render(
      <CharacterEditor character={{ id: "1", name: "" }} onChange={onChange} />
    );

    const input = screen.getByPlaceholderText("Sarah Chen");
    fireEvent.change(input, { target: { value: "Sarah Chen" } });

    const calledWith = onChange.mock.calls[0][0];
    expect(calledWith.identity_tag).toMatch(
      /^character:sarah-chen_id:[a-f0-9]{8}$/
    );
  });
});
```

#### 5. Write E2E Tests

**Files to Create**:

- `test/e2e/video-generation-flow.test.ts`
- `test/e2e/storyboard-creation.test.ts`

**Action Items**:

- [ ] Test complete user workflows
- [ ] Test error recovery
- [ ] Test edge cases
- [ ] Use Playwright or Cypress

#### 6. Set Up CI/CD Testing

**Files to Create**:

- `.github/workflows/test.yml` - GitHub Actions workflow

**Action Items**:

- [ ] Run tests on every PR
- [ ] Run tests on push to main
- [ ] Generate coverage reports
- [ ] Fail on coverage below threshold
- [ ] Add status badges

**Example GitHub Action**:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
          ENCRYPTION_KEY: ${{ secrets.TEST_ENCRYPTION_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Success Criteria

- [ ] 80%+ code coverage
- [ ] All critical paths tested
- [ ] CI/CD pipeline working
- [ ] Tests run quickly (<5 min)
- [ ] Tests are reliable (no flaky tests)

---

## Execution Order

**Week 1: Critical Foundation**

1. Agent 1 (Security) - Days 1-3
2. Agent 2 (Database) - Days 1-3 (parallel)
3. Agent 3 (Workers) - Days 3-5

**Week 2: Integration & Enhancement** 4. Agent 4 (APIs) - Days 6-10 (may need mocks) 5. Agent 5 (UI) - Days 6-9 (parallel)

**Week 3: Quality** 6. Agent 6 (Testing) - Days 11-14

---

## Success Metrics

### After Agent 1 (Security)

- ✅ No security vulnerabilities
- ✅ All API routes validated
- ✅ Rate limiting active
- ✅ Environment secure

### After Agent 2 (Database)

- ✅ Data persists across sessions
- ✅ All CRUD operations work
- ✅ Multiple storyboards supported

### After Agent 3 (Workers)

- ✅ Background processing works
- ✅ Jobs complete successfully
- ✅ Retry logic functional

### After Agent 4 (APIs)

- ✅ Real video generation works (or mocks ready)
- ✅ Error handling complete
- ✅ Webhooks implemented (if available)

### After Agent 5 (UI)

- ✅ All components functional
- ✅ Mobile responsive
- ✅ Accessible

### After Agent 6 (Testing)

- ✅ 80%+ coverage
- ✅ CI/CD passing
- ✅ Production ready

---

## Notes

- Each agent prompt is designed to be self-contained
- Agents can work in parallel where dependencies allow
- All prompts include success criteria and testing
- Focus on production-readiness, not just functionality
- Document everything for future maintainers
