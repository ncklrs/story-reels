# Agent 2: Database & Persistence Layer - Implementation Prompt

## Context
You are implementing the database and persistence layer for the Sora Video Generator application. Agent 1 (Security) has been completed, providing:
- Secure session-based API key storage
- Rate limiting on all endpoints
- Input validation with Zod
- Memory leak prevention

The application currently stores all data in localStorage only. Your task is to implement PostgreSQL persistence for production use.

## Current State
- Database schema exists in `database/schema.sql`
- No ORM implemented
- API routes use in-memory/localStorage only
- Session-based auth is working

## Your Mission
Implement complete database persistence using Prisma ORM, create repository pattern for data access, and migrate all API routes to use the database instead of in-memory storage.

---

## Task 1: Set Up Prisma ORM

### Step 1.1: Install Prisma
```bash
npm install prisma @prisma/client
npm install -D prisma
```

### Step 1.2: Initialize Prisma
```bash
npx prisma init
```

### Step 1.3: Create Prisma Schema
Create `prisma/schema.prisma` based on `database/schema.sql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model VideoJob {
  id              String    @id @default(uuid())
  storyboardId    String
  sceneId         String
  provider        String    // 'sora' | 'veo'
  status          String    // 'pending' | 'processing' | 'completed' | 'failed'
  prompt          String    @db.Text
  providerJobId   String?
  videoUrl        String?   @db.Text
  thumbnailUrl    String?   @db.Text
  cost            Decimal?  @db.Decimal(10, 4)
  errorMessage    String?   @db.Text
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  metadata        Json?

  storyboard Storyboard? @relation(fields: [storyboardId], references: [id], onDelete: Cascade)

  @@index([storyboardId])
  @@index([status])
  @@index([createdAt])
  @@map("video_jobs")
}

model UserApiKey {
  id            String    @id @default(uuid())
  userId        String    // Will be session ID for now, or user ID later
  provider      String    // 'sora' | 'veo'
  encryptedKey  String    @db.Text
  keyHash       String    // SHA-256 hash for verification
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime?

  @@unique([userId, provider])
  @@index([userId])
  @@index([keyHash])
  @@map("user_api_keys")
}

model Storyboard {
  id          String   @id @default(uuid())
  userId      String?  // Optional - for guest users
  name        String
  presetKey   String
  character   Json     // CharacterProfile JSON
  scenes      Json     // Scene[] JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  videoJobs VideoJob[]

  @@index([userId])
  @@index([createdAt])
  @@map("storyboards")
}

model CompiledVideo {
  id              String   @id @default(uuid())
  storyboardId    String
  scenesOrder     Json     // Array of scene IDs in order
  finalVideoUrl   String?  @db.Text
  durationSeconds Int?
  fileSizeBytes   BigInt?
  status          String   @default("pending") // 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage    String?  @db.Text
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  metadata        Json?

  @@index([storyboardId])
  @@index([createdAt])
  @@map("compiled_videos")
}
```

### Step 1.4: Generate Prisma Client
```bash
npx prisma generate
```

---

## Task 2: Create Database Connection Utility

### File: `lib/db.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper to safely disconnect
export async function disconnectDB() {
  await prisma.$disconnect();
}

// Health check
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { connected: false, error };
  }
}
```

---

## Task 3: Create Repository Pattern

### File: `lib/repositories/videoJobs.ts`
```typescript
import { prisma } from '../db';
import { VideoJob, Prisma } from '@prisma/client';

export async function createVideoJob(data: {
  storyboardId: string;
  sceneId: string;
  provider: string;
  prompt: string;
  providerJobId?: string;
  cost?: number;
}) {
  return await prisma.videoJob.create({
    data: {
      ...data,
      status: 'pending',
    },
  });
}

export async function getVideoJob(id: string) {
  return await prisma.videoJob.findUnique({
    where: { id },
  });
}

export async function updateVideoJob(
  id: string,
  data: Partial<Omit<VideoJob, 'id' | 'createdAt'>>
) {
  return await prisma.videoJob.update({
    where: { id },
    data,
  });
}

export async function getVideoJobsByStoryboard(storyboardId: string) {
  return await prisma.videoJob.findMany({
    where: { storyboardId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getVideoJobsByStatus(status: string) {
  return await prisma.videoJob.findMany({
    where: { status },
    orderBy: { createdAt: 'asc' },
  });
}

export async function deleteVideoJob(id: string) {
  return await prisma.videoJob.delete({
    where: { id },
  });
}
```

### File: `lib/repositories/storyboards.ts`
```typescript
import { prisma } from '../db';
import { Storyboard, Prisma } from '@prisma/client';
import type { Storyboard as StoryboardType } from '@/lib/types';

export async function createStoryboard(data: {
  userId?: string;
  name: string;
  presetKey: string;
  character: any;
  scenes: any[];
}) {
  return await prisma.storyboard.create({
    data,
  });
}

export async function getStoryboard(id: string) {
  return await prisma.storyboard.findUnique({
    where: { id },
    include: {
      videoJobs: true,
    },
  });
}

export async function updateStoryboard(
  id: string,
  data: Partial<Omit<Storyboard, 'id' | 'createdAt'>>
) {
  return await prisma.storyboard.update({
    where: { id },
    data,
  });
}

export async function getUserStoryboards(userId: string, limit = 50) {
  return await prisma.storyboard.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function deleteStoryboard(id: string) {
  return await prisma.storyboard.delete({
    where: { id },
  });
}

export async function searchStoryboards(query: string, userId?: string) {
  return await prisma.storyboard.findMany({
    where: {
      AND: [
        userId ? { userId } : {},
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
}
```

### File: `lib/repositories/apiKeys.ts`
```typescript
import { prisma } from '../db';
import { hashApiKey } from '../encryption';

export async function storeApiKey(data: {
  userId: string;
  provider: string;
  encryptedKey: string;
}) {
  const keyHash = hashApiKey(data.encryptedKey);

  return await prisma.userApiKey.upsert({
    where: {
      userId_provider: {
        userId: data.userId,
        provider: data.provider,
      },
    },
    update: {
      encryptedKey: data.encryptedKey,
      keyHash,
      lastUsedAt: new Date(),
      isActive: true,
    },
    create: {
      ...data,
      keyHash,
    },
  });
}

export async function getApiKey(userId: string, provider: string) {
  return await prisma.userApiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });
}

export async function updateApiKeyLastUsed(userId: string, provider: string) {
  return await prisma.userApiKey.update({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export async function deactivateApiKey(userId: string, provider: string) {
  return await prisma.userApiKey.update({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    data: {
      isActive: false,
    },
  });
}
```

### File: `lib/repositories/compiledVideos.ts`
```typescript
import { prisma } from '../db';

export async function createCompiledVideo(data: {
  storyboardId: string;
  scenesOrder: string[];
}) {
  return await prisma.compiledVideo.create({
    data: {
      ...data,
      scenesOrder: data.scenesOrder,
      status: 'pending',
    },
  });
}

export async function updateCompiledVideo(
  id: string,
  data: {
    finalVideoUrl?: string;
    durationSeconds?: number;
    fileSizeBytes?: bigint;
    status?: string;
    errorMessage?: string;
    completedAt?: Date;
  }
) {
  return await prisma.compiledVideo.update({
    where: { id },
    data,
  });
}

export async function getCompiledVideo(id: string) {
  return await prisma.compiledVideo.findUnique({
    where: { id },
  });
}
```

---

## Task 4: Update API Routes to Use Database

### Update: `src/app/api/video/generate/route.ts`

Add after line 8:
```typescript
import { createVideoJob } from '@/lib/repositories/videoJobs';
import { getStoryboard, updateStoryboard } from '@/lib/repositories/storyboards';
```

Replace the job creation section (around line 51):
```typescript
// Create job in database instead of in-memory
const videoJob = await createVideoJob({
  storyboardId,
  sceneId: scene.id,
  provider,
  prompt,
  providerJobId: undefined, // Will be set by worker
  cost,
});

// Add to BullMQ queue with database job ID
await addVideoGenerationJob({
  jobId: videoJob.id,
  storyboardId,
  sceneId: scene.id,
  provider,
  prompt,
  apiKey,
  model,
  size: provider === 'sora' ? '1280x720' : undefined,
  resolution: provider === 'veo' ? '720p' : undefined,
  duration: scene.duration,
});

return NextResponse.json(
  {
    success: true,
    jobId: videoJob.id,
    prompt,
    estimatedCost: cost,
    status: 'queued',
  },
  {
    headers: rateLimitHeaders,
  }
);
```

### Update: `src/app/api/video/status/[jobId]/route.ts`

Add after imports:
```typescript
import { getVideoJob, updateVideoJob } from '@/lib/repositories/videoJobs';
```

Replace the route logic:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const awaitedParams = await params;

    // Validate jobId parameter
    const validation = validateRequest(jobIdParamsSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { jobId } = validation.data;

    // Get job from database
    const job = await getVideoJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job status from database
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      progress: job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 10,
      cost: job.cost ? Number(job.cost) : undefined,
      error: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
```

---

## Task 5: Create Storyboard CRUD API Routes

### File: `src/app/api/storyboards/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation';
import { createStoryboard, getUserStoryboards, searchStoryboards } from '@/lib/repositories/storyboards';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

const createStoryboardSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1).max(200),
  presetKey: z.string(),
  character: z.any(),
  scenes: z.array(z.any()),
});

/**
 * GET /api/storyboards
 * List user's storyboards
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('q');

    if (query) {
      const storyboards = await searchStoryboards(query, userId || undefined);
      return NextResponse.json({ storyboards });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter required' },
        { status: 400 }
      );
    }

    const storyboards = await getUserStoryboards(userId);
    return NextResponse.json({ storyboards });

  } catch (error: any) {
    console.error('Get storyboards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get storyboards' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storyboards
 * Create new storyboard
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    const validation = validateRequest(createStoryboardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const storyboard = await createStoryboard(validation.data);

    return NextResponse.json({
      success: true,
      storyboard,
    });

  } catch (error: any) {
    console.error('Create storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create storyboard' },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/storyboards/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation';
import { getStoryboard, updateStoryboard, deleteStoryboard } from '@/lib/repositories/storyboards';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

const storyboardIdSchema = z.object({
  id: z.string().uuid(),
});

const updateStoryboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  presetKey: z.string().optional(),
  character: z.any().optional(),
  scenes: z.array(z.any()).optional(),
});

/**
 * GET /api/storyboards/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const awaitedParams = await params;
    const validation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const storyboard = await getStoryboard(validation.data.id);

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ storyboard });

  } catch (error: any) {
    console.error('Get storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get storyboard' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/storyboards/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const awaitedParams = await params;
    const validation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const body = await request.json();
    const dataValidation = validateRequest(updateStoryboardSchema, body);
    if (!dataValidation.success) {
      return NextResponse.json(
        { error: dataValidation.error },
        { status: 400 }
      );
    }

    const storyboard = await updateStoryboard(
      validation.data.id,
      dataValidation.data
    );

    return NextResponse.json({
      success: true,
      storyboard,
    });

  } catch (error: any) {
    console.error('Update storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update storyboard' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storyboards/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const awaitedParams = await params;
    const validation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    await deleteStoryboard(validation.data.id);

    return NextResponse.json({
      success: true,
      message: 'Storyboard deleted',
    });

  } catch (error: any) {
    console.error('Delete storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete storyboard' },
      { status: 500 }
    );
  }
}
```

---

## Task 6: Run Migrations

### Step 6.1: Create Migration
```bash
npx prisma migrate dev --name init
```

### Step 6.2: Update .env.local
Add database connection:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sora_video_gen_dev"
```

### Step 6.3: Test Database Connection
Create `scripts/test-db.ts`:
```typescript
import { checkDatabaseConnection, prisma } from '../lib/db';

async function main() {
  console.log('Testing database connection...');

  const result = await checkDatabaseConnection();

  if (result.connected) {
    console.log('✅ Database connected successfully!');

    // Test basic operations
    const count = await prisma.storyboard.count();
    console.log(`📊 Storyboards in database: ${count}`);
  } else {
    console.error('❌ Database connection failed:', result.error);
  }

  await prisma.$disconnect();
}

main();
```

Run with:
```bash
npx tsx scripts/test-db.ts
```

---

## Task 7: Update Frontend to Use Database API

### Update: `src/app/components/StoryboardEditor.tsx`

Add save functionality:
```typescript
// Add auto-save effect
useEffect(() => {
  const saveStoryboard = async () => {
    if (!storyboard.id) return;

    try {
      await fetch(`/api/storyboards/${storyboard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storyboard.name || 'Untitled',
          presetKey: storyboard.presetKey,
          character: storyboard.character,
          scenes: storyboard.scenes,
        }),
      });
    } catch (error) {
      console.error('Failed to save storyboard:', error);
    }
  };

  // Debounce save
  const timeoutId = setTimeout(saveStoryboard, 2000);
  return () => clearTimeout(timeoutId);
}, [storyboard]);
```

---

## Success Criteria

✅ **Checklist:**
- [ ] Prisma installed and configured
- [ ] Database schema matches types.ts definitions
- [ ] All repositories created with CRUD operations
- [ ] API routes updated to use database
- [ ] Storyboard CRUD endpoints working
- [ ] Migrations run successfully
- [ ] Database connection tested
- [ ] Frontend auto-save implemented
- [ ] Error handling for all DB operations
- [ ] Build passes without errors

✅ **Testing:**
```bash
# Test database connection
npx tsx scripts/test-db.ts

# Test storyboard creation
curl -X POST http://localhost:3000/api/storyboards \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","presetKey":"cinematic","character":{},"scenes":[]}'

# Test video job creation
# (should now save to database)
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{...}'

# Verify in Prisma Studio
npx prisma studio
```

---

## Files to Create/Modify

**Create:**
- `prisma/schema.prisma`
- `lib/db.ts`
- `lib/repositories/videoJobs.ts`
- `lib/repositories/storyboards.ts`
- `lib/repositories/apiKeys.ts`
- `lib/repositories/compiledVideos.ts`
- `src/app/api/storyboards/route.ts`
- `src/app/api/storyboards/[id]/route.ts`
- `scripts/test-db.ts`

**Modify:**
- `src/app/api/video/generate/route.ts`
- `src/app/api/video/status/[jobId]/route.ts`
- `src/app/components/StoryboardEditor.tsx`
- `package.json` (add prisma scripts)

---

## Important Notes

1. **Development Database**: Set up local PostgreSQL or use a free hosted option (Supabase, Neon)
2. **Migrations**: Always run `npx prisma migrate dev` after schema changes
3. **Type Safety**: Prisma generates types automatically - use them!
4. **Transactions**: Use `prisma.$transaction()` for operations that must succeed/fail together
5. **Performance**: Add indexes for frequently queried fields (already in schema)

## After Completion

When Agent 2 is complete, the application will:
- ✅ Persist all data across sessions
- ✅ Support multiple storyboards per user
- ✅ Track video jobs in database
- ✅ Enable API key storage in database (optional enhancement)
- ✅ Be ready for Agent 3 (Background Workers) which will read/write from DB
